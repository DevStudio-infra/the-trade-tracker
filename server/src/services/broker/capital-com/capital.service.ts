import axios, { AxiosInstance, AxiosHeaders } from "axios";
import WebSocket from "ws";
import { createLogger } from "../../../utils/logger";
import { RateLimiter } from "../../../utils/rate-limiter";
import { IBroker, IBrokerCredentials } from "../interfaces/broker.interface";
import { MarketData, Order, Position, AccountBalance, Candle, OrderParameters, OrderType, OrderStatus } from "../interfaces/types";

interface CapitalConfig extends IBrokerCredentials {
  baseUrl?: string;
  timeout?: number;
  isDemo?: boolean;
}

export class CapitalService implements IBroker {
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
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
  private readonly logger = createLogger("capital-service");

  // Rate limiters based on Capital.com API limits
  private readonly globalLimiter = new RateLimiter(10, 1000); // 10 requests per second
  private readonly orderLimiter = new RateLimiter(1, 100); // 1 request per 0.1 seconds for orders
  private readonly sessionLimiter = new RateLimiter(1, 1000); // 1 request per second for session

  constructor(private readonly config: CapitalConfig) {
    this.apiKey = this.config.apiKey;
    this.apiSecret = this.config.apiSecret;
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

    // Add rate limiting interceptor
    this.client.interceptors.request.use(async (config) => {
      await this.globalLimiter.acquire();
      if (config.url?.includes("/positions") || config.url?.includes("/orders")) {
        await this.orderLimiter.acquire();
      }
      if (config.url?.includes("/session")) {
        await this.sessionLimiter.acquire();
      }
      return config;
    });

    // Add error handling interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          this.handleError("Rate limit exceeded", error);
          throw new Error("Too many requests");
        }
        if (error.response?.data?.errorCode) {
          this.handleError(error.response.data.message, error);
          throw new Error(error.response.data.message);
        }
        throw error;
      }
    );
  }

  async connect(credentials: IBrokerCredentials): Promise<void> {
    try {
      const response = await this.client.post("/api/v1/session", credentials);
      this.sessionToken = response.data.token;
      if (this.sessionToken) {
        this.client.defaults.headers["X-SECURITY-TOKEN"] = this.sessionToken;
      }

      await this.setupWebSocket();
      this.connected = true;
      this.logger.info("Connected to Capital.com API");
    } catch (error: any) {
      // Handle rate limiting
      if (error.response?.status === 429) {
        // Wait for a second and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.connect(credentials);
      }
      this.handleError("Connection failed", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.clearPingInterval();
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = undefined;
      }
      if (this.ws) {
        // Send close frame and wait for server to acknowledge
        this.ws.close();
        await new Promise<void>((resolve) => {
          if (!this.ws) {
            resolve();
            return;
          }
          this.ws.once("close", () => {
            resolve();
          });
          // Force close after 1 second if server doesn't respond
          setTimeout(() => {
            if (this.ws) {
              this.ws.terminate();
              resolve();
            }
          }, 1000).unref();
        });
        this.ws = undefined;
      }
      this.connected = false;
      this.sessionToken = undefined;
      this.logger.info("Disconnected from Capital.com API");
    } catch (error) {
      this.handleError("Disconnect failed", error);
      throw error;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.client.get("/session");
      return true;
    } catch (error) {
      this.handleError("Credential validation failed", error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const response = await this.client.get(`/api/v1/prices/${symbol}`);
      return response.data;
    } catch (error) {
      this.handleError("Failed to get market data", error);
      throw error;
    }
  }

  async getCandles(symbol: string, timeframe: string, limit = 200): Promise<Candle[]> {
    try {
      const response = await this.client.get(`/api/v1/candles/${symbol}`, {
        params: {
          resolution: this.mapTimeframeToResolution(timeframe),
          limit,
        },
      });
      return response.data.candles;
    } catch (error) {
      this.handleError("Failed to get candles", error);
      throw error;
    }
  }

  private mapTimeframeToResolution(timeframe: string): string {
    const map: { [key: string]: string } = {
      "1m": "1",
      "5m": "5",
      "15m": "15",
      "30m": "30",
      "1h": "60",
      "4h": "240",
      "1d": "1440",
    };
    return map[timeframe] || "60";
  }

  private getTimeframeInMs(timeframe: string): number {
    const map: { [key: string]: number } = {
      "1m": 60000,
      "5m": 300000,
      "15m": 900000,
      "30m": 1800000,
      "1h": 3600000,
      "4h": 14400000,
      "1d": 86400000,
    };
    return map[timeframe] || 3600000;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  private handleError(message: string, error: unknown): void {
    this.lastError = error instanceof Error ? error : new Error(String(error));
    this.logger.error({
      message,
      error: this.lastError.message,
      stack: this.lastError.stack,
    });
  }

  private async setupWebSocket(): Promise<void> {
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

    const callbacks = this.marketDataCallbacks.get(data.epic);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(marketData);
        } catch (error) {
          this.handleError("Error in market data callback", error);
        }
      });
    }
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    if (!this.marketDataCallbacks.has(symbol)) {
      this.marketDataCallbacks.set(symbol, new Set());
      this.ws.send(
        JSON.stringify({
          action: "subscribe",
          epic: symbol,
        })
      );
    }

    this.marketDataCallbacks.get(symbol)?.add(callback);
  }

  async unsubscribeFromMarketData(symbol: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.marketDataCallbacks.delete(symbol);
    this.ws.send(
      JSON.stringify({
        action: "unsubscribe",
        epic: symbol,
      })
    );
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
}
