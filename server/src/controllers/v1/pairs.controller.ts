import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createLogger } from "../../utils/logger";
import { PairsCacheService } from "../../services/cache/pairs-cache.service";

const logger = createLogger("pairs-controller");
const prisma = new PrismaClient();
const pairsCache = new PairsCacheService(prisma);

/**
 * Get pairs by category
 */
export async function getPairsByCategory(req: Request, res: Response) {
  const { category } = req.params;

  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }

  try {
    logger.info(`Getting pairs for category: ${category}`);
    const pairs = await pairsCache.getPairsByCategory(category);

    return res.status(200).json({
      category,
      count: pairs.length,
      pairs,
    });
  } catch (error) {
    logger.error(`Error getting pairs for category ${category}:`, error);
    return res.status(500).json({ error: "Failed to fetch trading pairs" });
  }
}

/**
 * Search pairs
 */
export async function searchPairs(req: Request, res: Response) {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    logger.info(`Searching pairs with query: ${q}`);
    const pairs = await pairsCache.searchPairs(q);

    return res.status(200).json({
      query: q,
      count: pairs.length,
      pairs,
    });
  } catch (error) {
    logger.error(`Error searching pairs with query ${q}:`, error);
    return res.status(500).json({ error: "Failed to search trading pairs" });
  }
}

/**
 * Get all categories
 */
export async function getCategories(req: Request, res: Response) {
  try {
    logger.info("Getting all categories");

    const categories = await prisma.capitalComPair.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { isActive: true },
    });

    return res.status(200).json({
      count: categories.length,
      categories: categories.map((c) => c.category),
    });
  } catch (error) {
    logger.error("Error getting categories:", error);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
}
