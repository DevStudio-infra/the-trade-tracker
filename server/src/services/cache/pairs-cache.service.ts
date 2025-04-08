import { redis, TTL } from "../../config/redis.config";
import { createLogger } from "../../utils/logger";
import { PrismaClient } from "@prisma/client";

const logger = createLogger("pairs-cache-service");

export interface TradingPair {
  symbol: string;
  displayName: string;
  type: string;
  category: string;
  isActive: boolean;
}

export class PairsCacheService {
  private readonly PAIRS_KEY_PREFIX = "trading:pairs";
  private readonly CATEGORY_KEY_PREFIX = "trading:category";
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private getCategoryKey(category: string): string {
    return `${this.CATEGORY_KEY_PREFIX}:${category.toLowerCase()}`;
  }

  async getPairsByCategory(category: string): Promise<TradingPair[]> {
    try {
      // Try to get from cache first
      const cacheKey = this.getCategoryKey(category);
      logger.debug(`Attempting to get pairs from cache for category ${category} with key ${cacheKey}`);

      const cachedData = await redis.get<string>(cacheKey);

      if (cachedData) {
        logger.info(`Cache hit for category ${category}`);
        try {
          const parsedData = JSON.parse(cachedData);
          if (!Array.isArray(parsedData)) {
            logger.error(`Invalid cache data format for category ${category}. Expected array, got:`, typeof parsedData);
            // Invalid cache data, clear it
            await redis.del(cacheKey);
            return this.fetchFromDatabase(category);
          }
          return parsedData;
        } catch (parseError) {
          logger.error(`Error parsing cached data for category ${category}:`, parseError instanceof Error ? parseError.message : "Unknown error");
          // Invalid cache data, clear it
          await redis.del(cacheKey);
          return this.fetchFromDatabase(category);
        }
      }

      return this.fetchFromDatabase(category);
    } catch (error) {
      logger.error(`Error getting pairs for category ${category}:`, error instanceof Error ? error.message : "Unknown error");
      return [];
    }
  }

  private async fetchFromDatabase(category: string): Promise<TradingPair[]> {
    try {
      logger.info(`Cache miss for category ${category}, fetching from database`);

      // Check database connection first
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (dbError) {
        logger.error(`Database connection error for category ${category}:`, dbError instanceof Error ? dbError.message : "Unknown error");
        throw new Error("Database connection failed");
      }

      const pairs = await this.prisma.capitalComPair.findMany({
        where: {
          category: category,
          isActive: true,
        },
        select: {
          symbol: true,
          displayName: true,
          type: true,
          category: true,
          isActive: true,
        },
      });

      logger.debug(`Found ${pairs.length} pairs in database for category ${category}`);

      // Cache the results
      await this.cachePairsByCategory(category, pairs);

      return pairs;
    } catch (error) {
      logger.error(`Error fetching from database for category ${category}:`, error instanceof Error ? error.message : "Unknown error");
      throw error; // Propagate error to main handler
    }
  }

  async searchPairs(query: string): Promise<TradingPair[]> {
    try {
      const searchTerm = query.toLowerCase();
      logger.debug(`Searching pairs with term: ${searchTerm}`);

      // Search in database
      const pairs = await this.prisma.capitalComPair.findMany({
        where: {
          isActive: true,
          OR: [
            { symbol: { contains: searchTerm, mode: "insensitive" } },
            { displayName: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          symbol: true,
          displayName: true,
          type: true,
          category: true,
          isActive: true,
        },
        take: 50, // Limit results
      });

      logger.debug(`Found ${pairs.length} pairs matching search term: ${searchTerm}`);
      return pairs;
    } catch (error) {
      logger.error(`Error searching pairs with query ${query}:`, error instanceof Error ? error.message : "Unknown error");
      return [];
    }
  }

  private async cachePairsByCategory(category: string, pairs: TradingPair[]): Promise<void> {
    try {
      const cacheKey = this.getCategoryKey(category);
      const data = JSON.stringify(pairs);
      logger.debug(`Caching ${pairs.length} pairs for category ${category} with key ${cacheKey}`);

      const result = await redis.setex(cacheKey, TTL["1h"], data);
      if (result === "OK") {
        logger.info(`Successfully cached ${pairs.length} pairs for category ${category}`);
      } else {
        logger.error(`Failed to cache pairs for category ${category}, Redis returned:`, result);
      }
    } catch (error) {
      logger.error(`Error caching pairs for category ${category}:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async refreshAllCategories(): Promise<void> {
    try {
      logger.info("Starting refresh of all categories");

      // Get all categories
      const categories = await this.prisma.capitalComPair.findMany({
        select: { category: true },
        distinct: ["category"],
        where: { isActive: true },
      });

      logger.debug(`Found ${categories.length} categories to refresh`);

      // Refresh cache for each category
      await Promise.all(
        categories.map(async ({ category }) => {
          try {
            const pairs = await this.getPairsByCategory(category);
            await this.cachePairsByCategory(category, pairs);
          } catch (error) {
            logger.error(`Error refreshing category ${category}:`, error instanceof Error ? error.message : "Unknown error");
          }
        })
      );

      logger.info(`Successfully refreshed cache for ${categories.length} categories`);
    } catch (error) {
      logger.error("Error refreshing categories cache:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async clearCache(): Promise<void> {
    try {
      // Get all category keys
      const pattern = `${this.CATEGORY_KEY_PREFIX}:*`;
      logger.debug(`Getting all cache keys with pattern: ${pattern}`);

      const keys = await redis.keys(pattern);
      logger.debug(`Found ${keys.length} keys to clear`);

      // Delete each key individually since our wrapper doesn't support multi-key deletion
      for (const key of keys) {
        try {
          await redis.del(key);
          logger.debug(`Successfully deleted key: ${key}`);
        } catch (error) {
          logger.error(`Error deleting key ${key}:`, error instanceof Error ? error.message : "Unknown error");
        }
      }

      logger.info(`Successfully cleared cache for ${keys.length} categories`);
    } catch (error) {
      logger.error("Error clearing pairs cache:", error instanceof Error ? error.message : "Unknown error");
    }
  }
}
