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
    const userId = (req as AuthenticatedRequest).auth.userId;

    const strategies = await prisma.strategy.findMany({
      where: {
        OR: [
          { userId }, // User's own strategies
          { isActive: true, isPublic: true }, // Public strategies that are active
        ],
      },
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

// Get strategy by ID
router.get("/:id", validateAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: {
          code: "STRATEGY_NOT_FOUND",
          message: "Strategy not found",
        },
      });
    }

    res.json({
      success: true,
      data: strategy,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching strategy",
      error: error instanceof Error ? error.message : "Unknown error",
      strategyId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        code: "STRATEGY_FETCH_ERROR",
        message: "Failed to fetch strategy",
      },
    });
  }
});

// Add new strategy (admin only)
router.post("/", validateAuth, async (req, res) => {
  try {
    const { name, description, rules, timeframes, riskParameters, isPublic = false } = req.body;
    const userId = (req as AuthenticatedRequest).auth.userId;

    // Create strategy directly with Prisma instead of using RAG
    const strategy = await prisma.strategy.create({
      data: {
        name,
        description,
        rules: rules as any,
        timeframes: timeframes,
        riskParameters: riskParameters as any,
        isActive: true,
        isPublic,
        userId,
      },
    });

    // Log successful creation
    logger.info({
      message: "Strategy created successfully",
      strategyId: strategy.id,
      userId,
    });

    res.json({
      success: true,
      message: "Strategy added successfully",
      data: strategy,
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

// Update strategy
router.patch("/:id", validateAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, rules, timeframes, riskParameters, isActive, isPublic } = req.body;
    const userId = (req as AuthenticatedRequest).auth.userId;

    // Check if strategy exists and belongs to user
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!existingStrategy) {
      return res.status(404).json({
        success: false,
        error: {
          code: "STRATEGY_NOT_FOUND",
          message: "Strategy not found",
        },
      });
    }

    // Check if user owns the strategy or if it's a public strategy
    if (existingStrategy.userId !== userId && !existingStrategy.isPublic) {
      return res.status(403).json({
        success: false,
        error: {
          code: "STRATEGY_UNAUTHORIZED",
          message: "You do not have permission to update this strategy",
        },
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (rules !== undefined) updateData.rules = rules;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Handle timeframes array if provided
    if (timeframes !== undefined) {
      updateData.timeframes = timeframes;
    }

    // Handle risk parameters if provided
    if (riskParameters !== undefined) {
      updateData.riskParameters = riskParameters;
    }

    // Update strategy
    const updatedStrategy = await prisma.strategy.update({
      where: { id },
      data: updateData,
    });

    // Log successful update
    logger.info({
      message: "Strategy updated successfully",
      strategyId: id,
      userId,
    });

    res.json({
      success: true,
      data: updatedStrategy,
      message: "Strategy updated successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error updating strategy",
      error: error instanceof Error ? error.message : "Unknown error",
      strategyId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        code: "STRATEGY_UPDATE_ERROR",
        message: "Failed to update strategy",
      },
    });
  }
});

// Delete strategy
router.delete("/:id", validateAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).auth.userId;

    // Check if strategy exists
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!existingStrategy) {
      return res.status(404).json({
        success: false,
        error: {
          code: "STRATEGY_NOT_FOUND",
          message: "Strategy not found",
        },
      });
    }

    // Check if any bot instances use this strategy
    const botCount = await prisma.botInstance.count({
      where: { strategyId: id },
    });

    if (botCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "STRATEGY_IN_USE",
          message: "Cannot delete strategy as it's being used by one or more bots",
        },
      });
    }

    // Delete strategy directly
    await prisma.strategy.delete({
      where: { id },
    });

    // Log successful deletion
    logger.info({
      message: "Strategy deleted successfully",
      strategyId: id,
      userId,
    });

    res.json({
      success: true,
      message: "Strategy deleted successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error deleting strategy",
      error: error instanceof Error ? error.message : "Unknown error",
      strategyId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        code: "STRATEGY_DELETE_ERROR",
        message: "Failed to delete strategy",
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

export default router;
