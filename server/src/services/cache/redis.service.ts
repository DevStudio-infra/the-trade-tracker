import { createLogger } from "../../utils/logger";
import Redis from "ioredis";

const logger = createLogger("redis-service");

// Use environment variable for Redis URL or fallback to localhost
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export class RedisService {
  private client!: Redis; // Using definite assignment assertion
  private isConnected: boolean = false;
  private mockMode: boolean = false;
  private mockData: Map<string, any> = new Map();

  constructor() {
    try {
      this.client = new Redis(REDIS_URL);
      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("Connected to Redis");
      });
      this.client.on("error", (err) => {
        logger.error("Redis connection error:", err);
        this.isConnected = false;
        this.mockMode = true;
        logger.warn("Falling back to mock Redis mode");
      });
    } catch (error) {
      logger.error("Failed to initialize Redis client:", error);
      this.mockMode = true;
      logger.warn("Falling back to mock Redis mode");
    }
  }

  /**
   * Set a key-value pair in Redis
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      if (this.mockMode) {
        this.mockData.set(key, {
          value,
          expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
        });
        return;
      }

      if (!this.isConnected) {
        throw new Error("Redis not connected");
      }

      const stringValue = typeof value === "string" ? value : JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.set(key, stringValue, "EX", ttlSeconds);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      logger.error(`Error setting Redis key ${key}:`, error);
      // Fallback to mock in case of runtime errors
      if (!this.mockMode) {
        this.mockMode = true;
        this.mockData.set(key, {
          value,
          expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
        });
      }
    }
  }

  /**
   * Get a value from Redis by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.mockMode) {
        const item = this.mockData.get(key);
        if (!item) return null;
        if (item.expiry && item.expiry < Date.now()) {
          this.mockData.delete(key);
          return null;
        }
        return item.value as T;
      }

      if (!this.isConnected) {
        throw new Error("Redis not connected");
      }

      const value = await this.client.get(key);
      if (!value) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      logger.error(`Error getting Redis key ${key}:`, error);
      // Fallback to mock in case of runtime errors
      if (!this.mockMode) {
        const item = this.mockData.get(key);
        if (!item) return null;
        if (item.expiry && item.expiry < Date.now()) {
          this.mockData.delete(key);
          return null;
        }
        return item.value as T;
      }
      return null;
    }
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.mockMode) {
        this.mockData.delete(key);
        return;
      }

      if (!this.isConnected) {
        throw new Error("Redis not connected");
      }

      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting Redis key ${key}:`, error);
      if (!this.mockMode) {
        this.mockData.delete(key);
      }
    }
  }

  /**
   * Set active position in cache
   */
  async setActivePosition(userId: string, tradeId: string, position: any): Promise<void> {
    const key = `position:${userId}:${tradeId}`;
    await this.set(key, position, 60 * 60); // Cache for 1 hour

    // Also update the active positions list
    const listKey = `positions:${userId}`;
    const positions = await this.getActivePositions(userId);
    const updatedPositions = positions.filter((p) => p.tradeId !== tradeId);
    updatedPositions.push(position);
    await this.set(listKey, updatedPositions, 60 * 60); // Cache for 1 hour
  }

  /**
   * Get active positions for a user
   */
  async getActivePositions(userId: string): Promise<any[]> {
    const key = `positions:${userId}`;
    const positions = await this.get<any[]>(key);
    return positions || [];
  }

  /**
   * Remove active position from cache
   */
  async removeActivePosition(userId: string, tradeId: string): Promise<void> {
    const key = `position:${userId}:${tradeId}`;
    await this.delete(key);

    // Also update the active positions list
    const listKey = `positions:${userId}`;
    const positions = await this.getActivePositions(userId);
    const updatedPositions = positions.filter((p) => p.tradeId !== tradeId);
    await this.set(listKey, updatedPositions, 60 * 60); // Cache for 1 hour
  }

  /**
   * Cache candle data
   */
  async cacheCandles(pair: string, timeframe: string, candles: any[]): Promise<void> {
    const key = `candles:${pair}:${timeframe}`;
    await this.set(key, candles, getCandleTTL(timeframe));
  }

  /**
   * Get cached candle data
   */
  async getCachedCandles(pair: string, timeframe: string): Promise<any[] | null> {
    const key = `candles:${pair}:${timeframe}`;
    return await this.get<any[]>(key);
  }
}

/**
 * Get TTL for candle data based on timeframe
 */
function getCandleTTL(timeframe: string): number {
  switch (timeframe) {
    case "1m":
      return 60 * 5; // 5 minutes
    case "5m":
      return 60 * 15; // 15 minutes
    case "15m":
      return 60 * 30; // 30 minutes
    case "1h":
      return 60 * 60 * 2; // 2 hours
    case "4h":
      return 60 * 60 * 8; // 8 hours
    case "1d":
      return 60 * 60 * 24; // 24 hours
    default:
      return 60 * 30; // 30 minutes by default
  }
}
