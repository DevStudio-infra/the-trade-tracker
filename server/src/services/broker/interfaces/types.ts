export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderSide = "BUY" | "SELL";
export type TimeInForce = "GTC" | "IOC" | "FOK";
export type OrderStatus = "PENDING" | "OPEN" | "CLOSED" | "CANCELED" | "REJECTED";
export type PositionSide = "LONG" | "SHORT";

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  volume?: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderParameters {
  symbol: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number; // Required for LIMIT and STOP_LIMIT orders
  stopPrice?: number; // Required for STOP and STOP_LIMIT orders
  timeInForce?: TimeInForce;
  leverage?: number; // For margin trading
}

export interface Order extends OrderParameters {
  id: string;
  status: OrderStatus;
  filledQuantity: number;
  averagePrice?: number;
  commission?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnL: number;
  realizedPnL: number;
  leverage: number;
  liquidationPrice?: number;
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
