import axios, { AxiosInstance, AxiosHeaders, AxiosError, InternalAxiosRequestConfig } from "axios";
import WebSocket from "ws";
import { EventEmitter } from "events";
import { createLogger } from "../../../utils/logger";
import { RateLimiter } from "../../../utils/rate-limiter";
import { IBroker, IBrokerCredentials } from "../interfaces/broker.interface";
import { MarketData, Order, Position, AccountBalance, Candle, OrderParameters, OrderType, OrderStatus } from "../interfaces/types";
import { MarketDataStreamService } from "./market-data-stream.service";
import { MarketDataCacheService } from "./market-data-cache.service";
import { CapitalRateLimiter } from "./rate-limiter.service";

// Extend InternalAxiosRequestConfig to include retry count
interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

interface CapitalConfig {
  apiKey: string;
  identifier: string;
  password: string;
  isDemo?: boolean;
  baseUrl?: string;
  timeout?: number;
}

const logger = createLogger("capital-service");

export class CapitalService extends EventEmitter implements IBroker {
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly apiKey: string;
  private readonly identifier: string;
  private readonly password: string;
  private readonly isDemo: boolean;
  private sessionToken?: string;
  private client: AxiosInstance;
  private ws?: WebSocket;
  private wsReconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000; // Start with 1 second
  private marketDataCallbacks: Map<string, Set<(data: MarketData) => void>> = new Map();
  private connected = false;
  private lastError: Error | null = null;
  private pingInterval?: NodeJS.Timeout;
  private reconnectTimeout?: NodeJS.Timeout;
  private readonly marketDataStream: MarketDataStreamService;
  private readonly marketDataCache: MarketDataCacheService;
  private readonly rateLimiter: CapitalRateLimiter;
  private readonly logger = createLogger("capital-service");

  // Rate limiters based on Capital.com API limits
  private readonly globalLimiter = new RateLimiter(10, 1000); // 10 requests per second
  private readonly orderLimiter = new RateLimiter(1, 100); // 1 request per 0.1 seconds for orders
  private readonly sessionLimiter = new RateLimiter(1, 1000); // 1 request per second for session

  constructor(private readonly config: CapitalConfig) {
    super();
    this.apiKey = this.config.apiKey;
    this.identifier = this.config.identifier;
    this.password = this.config.password;
    this.isDemo = this.config.isDemo || false;
    this.baseUrl = this.isDemo ? "https://demo-api-capital.backend-capital.com/api/v1" : "https://api-capital.backend-capital.com/api/v1";
    this.wsUrl = this.isDemo ? "wss://demo-streaming.capital.com/connect" : "wss://streaming.capital.com/connect";

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Add request interceptor for session token
    this.client.interceptors.request.use((config) => {
      if (this.sessionToken) {
        config.headers = config.headers || {};
        config.headers["X-SECURITY-TOKEN"] = this.sessionToken;
      }
      return config;
    });

    this.rateLimiter = new CapitalRateLimiter();

    // Add rate limiting interceptor
    this.client.interceptors.request.use(async (config) => {
      try {
        // Apply appropriate rate limit based on endpoint
        if (config.url?.includes("/market-data") || config.url?.includes("/prices")) {
          await this.rateLimiter.checkRateLimit("market_data");
        } else if (config.url?.includes("/positions") || config.url?.includes("/orders")) {
          await this.rateLimiter.checkRateLimit("trading");
        } else if (config.url?.includes("/account")) {
          await this.rateLimiter.checkRateLimit("account");
        }
        await this.rateLimiter.checkRateLimit("global");
      } catch (error) {
        this.handleError("Rate limit check failed", error);
        throw error;
      }
      return config;
    });

    // Add error handling interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetryConfig;
        if (!config) throw error;

        // Handle rate limit errors
        if (error.response?.status === 429) {
          this.logger.warn("Rate limit exceeded, retrying with backoff...");
          const retryAfter = parseInt(error.response.headers["retry-after"] || "1", 10);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          return this.client(config);
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          this.logger.warn("Authentication failed, attempting to refresh session...");
          try {
            await this.refreshSession();
            return this.client(config);
          } catch (refreshError) {
            this.handleError("Session refresh failed", refreshError);
            throw error;
          }
        }

        // Handle server errors with retry
        if (error.response?.status && error.response.status >= 500) {
          config.__retryCount = (config.__retryCount || 0) + 1;
          if (config.__retryCount <= 3) {
            this.logger.warn(`Server error, retry attempt ${config.__retryCount}/3`);
            const delay = Math.pow(2, Math.max(0, config.__retryCount)) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.client(config);
          }
        }

        throw error;
      }
    );

    // Initialize services
    this.marketDataStream = new MarketDataStreamService();
    this.marketDataCache = new MarketDataCacheService();

    // Forward market data events
    this.marketDataStream.on("marketData", (data: MarketData) => {
      const callbacks = this.marketDataCallbacks.get(data.symbol);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            this.handleError("Error in market data callback", error);
          }
        });
      }
    });

    this.marketDataStream.on("candle", ({ symbol, timeframe, candle }) => {
      this.emit("candle", symbol, timeframe, candle);
    });
  }

  private setupWebSocket(): void {
    if (!this.sessionToken) {
      throw new Error("No session token available");
    }

    this.ws = new WebSocket(this.wsUrl);
    (this.ws as any)._socket?.unref(); // Unref the underlying socket

    this.ws.on("open", () => {
      this.logger.info("WebSocket connected");
      this.authenticate();
      this.setupPingInterval();
      this.wsReconnectAttempts = 0;
      this.connected = true;
      this.emit("connected");
    });

    this.ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        this.handleError("Failed to parse WebSocket message", error);
      }
    });

    this.ws.on("close", () => {
      this.logger.warn("WebSocket disconnected");
      this.clearPingInterval();
      this.handleReconnect();
      this.connected = false;
      this.emit("disconnected");
    });

    this.ws.on("error", (error) => {
      this.handleError("WebSocket error", error);
      this.ws?.terminate();
    });
  }

  private authenticate(): void {
    if (!this.ws || !this.sessionToken) return;

    this.ws.send(
      JSON.stringify({
        action: "auth",
        token: this.sessionToken,
      })
    );
  }

  private setupPingInterval(): void {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "ping" }));
      }
    }, 30000);
    this.pingInterval.unref(); // Unref the interval
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private handleReconnect(): void {
    if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000);
    this.wsReconnectAttempts++;

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.setupWebSocket();
        await this.resubscribeToMarketData();
      } catch (error) {
        this.handleError("Reconnection failed", error);
      }
    }, delay);
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case "PRICE_UPDATE":
        this.handlePriceUpdate(message.data);
        break;
      case "PONG":
        // Handle pong response if needed
        break;
      default:
        this.logger.debug("Unhandled WebSocket message type:", message.type);
    }
  }

  private handlePriceUpdate(data: any): void {
    const marketData: MarketData = {
      symbol: data.epic,
      bid: data.bid,
      ask: data.offer,
      timestamp: Date.now(),
      volume: data.volume,
    };

    // Forward to market data stream for buffering and aggregation
    this.marketDataStream.handleMarketDataUpdate(marketData);
  }

  private async resubscribeToMarketData(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const symbol of this.marketDataCallbacks.keys()) {
      try {
        this.ws.send(
          JSON.stringify({
            action: "subscribe",
            epic: symbol,
          })
        );
      } catch (error) {
        this.handleError("Failed to resubscribe to market data", error);
      }
    }
  }

  async subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): Promise<void> {
    if (!this.ws || !this.isConnected()) {
      throw new Error("WebSocket not connected");
    }

    this.ws.send(
      JSON.stringify({
        type: "SUBSCRIBE",
        symbol,
      })
    );

    this.on("marketData", (data: MarketData) => {
      if (data.symbol === symbol) {
        callback(data);
      }
    });
  }

  async unsubscribeFromMarketData(symbol: string, timeframe?: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.marketDataCallbacks.delete(symbol);
    this.ws.send(
      JSON.stringify({
        action: "unsubscribe",
        epic: symbol,
      })
    );

    // If timeframe is specified, remove candle aggregation
    if (timeframe) {
      this.marketDataStream.unsubscribe(symbol, timeframe);
    }
  }

  async getBalance(): Promise<AccountBalance> {
    try {
      const response = await this.client.get("/accounts");
      const account = response.data.accounts[0];

      return {
        total: account.balance,
        available: account.available,
        locked: account.margin,
        unrealizedPnL: account.profitLoss,
        currency: account.currency,
      };
    } catch (error) {
      this.handleError("Failed to get balance", error);
      throw error;
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const response = await this.client.get("/positions");

      return response.data.positions.map((pos: any) => ({
        id: pos.position.dealId,
        symbol: pos.position.epic,
        side: pos.position.direction === "BUY" ? "LONG" : "SHORT",
        entryPrice: pos.position.openLevel,
        currentPrice: pos.position.currentLevel,
        quantity: pos.position.dealSize,
        unrealizedPnL: pos.position.profit,
        realizedPnL: 0,
        leverage: pos.position.leverage || 1,
        createdAt: new Date(pos.position.createdDate),
        updatedAt: new Date(),
      }));
    } catch (error) {
      this.handleError("Failed to get positions", error);
      throw error;
    }
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const positions = await this.getPositions();
      return positions.find((pos) => pos.symbol === symbol) || null;
    } catch (error) {
      this.handleError("Failed to get position", error);
      throw error;
    }
  }

  async getOrders(symbol?: string): Promise<Order[]> {
    try {
      const response = await this.client.get("/workingorders");
      const orders = response.data.workingOrders;

      return orders
        .filter((order: any) => !symbol || order.epic === symbol)
        .map((order: any) => ({
          id: order.dealId,
          symbol: order.epic,
          type: this.mapOrderType(order.type),
          side: order.direction === "BUY" ? "BUY" : "SELL",
          quantity: order.size,
          price: order.level,
          stopPrice: order.stopLevel,
          status: this.mapOrderStatus(order.status),
          filledQuantity: 0,
          createdAt: new Date(order.createdDate),
          updatedAt: new Date(),
        }));
    } catch (error) {
      this.handleError("Failed to get orders", error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.client.get(`/confirms/${orderId}`);
      const order = response.data;

      return {
        id: order.dealId,
        symbol: order.epic,
        type: this.mapOrderType(order.dealStatus),
        side: order.direction === "BUY" ? "BUY" : "SELL",
        quantity: order.dealSize,
        price: order.level,
        stopPrice: order.stopLevel,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.status === "ACCEPTED" ? order.dealSize : 0,
        createdAt: new Date(order.createdDate),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.handleError("Failed to get order", error);
      return null;
    }
  }

  async createOrder(parameters: OrderParameters): Promise<Order> {
    try {
      const orderRequest = {
        epic: parameters.symbol,
        expiry: "-",
        direction: parameters.side,
        size: parameters.quantity,
        level: parameters.price,
        type: this.mapOrderTypeReverse(parameters.type),
        guaranteedStop: false,
        stopLevel: parameters.stopPrice,
        timeInForce: parameters.timeInForce || "GTC",
      };

      const response = await this.client.post("/positions", orderRequest);
      const dealRef = response.data.dealReference;

      // Get the created order details
      const confirmResponse = await this.client.get(`/confirms/${dealRef}`);
      const order = confirmResponse.data;

      return {
        id: order.dealId,
        symbol: parameters.symbol,
        type: parameters.type,
        side: parameters.side,
        quantity: parameters.quantity,
        price: parameters.price,
        stopPrice: parameters.stopPrice,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.status === "ACCEPTED" ? parameters.quantity : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.handleError("Failed to create order", error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.client.delete(`/workingorders/${orderId}`);
      return true;
    } catch (error) {
      this.handleError("Failed to cancel order", error);
      return false;
    }
  }

  async modifyOrder(orderId: string, parameters: Partial<OrderParameters>): Promise<Order> {
    try {
      const currentOrder = await this.getOrder(orderId);
      if (!currentOrder) {
        throw new Error("Order not found");
      }

      const orderRequest = {
        epic: parameters.symbol || currentOrder.symbol,
        expiry: "-",
        direction: parameters.side || currentOrder.side,
        size: parameters.quantity || currentOrder.quantity,
        level: parameters.price || currentOrder.price,
        type: this.mapOrderTypeReverse(parameters.type || currentOrder.type),
        guaranteedStop: false,
        stopLevel: parameters.stopPrice || currentOrder.stopPrice,
      };

      await this.client.put(`/workingorders/${orderId}`, orderRequest);
      const updatedOrder = await this.getOrder(orderId);

      if (!updatedOrder) {
        throw new Error("Failed to get updated order");
      }

      return updatedOrder;
    } catch (error) {
      this.handleError("Failed to modify order", error);
      throw error;
    }
  }

  async closePosition(symbol: string): Promise<boolean> {
    try {
      const position = await this.getPosition(symbol);
      if (!position) {
        return false;
      }

      await this.client.post("/positions/otc", {
        epic: symbol,
        expiry: "-",
        direction: position.side === "LONG" ? "SELL" : "BUY",
        size: position.quantity,
        orderType: "MARKET",
      });

      return true;
    } catch (error) {
      this.handleError("Failed to close position", error);
      return false;
    }
  }

  async closeAllPositions(): Promise<boolean> {
    try {
      const positions = await this.getPositions();
      const results = await Promise.all(positions.map((pos) => this.closePosition(pos.symbol)));
      return results.every((result) => result);
    } catch (error) {
      this.handleError("Failed to close all positions", error);
      return false;
    }
  }

  async getMinQuantity(symbol: string): Promise<number> {
    try {
      const response = await this.client.get(`/markets/${symbol}`);
      return response.data.minDealSize;
    } catch (error) {
      this.handleError("Failed to get minimum quantity", error);
      throw error;
    }
  }

  async getMaxLeverage(symbol: string): Promise<number> {
    try {
      const response = await this.client.get(`/markets/${symbol}`);
      return response.data.maxLeverage;
    } catch (error) {
      this.handleError("Failed to get maximum leverage", error);
      throw error;
    }
  }

  private mapOrderType(type: string): OrderType {
    const map: Record<string, OrderType> = {
      MARKET: "MARKET",
      LIMIT: "LIMIT",
      STOP: "STOP",
      STOP_LIMIT: "STOP_LIMIT",
    };
    return map[type] || "MARKET";
  }

  private mapOrderTypeReverse(type: OrderType): string {
    const map: Record<OrderType, string> = {
      MARKET: "MARKET",
      LIMIT: "LIMIT",
      STOP: "STOP",
      STOP_LIMIT: "STOP_LIMIT",
    };
    return map[type];
  }

  private mapOrderStatus(status: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      WORKING: "PENDING",
      ACCEPTED: "OPEN",
      REJECTED: "REJECTED",
      CANCELLED: "CANCELED",
    };
    return map[status] || "PENDING";
  }

  /**
   * Get historical candles with caching
   */
  public async getHistoricalCandles(symbol: string, timeframe: string, startTime: number, endTime: number): Promise<Candle[]> {
    try {
      // Try to get from cache first
      const cachedCandles = await this.marketDataCache.getCachedCandles(symbol, timeframe, startTime, endTime);
      if (cachedCandles) {
        this.logger.debug(`Retrieved ${cachedCandles.length} candles from cache for ${symbol}:${timeframe}`);
        return cachedCandles;
      }

      // If not in cache, fetch from API
      const candles = await this.fetchHistoricalCandles(symbol, timeframe, startTime, endTime);

      // Cache the results
      await this.marketDataCache.cacheCandles(symbol, timeframe, startTime, endTime, candles);

      return candles;
    } catch (error) {
      this.logger.error("Error getting historical candles:", error);
      throw error;
    }
  }

  /**
   * Fetch historical candles from API
   */
  private async fetchHistoricalCandles(symbol: string, timeframe: string, startTime: number, endTime: number): Promise<Candle[]> {
    try {
      const response = await this.client.get(`/api/v1/market-data/${symbol}/candles`, {
        params: {
          timeframe,
          from: startTime,
          to: endTime,
        },
      });

      return response.data.candles.map((candle: any) => ({
        timestamp: new Date(candle.timestamp).getTime(),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
      }));
    } catch (error) {
      this.logger.error("Error fetching historical candles:", error);
      throw error;
    }
  }

  /**
   * Refresh session token
   */
  private async refreshSession(): Promise<void> {
    try {
      const response = await this.client.post("/session", {
        apiKey: this.apiKey,
        identifier: this.identifier,
        password: this.password,
      });
      this.sessionToken = response.data.token;
      if (this.sessionToken) {
        this.client.defaults.headers["X-SECURITY-TOKEN"] = this.sessionToken;
      }
    } catch (error) {
      this.handleError("Failed to refresh session", error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    // ... existing cleanup code ...

    await this.marketDataStream.destroy();
    await this.marketDataCache.destroy();
    this.rateLimiter.destroy();
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleError(message: string, error: unknown): void {
    this.lastError = error instanceof Error ? error : new Error(String(error));

    // Log different error types appropriately
    if (axios.isAxiosError(error)) {
      this.logger.error({
        message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    } else if (error instanceof Error && "type" in error) {
      // Handle WebSocket errors
      this.logger.error({
        message,
        type: (error as { type?: string }).type,
        error: error.message,
      });
    } else {
      this.logger.error({
        message,
        error: this.lastError.message,
        stack: this.lastError.stack,
      });
    }

    // Emit error event for monitoring
    this.emit("error", {
      message,
      error: this.lastError,
      timestamp: new Date(),
    });
  }

  /**
   * Connect to the Capital.com API and establish WebSocket connection
   */
  public async connect(): Promise<void> {
    try {
      await this.refreshSession();
      this.setupWebSocket();
    } catch (error) {
      this.handleError("Failed to connect", error);
      throw error;
    }
  }

  /**
   * Disconnect from the Capital.com API and close WebSocket connection
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.ws) {
        this.ws.close();
        this.ws = undefined;
      }
      this.clearPingInterval();
      this.connected = false;
      this.sessionToken = undefined;
    } catch (error) {
      this.handleError("Failed to disconnect", error);
      throw error;
    }
  }

  /**
   * Validate the provided credentials
   */
  public async validateCredentials(): Promise<boolean> {
    try {
      await this.refreshSession();
      return true;
    } catch (error) {
      this.handleError("Failed to validate credentials", error);
      return false;
    }
  }

  /**
   * Get market data for a symbol
   */
  public async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const response = await this.client.get(`/prices/${symbol}`);
      return {
        symbol,
        bid: response.data.bid,
        ask: response.data.ask,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      this.handleError(`Failed to get market data for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * Get candles for a symbol
   */
  public async getCandles(symbol: string, timeframe: string, limit: number): Promise<Candle[]> {
    try {
      const response = await this.client.get(`/prices/${symbol}/candles/${timeframe}`, {
        params: { limit },
      });
      return response.data.candles;
    } catch (error) {
      this.handleError(`Failed to get candles for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * Get the last error that occurred
   */
  public getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Authenticate with Capital.com and set up WebSocket after sessionToken is obtained
   */
  public async authenticate(): Promise<void> {
    try {
      // Example login request: adjust endpoint/fields as needed
      const response = await this.client.post("/session", {
        identifier: this.identifier,
        password: this.password,
      }, {
        headers: {
          "X-CAP-API-KEY": this.apiKey,
        },
      });
      this.sessionToken = response.data?.token || response.data?.securityToken || response.headers["x-security-token"];
      if (!this.sessionToken) {
        throw new Error("Authentication failed: No session token returned");
      }
      // Now safe to connect WebSocket
      this.setupWebSocket();
    } catch (error) {
      this.handleError("Failed to authenticate with Capital.com", error);
      throw error;
    }
  }
}
