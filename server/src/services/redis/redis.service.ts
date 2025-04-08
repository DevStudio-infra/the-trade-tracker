import { Redis } from "@upstash/redis";
import { createLogger } from "../../utils/logger";

const logger = createLogger("redis-service");

// Redis key prefixes
const ACTIVE_POSITIONS_KEY = "active_positions";
const POSITION_METADATA_KEY = "position_metadata";

export interface PositionMetadata {
  positionCalculation?: any;
  orderResult?: any;
  [key: string]: any;
}

export class RedisService {
  private client: Redis;

  constructor() {
    const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!hasRedisConfig) {
      logger.error("Missing Redis configuration environment variables");
      throw new Error("Missing Redis configuration");
    }

    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 3000),
      },
    });

    // Test connection on startup
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.client.ping();
      logger.info("Connected to Upstash Redis");
    } catch (error) {
      logger.error("Redis Connection Error:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const lockKey = `lock:${key}`;
      const result = await this.client.setnx(lockKey, Date.now().toString());

      if (result === 1) {
        await this.client.expire(lockKey, ttlSeconds);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error acquiring lock for ${key}:`, error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      await this.delete(`lock:${key}`);
    } catch (error) {
      logger.error(`Error releasing lock for ${key}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  // Active positions management
  async setActivePosition(botId: string, position: any): Promise<void> {
    try {
      const key = `${ACTIVE_POSITIONS_KEY}:${botId}`;
      await this.set(key, JSON.stringify(position));
    } catch (error) {
      logger.error(`Error setting active position for bot ${botId}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async getActivePositions(): Promise<Record<string, any>> {
    try {
      const pattern = `${ACTIVE_POSITIONS_KEY}:*`;
      const keys = await this.client.keys(pattern);
      const positions: Record<string, any> = {};

      for (const key of keys) {
        const value = await this.get(key);
        if (value) {
          const botId = key.split(":")[1];
          positions[botId] = JSON.parse(value);
        }
      }

      return positions;
    } catch (error) {
      logger.error("Error getting active positions:", error instanceof Error ? error.message : "Unknown error");
      return {};
    }
  }

  async removeActivePosition(botId: string): Promise<void> {
    try {
      const key = `${ACTIVE_POSITIONS_KEY}:${botId}`;
      await this.delete(key);
    } catch (error) {
      logger.error(`Error removing active position for bot ${botId}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  // Position metadata management
  async setPositionMetadata(botId: string, metadata: PositionMetadata): Promise<void> {
    try {
      const key = `${POSITION_METADATA_KEY}:${botId}`;
      await this.set(key, JSON.stringify(metadata));
    } catch (error) {
      logger.error(`Error setting position metadata for bot ${botId}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async getPositionMetadata(botId: string): Promise<PositionMetadata | null> {
    try {
      const key = `${POSITION_METADATA_KEY}:${botId}`;
      const value = await this.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting position metadata for bot ${botId}:`, error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  async removePositionMetadata(botId: string): Promise<void> {
    try {
      const key = `${POSITION_METADATA_KEY}:${botId}`;
      await this.delete(key);
    } catch (error) {
      logger.error(`Error removing position metadata for bot ${botId}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }
}
