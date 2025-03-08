import { IBroker, IBrokerCredentials } from "../interfaces/broker.interface";
import { MarketData, Order, Position, AccountBalance, Candle, OrderParameters } from "../interfaces/types";
import { createLogger } from "../../../utils/logger";

export abstract class BaseBroker implements IBroker {
  protected credentials?: IBrokerCredentials;
  protected connected: boolean = false;
  protected lastError: Error | null = null;
  protected logger = createLogger(this.constructor.name);
  protected marketDataSubscriptions: Map<string, Set<(data: MarketData) => void>> = new Map();

  // Connection management
  abstract connect(credentials: IBrokerCredentials): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract validateCredentials(): Promise<boolean>;

  isConnected(): boolean {
    return this.connected;
  }

  // Market data
  abstract getMarketData(symbol: string): Promise<MarketData>;

  async subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): Promise<void> {
    try {
      if (!this.marketDataSubscriptions.has(symbol)) {
        this.marketDataSubscriptions.set(symbol, new Set());
        await this.startMarketDataStream(symbol);
      }
      this.marketDataSubscriptions.get(symbol)?.add(callback);
    } catch (error) {
      this.handleError("Failed to subscribe to market data", error);
      throw error;
    }
  }

  async unsubscribeFromMarketData(symbol: string): Promise<void> {
    try {
      if (this.marketDataSubscriptions.has(symbol)) {
        this.marketDataSubscriptions.delete(symbol);
        if (this.marketDataSubscriptions.get(symbol)?.size === 0) {
          await this.stopMarketDataStream(symbol);
        }
      }
    } catch (error) {
      this.handleError("Failed to unsubscribe from market data", error);
      throw error;
    }
  }

  // Historical data
  abstract getCandles(symbol: string, timeframe: string, limit?: number): Promise<Candle[]>;

  // Account information
  abstract getBalance(): Promise<AccountBalance>;
  abstract getPositions(): Promise<Position[]>;
  abstract getPosition(symbol: string): Promise<Position | null>;
  abstract getOrders(symbol?: string): Promise<Order[]>;
  abstract getOrder(orderId: string): Promise<Order | null>;

  // Trading operations
  abstract createOrder(parameters: OrderParameters): Promise<Order>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract modifyOrder(orderId: string, parameters: Partial<OrderParameters>): Promise<Order>;
  abstract closePosition(symbol: string): Promise<boolean>;

  async closeAllPositions(): Promise<boolean> {
    try {
      const positions = await this.getPositions();
      const results = await Promise.all(positions.map((position) => this.closePosition(position.symbol)));
      return results.every((result) => result);
    } catch (error) {
      this.handleError("Failed to close all positions", error);
      return false;
    }
  }

  // Trading constraints
  abstract getMinQuantity(symbol: string): Promise<number>;
  abstract getMaxLeverage(symbol: string): Promise<number>;

  // Error handling
  getLastError(): Error | null {
    return this.lastError;
  }

  // Protected helper methods
  protected abstract startMarketDataStream(symbol: string): Promise<void>;
  protected abstract stopMarketDataStream(symbol: string): Promise<void>;

  protected handleError(message: string, error: unknown): void {
    this.lastError = error instanceof Error ? error : new Error(String(error));
    this.logger.error({
      message,
      error: this.lastError.message,
      stack: this.lastError.stack,
    });
  }

  protected handleMarketData(symbol: string, data: MarketData): void {
    const callbacks = this.marketDataSubscriptions.get(symbol);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.handleError("Error in market data callback", error);
        }
      });
    }
  }
}
