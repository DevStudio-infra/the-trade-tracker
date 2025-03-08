import { Redis } from "@upstash/redis";
import { createLogger } from "../utils/logger";

const logger = createLogger("redis-config");

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error("Missing UPSTASH_REDIS_REST_URL environment variable");
}

if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Missing UPSTASH_REDIS_REST_TOKEN environment variable");
}

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

// Create Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Initialize Redis connection
export async function initRedis(): Promise<void> {
  try {
    // Test the connection
    await redis.ping();
    logger.info("Upstash Redis connection test successful");
  } catch (error) {
    logger.error({
      message: "Error connecting to Upstash Redis",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// Helper function to set candle data with appropriate TTL
export async function setCandleData(symbol: string, timeframe: keyof typeof TTL, candles: unknown[]): Promise<void> {
  const key = REDIS_KEYS.CANDLES(symbol, timeframe);
  await redis.setex(key, TTL[timeframe], JSON.stringify(candles));
}

// Helper function to get candle data
export async function getCandleData<T>(symbol: string, timeframe: string): Promise<T | null> {
  const key = REDIS_KEYS.CANDLES(symbol, timeframe);
  const data = await redis.get<string>(key);
  return data ? JSON.parse(data) : null;
}

// Helper function to get multiple candle data sets
export async function getMultipleCandleData<T>(symbols: string[], timeframes: string[]): Promise<(T | null)[]> {
  const pipeline = redis.pipeline();

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const key = REDIS_KEYS.CANDLES(symbol, timeframe);
      pipeline.get(key);
    }
  }

  const results = await pipeline.exec();
  return results.map((result) => (result ? JSON.parse(result as string) : null));
}

// Helper function to set multiple candle data sets
export async function setMultipleCandleData(
  candleData: Array<{
    symbol: string;
    timeframe: keyof typeof TTL;
    candles: unknown[];
  }>
): Promise<void> {
  const pipeline = redis.pipeline();

  for (const { symbol, timeframe, candles } of candleData) {
    const key = REDIS_KEYS.CANDLES(symbol, timeframe);
    pipeline.setex(key, TTL[timeframe], JSON.stringify(candles));
  }

  await pipeline.exec();
}
