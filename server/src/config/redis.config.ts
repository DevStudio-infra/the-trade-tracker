import { Redis } from "@upstash/redis";
import { createLogger } from "../utils/logger";

const logger = createLogger("redis-config");

// Redis connection state tracking
let redisConnectionFailed = false;
let lastConnectionAttempt = 0;
const RETRY_INTERVAL = 60000; // 1 minute between retries when down

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
};

// Check if required environment variables are provided
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis client with fallback handling
let redis: Redis;

try {
  if (hasRedisConfig) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      // Simplified retry configuration that matches upstash/redis options
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 3000),
      },
    });
    logger.info("Redis client initialized with configuration from environment variables");
  } else {
    throw new Error("Missing Redis configuration environment variables");
  }
} catch (error) {
  logger.error({
    message: "Failed to initialize Redis client",
    error: error instanceof Error ? error.message : "Unknown error",
  });
  // Create a mock Redis client that does nothing but log
  redis = {} as Redis;
  redisConnectionFailed = true;
}

// Initialize Redis connection
export async function initRedis(): Promise<void> {
  if (redisConnectionFailed) {
    logger.warn("Skipping Redis initialization due to previous failures");
    return;
  }

  try {
    // Test the connection
    await redis.ping();
    logger.info("Upstash Redis connection test successful");
    redisConnectionFailed = false;
  } catch (error) {
    redisConnectionFailed = true;
    logger.error({
      message: "Error connecting to Upstash Redis",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // We'll continue without Redis rather than crashing the application
    logger.warn("The application will continue without Redis caching support");
  }
}

// Helper to check if we should attempt a Redis operation
function shouldAttemptRedisOperation(): boolean {
  const now = Date.now();

  // If connection failed previously, only retry at intervals
  if (redisConnectionFailed) {
    if (now - lastConnectionAttempt < RETRY_INTERVAL) {
      return false;
    }
    // Update last attempt time
    lastConnectionAttempt = now;
    logger.info("Attempting Redis connection after previous failure");
  }

  // Ensure we're returning a proper boolean by checking if both variables are strings
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

// Helper function to set candle data with appropriate TTL
export async function setCandleData(symbol: string, timeframe: keyof typeof TTL, candles: unknown[]): Promise<void> {
  if (!shouldAttemptRedisOperation()) {
    // Skip silently if Redis is down
    return;
  }

  try {
    const key = REDIS_KEYS.CANDLES(symbol, timeframe);

    // Validate candles data before storing
    if (!Array.isArray(candles)) {
      logger.error({
        message: "Invalid candles data (not an array)",
        type: typeof candles,
        symbol,
        timeframe,
      });
      return; // Don't throw, just return
    }

    // Serialize data safely
    let serializedData: string;
    try {
      serializedData = JSON.stringify(candles);

      // Log sample for debugging
      logger.debug({
        message: "Serializing candles data",
        symbol,
        timeframe,
        candlesCount: candles.length,
        sample: candles.length > 0 ? JSON.stringify(candles[0]).substring(0, 500) : "empty array",
        serializedLength: serializedData.length,
      });
    } catch (serializeError) {
      logger.error({
        message: "Failed to serialize candles data",
        error: serializeError instanceof Error ? serializeError.message : "Unknown error",
        symbol,
        timeframe,
      });
      return; // Don't throw, just return
    }

    // Store in Redis with error handling
    try {
      await redis.setex(key, TTL[timeframe], serializedData);

      // Reset connection state on successful operation
      if (redisConnectionFailed) {
        logger.info("Redis connection restored");
        redisConnectionFailed = false;
      }

      logger.info({
        message: "Successfully cached candles data",
        symbol,
        timeframe,
        ttl: TTL[timeframe],
        candlesCount: candles.length,
      });
    } catch (redisError) {
      redisConnectionFailed = true;
      logger.error({
        message: "Redis operation failed when caching candles",
        error: redisError instanceof Error ? redisError.message : "Unknown error",
        symbol,
        timeframe,
      });
    }
  } catch (error) {
    logger.error({
      message: "Error in setCandleData",
      error: error instanceof Error ? error.message : "Unknown error",
      symbol,
      timeframe,
    });
    // Don't throw, continue without caching
  }
}

// Helper function to get candle data
export async function getCandleData<T>(symbol: string, timeframe: string): Promise<T | null> {
  if (!shouldAttemptRedisOperation()) {
    // Return null if Redis is down
    return null;
  }

  try {
    const key = REDIS_KEYS.CANDLES(symbol, timeframe);

    // Execute Redis get with timeout handling
    const data = await Promise.race([
      redis.get<string>(key),
      new Promise<null>((resolve) => {
        setTimeout(() => {
          logger.warn({
            message: "Redis get operation timed out",
            symbol,
            timeframe,
          });
          resolve(null);
        }, 5000); // 5 second timeout
      }),
    ]);

    // Reset connection state on successful operation
    if (data !== null && redisConnectionFailed) {
      logger.info("Redis connection restored");
      redisConnectionFailed = false;
    }

    logger.debug({
      message: "Redis cache lookup",
      symbol,
      timeframe,
      found: data !== null,
      dataLength: data ? data.length : 0,
    });

    if (!data) {
      return null;
    }

    // Parse the JSON data with error handling
    try {
      const parsedData = JSON.parse(data) as T;

      // Validate parsed data
      if (Array.isArray(parsedData)) {
        logger.info({
          message: "Successfully retrieved candles from cache",
          symbol,
          timeframe,
          itemCount: parsedData.length,
        });
      } else {
        logger.warn({
          message: "Retrieved non-array data from cache",
          symbol,
          timeframe,
          dataType: typeof parsedData,
        });
      }

      return parsedData;
    } catch (parseError) {
      // If we can't parse the data, log the error and return null
      logger.error({
        message: "Failed to parse cached data",
        error: parseError instanceof Error ? parseError.message : "Unknown error",
        symbol,
        timeframe,
        dataSample: typeof data === "string" ? data.substring(0, 1000) : `Non-string data type: ${typeof data}`,
      });

      // Try to delete the corrupted data, but don't fail if that doesn't work
      try {
        await redis.del(key);
        logger.info({
          message: "Deleted corrupted cache entry",
          symbol,
          timeframe,
        });
      } catch (deleteError) {
        logger.warn({
          message: "Failed to delete corrupted cache entry",
          error: deleteError instanceof Error ? deleteError.message : "Unknown error",
          symbol,
          timeframe,
        });
      }

      return null;
    }
  } catch (error) {
    redisConnectionFailed = true;
    logger.error({
      message: "Error retrieving candles from cache",
      error: error instanceof Error ? error.message : "Unknown error",
      symbol,
      timeframe,
    });
    return null;
  }
}

// Helper function to get multiple candle data sets
export async function getMultipleCandleData<T>(symbols: string[], timeframes: string[]): Promise<(T | null)[]> {
  if (!shouldAttemptRedisOperation()) {
    // Return array of nulls if Redis is down
    return Array(symbols.length * timeframes.length).fill(null);
  }

  try {
    const pipeline = redis.pipeline();

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        const key = REDIS_KEYS.CANDLES(symbol, timeframe);
        pipeline.get(key);
      }
    }

    // Execute pipeline with timeout handling
    const results = await Promise.race([
      pipeline.exec(),
      new Promise<any[]>((resolve) => {
        setTimeout(() => {
          logger.warn("Redis pipeline operation timed out");
          resolve(Array(symbols.length * timeframes.length).fill(null));
        }, 5000); // 5 second timeout
      }),
    ]);

    // Reset connection state on successful operation
    if (redisConnectionFailed) {
      logger.info("Redis connection restored");
      redisConnectionFailed = false;
    }

    return results.map((result) => {
      if (result) {
        try {
          return JSON.parse(result as string);
        } catch (e) {
          logger.error({
            message: "Failed to parse data from pipeline result",
            error: e instanceof Error ? e.message : "Unknown error",
          });
          return null;
        }
      }
      return null;
    });
  } catch (error) {
    redisConnectionFailed = true;
    logger.error({
      message: "Error executing Redis pipeline",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return Array(symbols.length * timeframes.length).fill(null);
  }
}

// Helper function to set multiple candle data sets
export async function setMultipleCandleData(
  candleData: Array<{
    symbol: string;
    timeframe: keyof typeof TTL;
    candles: unknown[];
  }>
): Promise<void> {
  if (!shouldAttemptRedisOperation()) {
    // Skip silently if Redis is down
    return;
  }

  try {
    const pipeline = redis.pipeline();

    for (const { symbol, timeframe, candles } of candleData) {
      try {
        const key = REDIS_KEYS.CANDLES(symbol, timeframe);
        const serialized = JSON.stringify(candles);
        pipeline.setex(key, TTL[timeframe], serialized);
      } catch (serializeError) {
        logger.error({
          message: "Failed to serialize candle data for pipeline",
          error: serializeError instanceof Error ? serializeError.message : "Unknown error",
          symbol,
          timeframe,
        });
        // Continue with other items
      }
    }

    // Execute pipeline with timeout handling
    await Promise.race([
      pipeline.exec(),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          logger.warn("Redis pipeline setex operation timed out");
          resolve();
        }, 5000); // 5 second timeout
      }),
    ]);

    // Reset connection state on successful operation
    if (redisConnectionFailed) {
      logger.info("Redis connection restored");
      redisConnectionFailed = false;
    }

    logger.info({
      message: "Successfully cached multiple candle data sets",
      count: candleData.length,
    });
  } catch (error) {
    redisConnectionFailed = true;
    logger.error({
      message: "Error setting multiple candle data sets",
      error: error instanceof Error ? error.message : "Unknown error",
      count: candleData.length,
    });
    // Don't throw, just log
  }
}

// Export Redis instance
export { redis };
