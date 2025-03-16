import { Redis } from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize Redis client
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";

if (!redisUrl || !redisToken) {
  console.warn("Redis credentials not found in environment variables");
}

// Create Redis client
const redis = new Redis(`rediss://default:${redisToken}@${redisUrl.replace("https://", "")}`);

// Test connection
redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default redis;
