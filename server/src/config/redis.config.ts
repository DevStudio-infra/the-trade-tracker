import { Redis } from "@upstash/redis";
import { createLogger } from "../utils/logger";

const logger = createLogger("redis-config");

// Redis connection state tracking
let redisConnectionFailed = false;
let lastConnectionAttempt = 0;
const RETRY_INTERVAL = 60000; // 1 minute between retries when down
const MAX_RETRIES = 10; // Maximum number of retries
let retryCount = 0;

// TTL values in seconds for different timeframes
export const TTL = {
  "1m": 300, // 5 minutes
  "5m": 900, // 15 minutes
  "15m": 1800, // 30 minutes
  "30m": 3600, // 1 hour
  "1h": 7200, // 2 hours
  "4h": 14400, // 4 hours
  "1d": 86400, // 24 hours
} as const;

// Redis key patterns
export const REDIS_KEYS = {
  CANDLES: (symbol: string, timeframe: string) => `candles:${symbol}:${timeframe}`,
  ACTIVE_POSITIONS: "active_positions",
  TRADE_METADATA: (tradeId: string) => `trade:${tradeId}:metadata`,
};

// Redis wrapper class that handles both real and mock implementations
class RedisWrapper {
  private client: Redis;
  private isMock: boolean;
  private isConnected: boolean;

  constructor(client: Redis, isMock: boolean = false) {
    this.client = client;
    this.isMock = isMock;
    this.isConnected = false;
  }

  private async ensureConnection(): Promise<boolean> {
    if (this.isMock) return true;
    if (this.isConnected) return true;

    const now = Date.now();
    if (now - lastConnectionAttempt < RETRY_INTERVAL) {
      return false;
    }

    lastConnectionAttempt = now;
    try {
      const result = await this.ping();
      this.isConnected = result === "PONG";
      if (this.isConnected) {
        retryCount = 0;
        redisConnectionFailed = false;
        logger.info("Redis connection restored");
      }
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      retryCount++;
      logger.error({
        message: "Redis connection check failed",
        retryCount,
        maxRetries: MAX_RETRIES,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!(await this.ensureConnection())) return null;
    try {
      if (this.isMock) {
        logger.debug(`Mock Redis: GET ${key}`);
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      this.isConnected = false;
      logger.error(`Error getting key ${key}:`, error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  async set(key: string, value: string): Promise<"OK" | null> {
    if (!(await this.ensureConnection())) return null;
    try {
      if (this.isMock) {
        logger.debug(`Mock Redis: SET ${key}`);
        return "OK";
      }
      const result = await this.client.set(key, value);
      return result === "OK" ? "OK" : null;
    } catch (error) {
      this.isConnected = false;
      logger.error(`Error setting key ${key}:`, error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<"OK" | null> {
    if (!(await this.ensureConnection())) return null;
    try {
      if (this.isMock) {
        logger.debug(`Mock Redis: SETEX ${key} ${ttl}`);
        return "OK";
      }
      const result = await this.client.setex(key, ttl, value);
      return result === "OK" ? "OK" : null;
    } catch (error) {
      this.isConnected = false;
      logger.error(`Error setting key ${key} with TTL:`, error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  async del(key: string): Promise<number> {
    if (!(await this.ensureConnection())) return 0;
    try {
      if (this.isMock) {
        logger.debug(`Mock Redis: DEL ${key}`);
        return 1;
      }
      return await this.client.del(key);
    } catch (error) {
      this.isConnected = false;
      logger.error(`Error deleting key ${key}:`, error instanceof Error ? error.message : "Unknown error");
      return 0;
    }
  }

  async setnx(key: string, value: string): Promise<number> {
    if (!(await this.ensureConnection())) return 0;
    try {
      if (this.isMock) {
        logger.debug(`Mock Redis: SETNX ${key}`);
        return 0;
      }
      return await this.client.setnx(key, value);
    } catch (error) {
      this.isConnected = false;
      logger.error(`Error setting key ${key} if not exists:`, error instanceof Error ? error.message : "Unknown error");
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!(await this.ensureConnection())) return 0;
    try {
      if (this.isMock) {
        logger.debug(`Mock Redis: EXPIRE ${key} ${seconds}`);
        return 1;
      }
      return await this.client.expire(key, seconds);
    } catch (error) {
      this.isConnected = false;
      logger.error(`Error setting expiry for key ${key}:`, error instanceof Error ? error.message : "Unknown error");
      return 0;
    }
  }

  async ping(): Promise<"PONG" | null> {
    try {
      if (this.isMock) {
        logger.debug("Mock Redis: PING");
        return "PONG";
      }
      const result = await this.client.ping();
      return result === "PONG" ? "PONG" : null;
    } catch (error) {
      this.isConnected = false;
      logger.error("Error pinging Redis:", error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!(await this.ensureConnection())) return [];
    try {
      if (this.isMock) {
        logger.debug(`Mock Redis: KEYS ${pattern}`);
        return [];
      }
      return await this.client.keys(pattern);
    } catch (error) {
      this.isConnected = false;
      logger.error(`Error getting keys with pattern ${pattern}:`, error instanceof Error ? error.message : "Unknown error");
      return [];
    }
  }

  pipeline() {
    if (this.isMock) {
      logger.debug("Mock Redis: Creating pipeline");
      return {
        get: () => this,
        set: () => this,
        setex: () => this,
        del: () => this,
        exec: async () => [],
      };
    }
    return this.client.pipeline();
  }
}

// Create Redis client with fallback handling
let redisClient: RedisWrapper;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: MAX_RETRIES,
        backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000),
      },
    });
    redisClient = new RedisWrapper(client);
    logger.info({
      message: "Redis client initialized",
      url: process.env.UPSTASH_REDIS_REST_URL,
      maxRetries: MAX_RETRIES,
    });
  } else {
    throw new Error("Missing Redis configuration environment variables");
  }
} catch (error) {
  logger.error({
    message: "Failed to initialize Redis client",
    error: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
  });
  // Create a mock Redis client
  redisClient = new RedisWrapper(new Redis({ url: "mock://localhost", token: "mock" }), true);
  redisConnectionFailed = true;
}

// Initialize Redis connection
export async function initRedis(): Promise<void> {
  if (redisConnectionFailed && retryCount >= MAX_RETRIES) {
    logger.warn({
      message: "Skipping Redis initialization due to maximum retries reached",
      retryCount,
      maxRetries: MAX_RETRIES,
    });
    return;
  }

  try {
    const result = await redisClient.ping();
    if (result === "PONG") {
      logger.info("Upstash Redis connection test successful");
      redisConnectionFailed = false;
      retryCount = 0;
    } else {
      throw new Error("Redis ping failed");
    }
  } catch (error) {
    redisConnectionFailed = true;
    retryCount++;
    logger.error({
      message: "Redis initialization failed",
      retryCount,
      maxRetries: MAX_RETRIES,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Helper function to determine if Redis operations should be attempted
export function shouldAttemptRedisOperation(): boolean {
  return !redisConnectionFailed || retryCount < MAX_RETRIES;
}

// Export the Redis client
export const redis = redisClient;
