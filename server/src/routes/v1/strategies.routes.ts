import { Router } from "express";
import { validateAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { RAGService } from "../../services/ai/rag/rag.service";
import { createLogger } from "../../utils/logger";
import { prisma } from "../../lib/prisma";

const router = Router();
const logger = createLogger("strategy-routes");
const ragService = new RAGService();

// Get all strategies
router.get("/", validateAuth, async (req, res) => {
  try {
    const strategies = await prisma.strategy.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: strategies,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching strategies",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({
      success: false,
      error: {
        code: "STRATEGY_FETCH_ERROR",
        message: "Failed to fetch strategies",
      },
    });
  }
});

// Add new strategy (admin only)
router.post("/", validateAuth, async (req, res) => {
  try {
    const { name, description, rules, timeframes, riskParameters } = req.body;

    // Add strategy to RAG system
    await ragService.addStrategyToRAG(name, description, rules, timeframes, riskParameters);

    res.json({
      success: true,
      message: "Strategy added successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error adding strategy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({
      success: false,
      error: {
        code: "STRATEGY_CREATE_ERROR",
        message: "Failed to create strategy",
      },
    });
  }
});

// Create bot instance
router.post("/bot", validateAuth, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).auth.userId;
    const { strategyId, pair, timeframe, riskSettings } = req.body;

    const botInstance = await prisma.botInstance.create({
      data: {
        userId,
        strategyId,
        pair,
        timeframe,
        riskSettings,
        isActive: true,
      },
      include: {
        strategy: true,
      },
    });

    res.json({
      success: true,
      data: botInstance,
    });
  } catch (error) {
    logger.error({
      message: "Error creating bot instance",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({
      success: false,
      error: {
        code: "BOT_CREATE_ERROR",
        message: "Failed to create bot instance",
      },
    });
  }
});

// Get user's bot instances
router.get("/bots", validateAuth, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).auth.userId;

    const bots = await prisma.botInstance.findMany({
      where: { userId },
      include: {
        strategy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: bots,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching bot instances",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({
      success: false,
      error: {
        code: "BOT_FETCH_ERROR",
        message: "Failed to fetch bot instances",
      },
    });
  }
});

// Update bot instance
router.patch("/bots/:botId", validateAuth, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).auth.userId;
    const { botId } = req.params;
    const { riskSettings, isActive } = req.body;

    const bot = await prisma.botInstance.update({
      where: {
        id: botId,
        userId, // Ensure user owns the bot
      },
      data: {
        riskSettings: riskSettings !== undefined ? riskSettings : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        strategy: true,
      },
    });

    res.json({
      success: true,
      data: bot,
    });
  } catch (error) {
    logger.error({
      message: "Error updating bot instance",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({
      success: false,
      error: {
        code: "BOT_UPDATE_ERROR",
        message: "Failed to update bot instance",
      },
    });
  }
});

// Delete bot instance
router.delete("/bots/:botId", validateAuth, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).auth.userId;
    const { botId } = req.params;

    await prisma.botInstance.delete({
      where: {
        id: botId,
        userId, // Ensure user owns the bot
      },
    });

    res.json({
      success: true,
      message: "Bot instance deleted successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error deleting bot instance",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({
      success: false,
      error: {
        code: "BOT_DELETE_ERROR",
        message: "Failed to delete bot instance",
      },
    });
  }
});

export default router;
