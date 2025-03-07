import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error("Missing UPSTASH_REDIS_REST_URL environment variable");
}

if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Missing UPSTASH_REDIS_REST_TOKEN environment variable");
}

// Create Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Key patterns for different data types
export const REDIS_KEYS = {
  CANDLES: (pair: string, timeframe: string) => `pair:${pair}:tf:${timeframe}:candles`,
} as const;

// TTL configurations (in seconds)
export const TTL = {
  "1m": 60, // 1 minute
  "2m": 120, // 2 minutes
  "5m": 300, // 5 minutes
  "15m": 900, // 15 minutes
  "30m": 1800, // 30 minutes
  "1h": 3600, // 1 hour
  "4h": 14400, // 4 hours
  "1d": 86400, // 1 day
  "1w": 604800, // 1 week
} as const;

// Initialize Redis connection
export async function initializeRedis() {
  try {
    // Test the connection
    await redis.ping();
    console.log("Upstash Redis connection test successful");
  } catch (error) {
    console.error("Error connecting to Upstash Redis:", error);
    throw error;
  }
}

// Helper function to set candle data with appropriate TTL
export async function setCandleData(pair: string, timeframe: keyof typeof TTL, candles: any[]) {
  const key = REDIS_KEYS.CANDLES(pair, timeframe);
  await redis.setex(key, TTL[timeframe], JSON.stringify(candles));
}

// Helper function to get candle data
export async function getCandleData(pair: string, timeframe: string) {
  const key = REDIS_KEYS.CANDLES(pair, timeframe);
  const data = await redis.get<string>(key);
  return data ? JSON.parse(data) : null;
}

// Helper function to get multiple candle data sets
export async function getMultipleCandleData(pairs: string[], timeframes: string[]) {
  const pipeline = redis.pipeline();

  for (const pair of pairs) {
    for (const timeframe of timeframes) {
      const key = REDIS_KEYS.CANDLES(pair, timeframe);
      pipeline.get(key);
    }
  }

  const results = await pipeline.exec();
  return results.map((result) => (result ? JSON.parse(result as string) : null));
}

// Helper function to set multiple candle data sets
export async function setMultipleCandleData(
  candleData: Array<{
    pair: string;
    timeframe: keyof typeof TTL;
    candles: any[];
  }>
) {
  const pipeline = redis.pipeline();

  for (const { pair, timeframe, candles } of candleData) {
    const key = REDIS_KEYS.CANDLES(pair, timeframe);
    pipeline.setex(key, TTL[timeframe], JSON.stringify(candles));
  }

  await pipeline.exec();
}
