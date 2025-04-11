import { createLogger } from "../../../utils/logger";
import { MarketData, Candle } from "../interfaces/types";
import { PrismaClient } from "@prisma/client";

interface CacheKey {
  symbol: string;
  timeframe: string;
  startTime: number;
  endTime: number;
}

interface CacheEntry {
  key: CacheKey;
  data: Candle[];
  lastUpdated: number;
  isComplete: boolean;
}

export class MarketDataCacheService {
  private readonly logger = createLogger("market-data-cache");
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly prisma: PrismaClient;
  private readonly maxCacheAge: number = 24 * 60 * 60 * 1000; // 24 hours
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.prisma = new PrismaClient();

    // Run cache cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupCache();
      },
      60 * 60 * 1000
    ).unref();
  }

  /**
   * Get cached candles for a symbol and timeframe
   */
  public async getCachedCandles(symbol: string, timeframe: string, startTime: number, endTime: number): Promise<Candle[] | null> {
    const key = this.getCacheKey({ symbol, timeframe, startTime, endTime });
    const cached = this.cache.get(key);

    if (cached && !this.isStale(cached)) {
      return cached.data;
    }

    // Try to get from database
    try {
      const candles = await this.prisma.marketDataCache.findFirst({
        where: {
          symbol,
          timeframe,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        },
      });

      if (candles && !this.isStale({ lastUpdated: candles.lastUpdated.getTime() } as CacheEntry)) {
        const data = JSON.parse(candles.data) as Candle[];
        this.cache.set(key, {
          key: { symbol, timeframe, startTime, endTime },
          data,
          lastUpdated: candles.lastUpdated.getTime(),
          isComplete: candles.isComplete,
        });
        return data;
      }
    } catch (error) {
      this.logger.error("Error reading from database cache:", error);
    }

    return null;
  }

  /**
   * Cache candles for a symbol and timeframe
   */
  public async cacheCandles(symbol: string, timeframe: string, startTime: number, endTime: number, candles: Candle[], isComplete: boolean = true): Promise<void> {
    const key = this.getCacheKey({ symbol, timeframe, startTime, endTime });
    const entry: CacheEntry = {
      key: { symbol, timeframe, startTime, endTime },
      data: candles,
      lastUpdated: Date.now(),
      isComplete,
    };

    // Update memory cache
    this.cache.set(key, entry);

    // Update database cache
    try {
      await this.prisma.marketDataCache.upsert({
        where: {
          symbol_timeframe_startTime_endTime: {
            symbol,
            timeframe,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
          },
        },
        update: {
          data: JSON.stringify(candles),
          lastUpdated: new Date(),
          isComplete,
        },
        create: {
          symbol,
          timeframe,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          data: JSON.stringify(candles),
          lastUpdated: new Date(),
          isComplete,
        },
      });
    } catch (error) {
      this.logger.error("Error writing to database cache:", error);
    }
  }

  /**
   * Invalidate cache for a symbol and timeframe
   */
  public async invalidateCache(symbol: string, timeframe?: string): Promise<void> {
    // Remove from memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (entry.key.symbol === symbol && (!timeframe || entry.key.timeframe === timeframe)) {
        this.cache.delete(key);
      }
    }

    // Remove from database cache
    try {
      await this.prisma.marketDataCache.deleteMany({
        where: {
          symbol,
          ...(timeframe && { timeframe }),
        },
      });
    } catch (error) {
      this.logger.error("Error invalidating database cache:", error);
    }
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupCache(): Promise<void> {
    const now = Date.now();
    const cutoff = now - this.maxCacheAge;

    // Clean memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (this.isStale(entry)) {
        this.cache.delete(key);
      }
    }

    // Clean database cache
    try {
      await this.prisma.marketDataCache.deleteMany({
        where: {
          lastUpdated: {
            lt: new Date(cutoff),
          },
        },
      });
    } catch (error) {
      this.logger.error("Error cleaning up database cache:", error);
    }
  }

  private isStale(entry: Pick<CacheEntry, "lastUpdated">): boolean {
    return Date.now() - entry.lastUpdated > this.maxCacheAge;
  }

  private getCacheKey(key: CacheKey): string {
    return `${key.symbol}-${key.timeframe}-${key.startTime}-${key.endTime}`;
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    clearInterval(this.cleanupInterval);
    await this.prisma.$disconnect();
  }
}
