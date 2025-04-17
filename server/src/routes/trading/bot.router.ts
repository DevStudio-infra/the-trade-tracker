import { Router } from "express";
import { AutomatedTradingService } from "../../services/trading/automated-trading.service";
import { validateRequest } from "../../middleware/validation.middleware";
import { z } from "zod";
import { createLogger } from "../../utils/logger";
import { validateAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { prisma } from "../../lib/prisma";
import { RequestHandler } from "express";
import { RiskManagementService } from "../../services/trading/risk-management.service";
import { TradeExecutionService } from "../../services/trading/trade-execution.service";
import { ChartGeneratorService } from "../../services/chart/chart-generator.service";
import { AIService } from "../../services/ai/ai.service";
import { RedisService } from "../../services/redis/redis.service";

const logger = createLogger("bot-router");
const router = Router();

// Initialize required services
const riskManagementService = new RiskManagementService();
const tradeExecutionService = new TradeExecutionService();
const chartGeneratorService = new ChartGeneratorService();
const aiService = new AIService();
const redisService = new RedisService();

const tradingService = new AutomatedTradingService(riskManagementService, tradeExecutionService, chartGeneratorService, aiService, redisService);

// Schema for creating a new bot
const createBotSchema = z.object({
  strategyId: z.string().uuid(),
  pair: z.string(),
  timeframe: z.string(),
  riskSettings: z.object({
    maxPositionSize: z.number().min(0.1).max(100).optional(),
    maxDailyLoss: z.number().min(0.1).max(10).optional(),
    maxDrawdown: z.number().min(1).max(50).optional(),
    stopLossPercent: z.number().min(0.1).max(5).optional(),
    takeProfitRatio: z.number().min(1).max(10).optional(),
    maxRiskPerTrade: z.number().min(0.1).max(100).optional(),
  }),
  brokerCredentialId: z.string().uuid(),
});

// Create new bot
const createBot: RequestHandler = async (req, res) => {
  try {
    const validatedData = createBotSchema.parse(req.body);
    const config = {
      userId: (req as AuthenticatedRequest).auth.userId,
      ...validatedData,
    };

    const bot = await tradingService.createBot(config);
    res.status(201).json(bot);
  } catch (error) {
    logger.error({
      message: "Error creating bot",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: (req as AuthenticatedRequest).auth.userId,
    });
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create bot" });
  }
};

// Stop and delete bot
const deleteBot: RequestHandler = async (req, res) => {
  try {
    await tradingService.stopBot(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error({
      message: "Error deleting bot",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: (req as AuthenticatedRequest).auth.userId,
      botId: req.params.id,
    });
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to delete bot" });
  }
};

// Get all bots status
const getAllBotsStatus: RequestHandler = async (req, res) => {
  try {
    const bots = await prisma.botInstance.findMany({
      where: { userId: (req as AuthenticatedRequest).auth.userId },
      orderBy: { createdAt: "desc" },
    });

    const statuses = await Promise.all(bots.map((bot) => tradingService.getBotStatus(bot.id)));

    res.json(statuses);
  } catch (error) {
    logger.error({
      message: "Error getting bot statuses",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: (req as AuthenticatedRequest).auth.userId,
    });
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get bot statuses" });
  }
};

// Get specific bot details
const getBotDetails: RequestHandler = async (req, res) => {
  try {
    const status = await tradingService.getBotStatus(req.params.id);
    res.json(status);
  } catch (error) {
    logger.error({
      message: "Error getting bot details",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: (req as AuthenticatedRequest).auth.userId,
      botId: req.params.id,
    });
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get bot details" });
  }
};

// Get bot logs
const getBotLogs: RequestHandler = async (req, res) => {
  try {
    const logs = await prisma.aIEvaluation.findMany({
      where: {
        botInstanceId: req.params.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    res.json(logs);
  } catch (error) {
    logger.error({
      message: "Error getting bot logs",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: (req as AuthenticatedRequest).auth.userId,
      botId: req.params.id,
    });
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get bot logs" });
  }
};

// Start bot
const startBot: RequestHandler = async (req, res) => {
  try {
    await tradingService.startBot(req.params.id);
    const status = await tradingService.getBotStatus(req.params.id);
    res.json(status);
  } catch (error) {
    logger.error({
      message: "Error starting bot",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: (req as AuthenticatedRequest).auth.userId,
      botId: req.params.id,
    });
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to start bot" });
  }
};

// Stop bot
const stopBot: RequestHandler = async (req, res) => {
  try {
    await tradingService.stopBot(req.params.id);
    const status = await tradingService.getBotStatus(req.params.id);
    res.json(status);
  } catch (error) {
    logger.error({
      message: "Error stopping bot",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: (req as AuthenticatedRequest).auth.userId,
      botId: req.params.id,
    });
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to stop bot" });
  }
};

// Register routes
router.post("/", validateAuth, validateRequest(createBotSchema), createBot);
router.delete("/:id", validateAuth, deleteBot);
router.get("/status", validateAuth, getAllBotsStatus);
router.get("/:id", validateAuth, getBotDetails);
router.get("/:id/logs", validateAuth, getBotLogs);
router.post("/:id/start", validateAuth, startBot);
router.post("/:id/stop", validateAuth, stopBot);

export default router;
