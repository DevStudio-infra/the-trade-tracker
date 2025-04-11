import { EventEmitter } from "events";
import { MarketData, Candle } from "../interfaces/types";
import { createLogger } from "../../../utils/logger";

interface DataBuffer {
  symbol: string;
  data: MarketData[];
  lastUpdate: number;
}

interface CandleBuffer {
  symbol: string;
  timeframe: string;
  currentCandle: Candle;
  lastUpdate: number;
}

export class MarketDataStreamService extends EventEmitter {
  private readonly logger = createLogger("market-data-stream");
  private readonly dataBuffers: Map<string, DataBuffer> = new Map();
  private readonly candleBuffers: Map<string, CandleBuffer> = new Map();
  private readonly flushInterval: NodeJS.Timeout;
  private readonly aggregationInterval: NodeJS.Timeout;

  constructor(
    private readonly bufferTimeMs: number = 100,
    private readonly aggregationTimeMs: number = 1000
  ) {
    super();

    // Flush market data buffers periodically
    this.flushInterval = setInterval(() => {
      this.flushBuffers();
    }, this.bufferTimeMs).unref();

    // Aggregate candles periodically
    this.aggregationInterval = setInterval(() => {
      this.aggregateCandles();
    }, this.aggregationTimeMs).unref();
  }

  /**
   * Handle incoming market data update
   */
  public handleMarketDataUpdate(data: MarketData): void {
    const buffer = this.getOrCreateBuffer(data.symbol);
    buffer.data.push(data);
    buffer.lastUpdate = Date.now();
  }

  /**
   * Subscribe to real-time market data for a symbol and timeframe
   */
  public subscribe(symbol: string, timeframe: string): void {
    const key = this.getCandleBufferKey(symbol, timeframe);
    if (!this.candleBuffers.has(key)) {
      this.candleBuffers.set(key, {
        symbol,
        timeframe,
        currentCandle: this.createEmptyCandle(symbol),
        lastUpdate: Date.now(),
      });
    }
  }

  /**
   * Unsubscribe from real-time market data
   */
  public unsubscribe(symbol: string, timeframe: string): void {
    const key = this.getCandleBufferKey(symbol, timeframe);
    this.candleBuffers.delete(key);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    clearInterval(this.flushInterval);
    clearInterval(this.aggregationInterval);
    this.dataBuffers.clear();
    this.candleBuffers.clear();
    this.removeAllListeners();
  }

  private getOrCreateBuffer(symbol: string): DataBuffer {
    let buffer = this.dataBuffers.get(symbol);
    if (!buffer) {
      buffer = {
        symbol,
        data: [],
        lastUpdate: Date.now(),
      };
      this.dataBuffers.set(symbol, buffer);
    }
    return buffer;
  }

  private flushBuffers(): void {
    const now = Date.now();
    for (const [symbol, buffer] of this.dataBuffers) {
      if (buffer.data.length > 0) {
        // Calculate OHLCV from buffered ticks
        const ticks = buffer.data;
        const ohlcv = this.calculateOHLCV(ticks);

        // Emit the aggregated data
        this.emit("marketData", {
          symbol,
          ...ohlcv,
          timestamp: now,
        });

        // Clear the buffer
        buffer.data = [];
      }
    }
  }

  private aggregateCandles(): void {
    const now = Date.now();
    for (const [key, buffer] of this.candleBuffers) {
      const timeframeMs = this.getTimeframeMs(buffer.timeframe);

      // Check if it's time to close the current candle
      if (now - buffer.lastUpdate >= timeframeMs) {
        // Emit the completed candle
        this.emit("candle", {
          symbol: buffer.symbol,
          timeframe: buffer.timeframe,
          candle: buffer.currentCandle,
        });

        // Start a new candle
        buffer.currentCandle = this.createEmptyCandle(buffer.symbol);
        buffer.lastUpdate = now;
      }
    }
  }

  private calculateOHLCV(ticks: MarketData[]): {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } {
    const prices = ticks.map((t) => (t.bid + t.ask) / 2);
    const volumes = ticks.map((t) => t.volume || 0);

    return {
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: volumes.reduce((a, b) => a + b, 0),
    };
  }

  private createEmptyCandle(symbol: string): Candle {
    return {
      timestamp: Date.now(),
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
    };
  }

  private getCandleBufferKey(symbol: string, timeframe: string): string {
    return `${symbol}-${timeframe}`;
  }

  private getTimeframeMs(timeframe: string): number {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1));

    switch (unit) {
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid timeframe: ${timeframe}`);
    }
  }
}
