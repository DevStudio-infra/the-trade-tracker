import { PrismaClient, CapitalComPair } from "@prisma/client";
import redis from "../redis/client";
import { createLogger } from "../../utils/logger";

const logger = createLogger("pairs-cache-service");

export class PairsCacheService {
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get pairs by category with caching
   */
  async getPairsByCategory(category: string): Promise<CapitalComPair[]> {
    const cacheKey = `capital:pairs:${category}`;

    try {
      // Try Redis first
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }

      logger.debug(`Cache miss for ${cacheKey}, fetching from database`);

      // Cache miss - get from Prisma
      const pairs = await this.prisma.capitalComPair.findMany({
        where: {
          category,
          isActive: true,
        },
        orderBy: {
          displayName: "asc",
        },
      });

      // Update cache
      await this.setCache(cacheKey, pairs);

      return pairs;
    } catch (error) {
      logger.error(`Error getting pairs for category ${category}:`, error);

      // Fallback to database if cache fails
      return this.prisma.capitalComPair.findMany({
        where: {
          category,
          isActive: true,
        },
        orderBy: {
          displayName: "asc",
        },
      });
    }
  }

  /**
   * Search pairs across all categories
   */
  async searchPairs(query: string): Promise<CapitalComPair[]> {
    const cacheKey = `capital:search:${query.toLowerCase()}`;

    try {
      // Try Redis first
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for search: ${query}`);
        return JSON.parse(cached);
      }

      logger.debug(`Cache miss for search: ${query}, fetching from database`);

      // Cache miss - get from Prisma
      const pairs = await this.prisma.capitalComPair.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [{ symbol: { contains: query, mode: "insensitive" } }, { displayName: { contains: query, mode: "insensitive" } }],
            },
          ],
        },
        orderBy: { displayName: "asc" },
      });

      // Cache search results for a shorter period (1 day)
      await this.setCache(cacheKey, pairs, 24 * 60 * 60);

      return pairs;
    } catch (error) {
      logger.error(`Error searching pairs for query ${query}:`, error);

      // Fallback to database if cache fails
      return this.prisma.capitalComPair.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [{ symbol: { contains: query, mode: "insensitive" } }, { displayName: { contains: query, mode: "insensitive" } }],
            },
          ],
        },
        orderBy: { displayName: "asc" },
      });
    }
  }

  /**
   * Refresh the cache for a specific category
   */
  async refreshCategory(category: string): Promise<void> {
    logger.info(`Refreshing cache for category: ${category}`);

    try {
      const pairs = await this.prisma.capitalComPair.findMany({
        where: {
          category,
          isActive: true,
        },
      });

      await this.setCache(`capital:pairs:${category}`, pairs);
      logger.info(`Cache refreshed for ${category} with ${pairs.length} pairs`);
    } catch (error) {
      logger.error(`Error refreshing cache for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Refresh all categories in the cache
   */
  async refreshAllCategories(): Promise<void> {
    logger.info("Refreshing cache for all categories");

    try {
      // Get all distinct categories
      const categories = await this.prisma.capitalComPair.findMany({
        select: { category: true },
        distinct: ["category"],
      });

      // Refresh each category
      for (const { category } of categories) {
        await this.refreshCategory(category);
      }

      logger.info(`Cache refreshed for all ${categories.length} categories`);
    } catch (error) {
      logger.error("Error refreshing all categories:", error);
      throw error;
    }
  }

  /**
   * Helper method to set cache with error handling
   */
  private async setCache(key: string, data: any, duration = this.CACHE_DURATION): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(data), "EX", duration);
      logger.debug(`Cache set for ${key} with expiration ${duration}s`);
    } catch (error) {
      logger.error(`Error setting cache for ${key}:`, error);
      // Don't throw, just log the error
    }
  }
}
