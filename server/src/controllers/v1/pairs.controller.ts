import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createLogger } from "../../utils/logger";
import { PairsCacheService } from "../../services/cache/pairs-cache.service";
import { CapitalPairsValidationService } from "../../services/validation/capital-pairs-validation.service";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

const logger = createLogger("pairs-controller");
const prisma = new PrismaClient();
const pairsCache = new PairsCacheService(prisma);
const validationService = new CapitalPairsValidationService(prisma, pairsCache);

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

/**
 * Manually trigger pair validation (admin only)
 */
export async function validatePairs(req: Request, res: Response) {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;

    // Check if user is an admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscription_plan: true },
    });

    if (!user || user.subscription_plan !== "Pro") {
      logger.warn(`User ${userId} attempted to access admin validation endpoint`);
      return res.status(403).json({ error: "Forbidden - requires Pro subscription" });
    }

    logger.info(`Admin ${userId} triggered manual pairs validation`);

    // Return response immediately while process runs in background
    res.status(202).json({
      message: "Validation process started",
      estimated_time: "2-5 minutes",
    });

    // Run validation asynchronously
    const startTime = Date.now();

    // Execute validation
    try {
      logger.info("Starting validation process");
      await validationService.validatePairs();

      const validationTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`Validation completed in ${validationTime}s, refreshing cache`);

      // Refresh cache
      await pairsCache.refreshAllCategories();

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`Manual validation and cache refresh completed in ${totalTime}s`);
    } catch (error) {
      logger.error("Error during manual validation:", error);
    }
  } catch (error) {
    logger.error("Error handling manual validation request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
