import { redis, TTL, REDIS_KEYS } from "../../../config/redis.config";
import { Candle } from "../interfaces/types";
import { createLogger } from "../../../utils/logger";
import { IBroker } from "../interfaces/broker.interface";

const logger = createLogger("candle-service");

export class CandleService {
  constructor(private readonly broker: IBroker) {}

  async getCachedCandles(symbol: string, timeframe: keyof typeof TTL): Promise<Candle[] | null> {
    try {
      const key = REDIS_KEYS.CANDLES(symbol, timeframe);
      const data = await redis.get<string>(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error({
        message: "Error fetching cached candles",
        error: error instanceof Error ? error.message : "Unknown error",
        symbol,
        timeframe,
      });
      return null;
    }
  }

  async setCachedCandles(symbol: string, timeframe: keyof typeof TTL, candles: Candle[]): Promise<void> {
    try {
      const key = REDIS_KEYS.CANDLES(symbol, timeframe);
      await redis.setex(key, TTL[timeframe], JSON.stringify(candles));

      logger.info({
        message: "Candles cached successfully",
        symbol,
        timeframe,
        count: candles.length,
      });
    } catch (error) {
      logger.error({
        message: "Error caching candles",
        error: error instanceof Error ? error.message : "Unknown error",
        symbol,
        timeframe,
      });
    }
  }

  async getCandles(symbol: string, timeframe: keyof typeof TTL, forceRefresh = false): Promise<Candle[]> {
    try {
      // Try to get from cache first
      if (!forceRefresh) {
        const cachedCandles = await this.getCachedCandles(symbol, timeframe);
        if (cachedCandles) {
          logger.info({
            message: "Retrieved candles from cache",
            symbol,
            timeframe,
            count: cachedCandles.length,
          });
          return cachedCandles;
        }
      }

      // Fetch from broker if not in cache or force refresh
      const candles = await this.broker.getCandles(symbol, timeframe, 200);

      // Cache the new candles
      await this.setCachedCandles(symbol, timeframe, candles);

      return candles;
    } catch (error) {
      logger.error({
        message: "Error fetching candles",
        error: error instanceof Error ? error.message : "Unknown error",
        symbol,
        timeframe,
      });
      throw error;
    }
  }

  async updateCandles(symbol: string, timeframe: keyof typeof TTL): Promise<void> {
    try {
      // Get latest candle from broker
      const latestCandle = await this.broker.getCandles(symbol, timeframe, 1);

      // Get existing candles from cache
      const existingCandles = (await this.getCachedCandles(symbol, timeframe)) || [];

      if (existingCandles.length > 0) {
        // Remove oldest candle if we have 200 candles
        if (existingCandles.length >= 200) {
          existingCandles.shift();
        }

        // Add new candle
        existingCandles.push(latestCandle[0]);

        // Update cache
        await this.setCachedCandles(symbol, timeframe, existingCandles);

        logger.info({
          message: "Candles updated successfully",
          symbol,
          timeframe,
          totalCandles: existingCandles.length,
        });
      } else {
        // If no existing candles, fetch full history
        await this.getCandles(symbol, timeframe, true);
      }
    } catch (error) {
      logger.error({
        message: "Error updating candles",
        error: error instanceof Error ? error.message : "Unknown error",
        symbol,
        timeframe,
      });
      throw error;
    }
  }

  async getMultiTimeframeCandles(symbol: string, timeframes: Array<keyof typeof TTL>): Promise<Record<string, Candle[]>> {
    try {
      const results: Record<string, Candle[]> = {};

      await Promise.all(
        timeframes.map(async (timeframe) => {
          results[timeframe] = await this.getCandles(symbol, timeframe);
        })
      );

      return results;
    } catch (error) {
      logger.error({
        message: "Error fetching multi-timeframe candles",
        error: error instanceof Error ? error.message : "Unknown error",
        symbol,
        timeframes,
      });
      throw error;
    }
  }
}
