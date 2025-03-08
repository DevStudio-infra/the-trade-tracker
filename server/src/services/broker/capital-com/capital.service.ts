import axios, { AxiosInstance } from "axios";
import WebSocket from "ws";
import { createLogger } from "../../../utils/logger";
import { RateLimiter } from "../../../utils/rate-limiter";
import { IBroker, IBrokerCredentials } from "../interfaces/broker.interface";
import { MarketData, Order, Position, AccountBalance, Candle, OrderParameters, OrderType, OrderStatus } from "../interfaces/types";

const logger = createLogger("capital-service");

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

  // Rate limiters based on Capital.com API limits
  private readonly globalLimiter = new RateLimiter(10, 1000); // 10 requests per second
  private readonly orderLimiter = new RateLimiter(1, 100); // 1 request per 0.1 seconds for orders
  private readonly sessionLimiter = new RateLimiter(1, 1000); // 1 request per second for session

  constructor(credentials: IBrokerCredentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.isDemo = credentials.isDemo || false;
    this.baseUrl = this.isDemo ? "https://demo-api-capital.backend-capital.com" : "https://api-capital.backend-capital.com";
    this.wsUrl = this.isDemo ? "wss://demo-streaming.capital.com" : "wss://streaming.capital.com";

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "X-CAP-API-KEY": this.apiKey,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleError("API request failed", error);
        throw error;
      }
    );
  }

  async connect(credentials: IBrokerCredentials): Promise<void> {
    try {
      await this.sessionLimiter.acquire();
      const response = await this.client.post("/api/v1/session", {
        identifier: this.apiKey,
        password: this.apiSecret,
      });

      this.sessionToken = response.data.token;
      this.connected = true;

      // Initialize WebSocket connection
      await this.setupWebSocket();

      logger.info("Connected to Capital.com API");
    } catch (error) {
      this.handleError("Connection failed", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.clearPingInterval();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.ws) {
      this.ws.terminate();
      this.ws = undefined;
    }

    this.sessionToken = undefined;
    this.marketDataCallbacks.clear();
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.connect({ apiKey: this.apiKey, apiSecret: this.apiSecret, isDemo: this.isDemo });
      await this.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      await this.globalLimiter.acquire();
      const response = await this.client.get(`/api/v1/prices/${symbol}`);

      return {
        symbol,
        bid: response.data.prices[0].bid,
        ask: response.data.prices[0].offer,
        timestamp: new Date(response.data.prices[0].snapshotTime).getTime(),
        volume: response.data.prices[0].lastTradedVolume,
      };
    } catch (error) {
      this.handleError("Failed to get market data", error);
      throw error;
    }
  }

  async getCandles(symbol: string, timeframe: string, limit = 200): Promise<Candle[]> {
    try {
      await this.globalLimiter.acquire();
      const resolution = this.mapTimeframeToResolution(timeframe);
      const response = await this.client.get(`/api/v1/prices/${symbol}/history`, {
        params: {
          resolution,
          limit,
          from: new Date(Date.now() - limit * this.getTimeframeInMs(timeframe)).toISOString(),
          to: new Date().toISOString(),
        },
      });

      return response.data.prices.map((price: any) => ({
        timestamp: new Date(price.snapshotTime).getTime(),
        open: price.openPrice,
        high: price.highPrice,
        low: price.lowPrice,
        close: price.closePrice,
        volume: price.lastTradedVolume,
      }));
    } catch (error) {
      this.handleError("Failed to get candles", error);
      throw error;
    }
  }

  private mapTimeframeToResolution(timeframe: string): string {
    const map: Record<string, string> = {
      "1m": "MINUTE",
      "5m": "MINUTE_5",
      "15m": "MINUTE_15",
      "30m": "MINUTE_30",
      "1h": "HOUR",
      "4h": "HOUR_4",
      "1d": "DAY",
    };
    return map[timeframe] || "HOUR";
  }

  private getTimeframeInMs(timeframe: string): number {
    const map: Record<string, number> = {
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
    logger.error({
      message,
      error: this.lastError.message,
      stack: this.lastError.stack,
    });
  }

  private async setupWebSocket(): Promise<void> {
    if (this.ws) {
      this.ws.terminate();
    }

    this.ws = new WebSocket(this.wsUrl);

    this.ws.on("open", () => {
      logger.info("WebSocket connected");
      this.wsReconnectAttempts = 0;
      this.setupPingInterval();
      this.authenticate();
    });

    this.ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        this.handleError("Error parsing WebSocket message", error);
      }
    });

    this.ws.on("close", () => {
      logger.warn("WebSocket connection closed");
      this.clearPingInterval();
      this.handleReconnect();
    });

    this.ws.on("error", (error) => {
      this.handleError("WebSocket error", error);
      this.handleReconnect();
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
    }, 30000); // Send ping every 30 seconds
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private handleReconnect(): void {
    if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Max reconnection attempts reached");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.wsReconnectAttempts);
    this.wsReconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      logger.info(`Attempting to reconnect (${this.wsReconnectAttempts}/${this.maxReconnectAttempts})`);
      this.setupWebSocket();
    }, delay);
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case "PRICE_UPDATE":
        this.handlePriceUpdate(message.data);
        break;
      case "AUTH_SUCCESS":
        logger.info("WebSocket authentication successful");
        this.resubscribeToMarketData();
        break;
      case "AUTH_FAILED":
        logger.error("WebSocket authentication failed");
        break;
      case "pong":
        // Handle ping response
        break;
      default:
        logger.debug("Unhandled WebSocket message type:", message.type);
    }
  }

  private handlePriceUpdate(data: any): void {
    const marketData: MarketData = {
      symbol: data.epic,
      bid: parseFloat(data.bid),
      ask: parseFloat(data.offer),
      timestamp: Date.now(),
      volume: data.volume ? parseFloat(data.volume) : undefined,
    };

    const callbacks = this.marketDataCallbacks.get(marketData.symbol);
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

    const symbols = Array.from(this.marketDataCallbacks.keys());
    for (const symbol of symbols) {
      this.ws.send(
        JSON.stringify({
          action: "subscribe",
          epic: symbol,
        })
      );
    }
  }

  // Override the existing market data subscription methods
  async subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): Promise<void> {
    if (!this.marketDataCallbacks.has(symbol)) {
      this.marketDataCallbacks.set(symbol, new Set());
    }
    this.marketDataCallbacks.get(symbol)?.add(callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          action: "subscribe",
          epic: symbol,
        })
      );
    }
  }

  async unsubscribeFromMarketData(symbol: string): Promise<void> {
    this.marketDataCallbacks.delete(symbol);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          action: "unsubscribe",
          epic: symbol,
        })
      );
    }
  }

  // Trading methods to be implemented next
  async getBalance(): Promise<AccountBalance> {
    try {
      await this.globalLimiter.acquire();
      const response = await this.client.get("/api/v1/accounts");
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
      await this.globalLimiter.acquire();
      const response = await this.client.get("/api/v1/positions");

      return response.data.positions.map((pos: any) => ({
        id: pos.dealId,
        symbol: pos.epic,
        side: pos.direction === "BUY" ? "LONG" : "SHORT",
        entryPrice: pos.openLevel,
        currentPrice: pos.level,
        quantity: pos.size,
        unrealizedPnL: pos.profitLoss,
        realizedPnL: 0, // Not provided by Capital.com API
        leverage: pos.leverage,
        liquidationPrice: pos.stopLevel,
        createdAt: new Date(pos.createdDate),
        updatedAt: new Date(pos.lastUpdated),
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
      await this.globalLimiter.acquire();
      const response = await this.client.get("/api/v1/workingorders");
      let orders = response.data.workingOrders;

      if (symbol) {
        orders = orders.filter((order: any) => order.epic === symbol);
      }

      return orders.map((order: any) => ({
        id: order.dealId,
        symbol: order.epic,
        type: this.mapOrderType(order.type),
        side: order.direction,
        quantity: order.size,
        price: order.level,
        stopPrice: order.stopLevel,
        timeInForce: "GTC",
        status: this.mapOrderStatus(order.status),
        filledQuantity: 0,
        createdAt: new Date(order.createdDate),
        updatedAt: new Date(order.lastUpdated),
      }));
    } catch (error) {
      this.handleError("Failed to get orders", error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      await this.globalLimiter.acquire();
      const response = await this.client.get(`/api/v1/workingorders/${orderId}`);
      const order = response.data;

      return {
        id: order.dealId,
        symbol: order.epic,
        type: this.mapOrderType(order.type),
        side: order.direction,
        quantity: order.size,
        price: order.level,
        stopPrice: order.stopLevel,
        timeInForce: "GTC",
        status: this.mapOrderStatus(order.status),
        filledQuantity: 0,
        createdAt: new Date(order.createdDate),
        updatedAt: new Date(order.lastUpdated),
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.handleError("Failed to get order", error);
      throw error;
    }
  }

  async createOrder(parameters: OrderParameters): Promise<Order> {
    try {
      await this.orderLimiter.acquire();
      const payload = {
        epic: parameters.symbol,
        expiry: "-",
        direction: parameters.side,
        size: parameters.quantity,
        level: parameters.price,
        type: this.mapOrderTypeReverse(parameters.type),
        timeInForce: parameters.timeInForce || "GTC",
        leverage: parameters.leverage,
        stopLevel: parameters.stopPrice,
      };

      const response = await this.client.post("/api/v1/workingorders", payload);
      const order = response.data;

      return {
        id: order.dealId,
        symbol: parameters.symbol,
        type: parameters.type,
        side: parameters.side,
        quantity: parameters.quantity,
        price: parameters.price,
        stopPrice: parameters.stopPrice,
        timeInForce: parameters.timeInForce || "GTC",
        status: "PENDING",
        filledQuantity: 0,
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
      await this.orderLimiter.acquire();
      await this.client.delete(`/api/v1/workingorders/${orderId}`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      this.handleError("Failed to cancel order", error);
      throw error;
    }
  }

  async modifyOrder(orderId: string, parameters: Partial<OrderParameters>): Promise<Order> {
    try {
      await this.orderLimiter.acquire();
      const currentOrder = await this.getOrder(orderId);
      if (!currentOrder) {
        throw new Error("Order not found");
      }

      const payload = {
        level: parameters.price || currentOrder.price,
        stopLevel: parameters.stopPrice || currentOrder.stopPrice,
        size: parameters.quantity || currentOrder.quantity,
      };

      const response = await this.client.put(`/api/v1/workingorders/${orderId}`, payload);
      const order = response.data;

      return {
        ...currentOrder,
        price: payload.level,
        stopPrice: payload.stopLevel,
        quantity: payload.size,
        updatedAt: new Date(),
      };
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

      await this.orderLimiter.acquire();
      await this.client.post("/api/v1/positions/close", {
        dealId: position.id,
      });

      return true;
    } catch (error) {
      this.handleError("Failed to close position", error);
      throw error;
    }
  }

  async closeAllPositions(): Promise<boolean> {
    try {
      const positions = await this.getPositions();
      const results = await Promise.all(positions.map((position) => this.closePosition(position.symbol)));
      return results.every((result) => result);
    } catch (error) {
      this.handleError("Failed to close all positions", error);
      throw error;
    }
  }

  async getMinQuantity(symbol: string): Promise<number> {
    try {
      await this.globalLimiter.acquire();
      const response = await this.client.get(`/api/v1/markets/${symbol}`);
      return response.data.minDealSize;
    } catch (error) {
      this.handleError("Failed to get minimum quantity", error);
      throw error;
    }
  }

  async getMaxLeverage(symbol: string): Promise<number> {
    try {
      await this.globalLimiter.acquire();
      const response = await this.client.get(`/api/v1/markets/${symbol}`);
      return response.data.maxLeverage;
    } catch (error) {
      this.handleError("Failed to get maximum leverage", error);
      throw error;
    }
  }

  private mapOrderType(type: string): OrderType {
    const map: Record<string, OrderType> = {
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
