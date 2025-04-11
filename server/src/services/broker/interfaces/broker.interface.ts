import { EventEmitter } from "events";
import { OrderParameters, Order, Position, AccountBalance, MarketData, Candle } from "./types";

export interface IBrokerCredentials {
  apiKey: string;
  apiSecret: string;
  isDemo?: boolean;
}

export interface IBroker extends EventEmitter {
  // Connection management
  connect(credentials: IBrokerCredentials): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  validateCredentials(): Promise<boolean>;

  // Market data
  getMarketData(symbol: string): Promise<MarketData>;
  subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): Promise<void>;
  unsubscribeFromMarketData(symbol: string): Promise<void>;

  // Historical data
  getCandles(symbol: string, timeframe: string, limit?: number): Promise<Candle[]>;

  // Account information
  getBalance(): Promise<{ total: number; available: number }>;
  getPositions(): Promise<Position[]>;
  getPosition(symbol: string): Promise<Position | null>;
  getOrders(symbol?: string): Promise<Order[]>;
  getOrder(orderId: string): Promise<Order | null>;

  // Trading operations
  createOrder(params: OrderParameters): Promise<Order>;
  cancelOrder(orderId: string): Promise<boolean>;
  modifyOrder(orderId: string, parameters: Partial<OrderParameters>): Promise<Order>;
  closePosition(symbol: string): Promise<boolean>;
  closeAllPositions(): Promise<boolean>;

  // Trading constraints
  getMinQuantity(symbol: string): Promise<number>;
  getMaxLeverage(symbol: string): Promise<number>;

  // Error handling
  getLastError(): Error | null;
}
