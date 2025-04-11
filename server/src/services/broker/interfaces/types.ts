export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderSide = "BUY" | "SELL";
export type TimeInForce = "GTC" | "IOC" | "FOK";
export enum OrderStatus {
  PENDING = "PENDING",
  OPEN = "OPEN",
  FILLED = "FILLED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}
export type PositionSide = "LONG" | "SHORT";

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  volume?: number;
  timeframe?: string;
  currentPrice?: number;
  candles?: Candle[];
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OrderParameters {
  symbol: string;
  type: OrderType;
  side: "BUY" | "SELL";
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: "GTC" | "IOC" | "FOK";
}

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  stopPrice?: number;
  status: OrderStatus;
  timestamp: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnL: number;
  realizedPnL: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountBalance {
  total: number;
  available: number;
  locked: number;
  unrealizedPnL: number;
  currency: string;
}

export interface BrokerError {
  code: string;
  message: string;
  details?: any;
}

export enum OrderType {
  MARKET = "MARKET",
  LIMIT = "LIMIT",
  STOP = "STOP",
}
