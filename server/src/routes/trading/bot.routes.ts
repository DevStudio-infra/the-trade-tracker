import { Router } from "express";
import { AutomatedTradingService } from "../../services/trading/automated-trading.service";
import { validateRequest } from "../../middleware/validate-request";
import { z } from "zod";
import { authenticateUser } from "../../middleware/auth";
import { createLogger } from "../../utils/logger";
import { AIService } from "../../services/ai/ai.service";
import { ChartAnalysisService } from "../../services/ai/chart-analysis.service";
import { StorageService } from "../../services/storage/storage.service";
import { CapitalService } from "../../services/broker/capital-com/capital.service";
import { prisma } from "../../lib/prisma";
import { BotInstance, Prisma } from "@prisma/client";
import { Position } from "../../services/broker/interfaces/types";

const logger = createLogger("bot-routes");
const router = Router();

// Initialize required services
const aiService = new AIService();
const chartAnalysisService = new ChartAnalysisService();
const storageService = new StorageService();

interface BotConfig {
  pair: string;
  timeframe: string;
  strategyId: string;
  riskSettings: {
    maxRiskPerTrade: number;
    maxPositions?: number;
    maxDrawdown?: number;
    symbols?: string[];
  };
}

interface BotWithStrategy extends BotInstance {
  strategy: {
    id: string;
    riskParameters: Prisma.JsonValue;
  };
}

interface BotStatus {
  isActive: boolean;
  lastCheck: Date | null;
  lastTrade: Date | null;
  positions?: Position[];
  dailyStats: {
    tradesExecuted: number;
    winRate: number;
    profitLoss: number;
  };
  errors: string[];
}

/**
 * Convert bot instance to bot config
 */
function convertBotToConfig(bot: BotWithStrategy): BotConfig {
  const riskParameters = bot.strategy.riskParameters as {
    maxPositions?: number;
    maxRiskPerTrade?: number;
    maxDrawdown?: number;
    symbols?: string[];
  } | null;

  return {
    pair: bot.pair,
    timeframe: bot.timeframe,
    strategyId: bot.strategyId,
    riskSettings: {
      maxRiskPerTrade: riskParameters?.maxRiskPerTrade ?? 2,
      maxPositions: riskParameters?.maxPositions,
      maxDrawdown: riskParameters?.maxDrawdown,
      symbols: riskParameters?.symbols,
    },
  };
}

/**
 * Initialize trading service for a bot
 */
async function initializeTradingService(userId: string, botConfig: BotConfig): Promise<AutomatedTradingService> {
  // Get user's broker credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      broker_credentials: {
        where: { broker_name: "CAPITAL" },
      },
    },
  });

  if (!user?.broker_credentials?.[0]) {
    throw new Error("No Capital.com credentials found");
  }

  const credentials = user.broker_credentials[0].credentials as {
    apiKey: string;
    apiSecret: string;
    isDemo: boolean;
  };

  // Initialize broker service with user's credentials
  const userBroker = new CapitalService({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    isDemo: credentials.isDemo,
    timeout: 30000,
  });

  // Initialize trading service with user's broker
  const tradingService = new AutomatedTradingService(userBroker, aiService, chartAnalysisService, {
    maxPositions: botConfig.riskSettings?.maxPositions ?? 5,
    maxRiskPerTrade: botConfig.riskSettings.maxRiskPerTrade,
    maxDrawdown: botConfig.riskSettings?.maxDrawdown ?? 10,
    timeframes: [botConfig.timeframe],
    symbols: botConfig.riskSettings?.symbols ?? [botConfig.pair],
  });

  // Connect to broker
  await userBroker.connect();

  return tradingService;
}

// Validation schemas
const createBotSchema = z.object({
  pair: z.string(),
  timeframe: z.string(),
  strategyId: z.string(),
  riskSettings: z.object({
    maxRiskPerTrade: z.number(),
    maxPositions: z.number().optional(),
    maxDrawdown: z.number().optional(),
    symbols: z.array(z.string()).optional(),
  }),
  brokerCredentialId: z.string(),
});

// Create new bot
router.post("/", authenticateUser, validateRequest(createBotSchema), async (req, res) => {
  logger.info("Creating new bot", { userId: req.user?.id, config: req.body });
  try {
    // Ensure user ID is present
    if (!req.user || !req.user.id) {
      logger.error("User ID is missing during bot creation", { user: req.user });
      return res.status(400).json({ error: "User ID is required to create a bot." });
    }
    // Create bot instance in database
    console.log('--- BOT CREATION DEBUG START ---');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    console.log('Request user:', req.user);
    console.log('User ID from req.user:', req.user.id);
    console.log('User ID type:', typeof req.user.id);
    console.log('Strategy ID:', req.body.strategyId);
    console.log('Pair:', req.body.pair);
    console.log('Timeframe:', req.body.timeframe);
    console.log('Risk Settings:', req.body.riskSettings);
    console.log('Broker Credential ID:', req.body.brokerCredentialId);
    console.log('--- BOT CREATION DEBUG END ---');
    const botInstance = await prisma.botInstance.create({
      data: {
        userId: req.user.id,
        strategyId: req.body.strategyId,
        pair: req.body.pair,
        timeframe: req.body.timeframe,
        riskSettings: req.body.riskSettings,
        isActive: true,
        brokerCredentialId: req.body.brokerCredentialId
      },
    });

    // Extra debug: log created bot instance
    console.log('Created botInstance:', botInstance);

    // Initialize trading service
    const tradingService = await initializeTradingService(req.user.id, req.body);

    // Start the trading service
    await tradingService.start();

    logger.info("Bot created successfully", { botId: botInstance.id });
    res.status(201).json(botInstance);
  } catch (error) {
    logger.error("Error creating bot:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId: req.user?.id,
      config: req.body
    });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create bot" });
  }
});

// Get all bots for a user
router.get("/all", authenticateUser, async (req, res) => {
  logger.info("Fetching all bots for user", { userId: req.user?.id });
  try {
    const bots = await prisma.botInstance.findMany({
      where: { userId: req.user!.id },
      include: {
        strategy: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(bots);
  } catch (error) {
    logger.error("Error fetching all bots:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId: req.user?.id
    });
    res.status(500).json({ error: "Failed to fetch bots" });
  }
});

// Get specific bot
router.get("/:id", authenticateUser, async (req, res) => {
  logger.info("Fetching specific bot", { userId: req.user?.id, botId: req.params.id });
  try {
    // Get bot details
    const bot = await prisma.botInstance.findUnique({
      where: { id: req.params.id },
      include: {
        strategy: true,
        trades: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!bot) {
      logger.warn("Bot not found", { userId: req.user?.id, botId: req.params.id });
      return res.status(404).json({ error: "Bot not found" });
    }

    // If bot is active, get its current status
    const status: BotStatus = {
      isActive: bot.isActive,
      lastCheck: null,
      lastTrade: bot.trades[0]?.createdAt ?? null,
      dailyStats: {
        tradesExecuted: 0,
        winRate: 0,
        profitLoss: 0,
      },
      errors: [],
    };

    if (bot.isActive) {
      try {
        // Initialize trading service
        const tradingService = await initializeTradingService(req.user!.id, convertBotToConfig(bot as BotWithStrategy));

        // Get current positions from broker
        const positions = await tradingService.getPositions();

        // Update status with current positions
        status.positions = positions;
        status.lastCheck = new Date();
      } catch (error) {
        logger.error("Error getting bot status:", {
          error: error instanceof Error ? error.stack || error.message : error,
          userId: req.user?.id,
          botId: req.params.id
        });
        status.errors = [error instanceof Error ? error.message : "Failed to get bot status"];
      }
    }

    logger.info("Bot fetched successfully", { userId: req.user?.id, botId: req.params.id });
    res.json({
      ...bot,
      status,
    });
  } catch (error) {
    logger.error("Error fetching bot:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId: req.user?.id,
      botId: req.params.id
    });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch bot" });
  }
});

// Start a bot
router.post("/:id/start", authenticateUser, async (req, res) => {
  const botId = req.params.id;
  logger.info("Starting bot", { userId: req.user?.id, botId });
  try {
    // Get bot details
    const bot = await prisma.botInstance.findUnique({
      where: { id: botId },
      include: {
        strategy: true,
      },
    });

    if (!bot) {
      throw new Error("Bot not found");
    }

    // Initialize trading service
    const tradingService = await initializeTradingService(req.user!.id, convertBotToConfig(bot as BotWithStrategy));

    // Start the trading service
    await tradingService.start();

    // Update bot status
    const updatedBot = await prisma.botInstance.update({
      where: { id: botId },
      data: { isActive: true },
    });

    logger.info("Bot started successfully", { userId: req.user?.id, botId });
    res.status(200).json(updatedBot);
  } catch (error) {
    logger.error("Error starting bot:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId: req.user?.id,
      botId
    });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start bot" });
  }
});

// Stop a bot
router.post("/:id/stop", authenticateUser, async (req, res) => {
  const botId = req.params.id;
  logger.info("Stopping bot", { userId: req.user?.id, botId });
  try {
    // Get bot details
    const bot = await prisma.botInstance.findUnique({
      where: { id: botId },
      include: {
        strategy: true,
      },
    });

    if (!bot) {
      throw new Error("Bot not found");
    }

    // Initialize trading service
    const tradingService = await initializeTradingService(req.user!.id, convertBotToConfig(bot as BotWithStrategy));

    // Stop the trading service
    await tradingService.stop();

    // Update bot status
    const updatedBot = await prisma.botInstance.update({
      where: { id: botId },
      data: { isActive: false },
    });

    logger.info("Bot stopped successfully", { userId: req.user?.id, botId });
    res.status(200).json(updatedBot);
  } catch (error) {
    logger.error("Error stopping bot:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId: req.user?.id,
      botId
    });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to stop bot" });
  }
});

// Delete/stop bot
router.delete("/:id", authenticateUser, async (req, res) => {
  logger.info("Deleting bot", { userId: req.user?.id, botId: req.params.id });
  try {
    // Get bot details
    const bot = await prisma.botInstance.findUnique({
      where: { id: req.params.id },
      include: {
        strategy: true,
      },
    });

    if (!bot) {
      throw new Error("Bot not found");
    }

    // Initialize trading service
    const tradingService = await initializeTradingService(req.user!.id, convertBotToConfig(bot as BotWithStrategy));

    // Stop the trading service
    await tradingService.stop();

    // Delete bot instance
    await prisma.botInstance.delete({
      where: { id: req.params.id },
    });

    logger.info("Bot deleted successfully", { userId: req.user?.id, botId: req.params.id });
    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting bot:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId: req.user?.id,
      botId: req.params.id
    });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete bot" });
  }
});

// Get bot logs
router.get("/:id/logs", authenticateUser, async (req, res) => {
  logger.info("Fetching bot logs", { userId: req.user?.id, botId: req.params.id });
  try {
    // Get bot details
    const bot = await prisma.botInstance.findUnique({
      where: { id: req.params.id },
      include: {
        strategy: true,
      },
    });

    if (!bot) {
      throw new Error("Bot not found");
    }

    // Initialize trading service
    const tradingService = await initializeTradingService(req.user!.id, convertBotToConfig(bot as BotWithStrategy));

    // Get logs
    const logs = await tradingService.getBotLogs(req.params.id);
    logger.info("Bot logs fetched successfully", { userId: req.user?.id, botId: req.params.id, logsCount: logs.length });
    res.json(logs);
  } catch (error) {
    logger.error("Error fetching bot logs:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId: req.user?.id,
      botId: req.params.id
    });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch bot logs" });
  }
});

export default router;
