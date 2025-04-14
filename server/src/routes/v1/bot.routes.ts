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
import { decrypt } from "../../utils/encryption.utils";

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
  logger.info("Initializing trading service", { userId, botConfig });

  // Get user's broker credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      broker_credentials: {
        where: {
          broker_name: {
            mode: "insensitive",
            in: ["capital.com", "capital_com", "CAPITAL", "Capital.com"],
          },
          is_active: true,
        },
      },
    },
  });

  // Debug logging for user and credentials
  logger.debug("User and credentials check", {
    userId,
    hasUser: !!user,
    userBrokerCredentialsCount: user?.broker_credentials?.length || 0,
    brokerNames:
      user?.broker_credentials?.map((cred) => ({
        name: cred.broker_name,
        isActive: cred.is_active,
        isDemo: cred.is_demo,
        hasCredentials: !!cred.credentials,
      })) || [],
  });

  if (!user?.broker_credentials?.[0]) {
    logger.error("No Capital.com credentials found", {
      userId,
      hasUser: !!user,
      brokerCredentialsCount: user?.broker_credentials?.length || 0,
    });
    throw new Error("No Capital.com credentials found");
  }

  try {
    const credentials = JSON.parse(decrypt(user.broker_credentials[0].credentials as string));

    logger.debug("Using broker credentials", {
      broker_name: user.broker_credentials[0].broker_name,
      is_demo: user.broker_credentials[0].is_demo,
      hasApiKey: !!credentials.apiKey,
      hasApiSecret: !!credentials.password,
      credentialsKeys: Object.keys(credentials),
    });

    // Initialize broker service with user's credentials
    const userBroker = new CapitalService({
      apiKey: credentials.apiKey,
      apiSecret: credentials.password,
      isDemo: user.broker_credentials[0].is_demo,
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
    try {
      logger.info("Connecting to broker", {
        userId,
        broker: user.broker_credentials[0].broker_name,
        isDemo: user.broker_credentials[0].is_demo,
      });
      await userBroker.connect();
      logger.info("Successfully connected to broker");
    } catch (error) {
      logger.error("Failed to connect to broker", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        broker: user.broker_credentials[0].broker_name,
      });
      throw error;
    }

    return tradingService;
  } catch (error) {
    logger.error("Error initializing trading service", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      broker_name: user.broker_credentials[0].broker_name,
    });
    throw error;
  }
}

async function ensureBrokerCredentials(userId: string): Promise<void> {
  logger.info("Ensuring broker credentials exist", { userId });

  // Check if credentials already exist
  const existingCredentials = await prisma.brokerCredential.findFirst({
    where: {
      user_id: userId,
      broker_name: "capital.com",
      is_active: true,
    },
  });

  if (!existingCredentials) {
    logger.info("Creating new broker credentials", { userId });
    // Create new credentials
    await prisma.brokerCredential.create({
      data: {
        user_id: userId,
        broker_name: "capital.com",
        description: "Capital.com Trading Account",
        credentials: JSON.stringify({
          apiKey: process.env.CAPITAL_API_KEY,
          password: process.env.CAPITAL_PASSWORD,
        }),
        is_active: true,
        is_demo: true, // Starting with demo account for safety
      },
    });
    logger.info("Broker credentials created successfully", { userId });
  }
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
});

// Create new bot
router.post("/", authenticateUser, validateRequest(createBotSchema), async (req, res) => {
  logger.info("Creating new bot", { userId: req.user?.id, config: req.body });
  try {
    // Ensure broker credentials exist
    await ensureBrokerCredentials(req.user!.id);

    // Get active broker credentials
    const brokerCredential = await prisma.brokerCredential.findFirst({
      where: {
        user_id: req.user!.id,
        is_active: true,
      },
    });

    logger.info("Broker credentials check", {
      userId: req.user!.id,
      hasCredentials: !!brokerCredential,
      brokerName: brokerCredential?.broker_name,
    });

    if (!brokerCredential) {
      logger.warn("No active broker credentials found", { userId: req.user!.id });
      return res.status(400).json({ error: "No active broker credentials found. Please connect your broker first." });
    }

    // Create bot instance in database
    const botInstance = await prisma.botInstance.create({
      data: {
        userId: req.user!.id,
        strategyId: req.body.strategyId,
        pair: req.body.pair,
        timeframe: req.body.timeframe,
        riskSettings: req.body.riskSettings,
        isActive: false, // Start as inactive until trading service is initialized
      },
    });

    logger.info("Bot instance created", {
      botId: botInstance.id,
      userId: req.user!.id,
      strategyId: req.body.strategyId,
      pair: req.body.pair,
      timeframe: req.body.timeframe,
    });

    try {
      // Initialize trading service with broker credentials
      logger.info("Initializing trading service", {
        botId: botInstance.id,
        userId: req.user!.id,
        brokerName: brokerCredential.broker_name,
      });

      const tradingService = await initializeTradingService(req.user!.id, {
        ...req.body,
        brokerCredentialId: brokerCredential.id,
      });

      // Start the trading service
      logger.info("Starting trading service", { botId: botInstance.id });
      await tradingService.start();

      // Update bot to active state
      await prisma.botInstance.update({
        where: { id: botInstance.id },
        data: { isActive: true },
      });

      logger.info("Bot created and started successfully", { botId: botInstance.id });
      res.status(201).json(botInstance);
    } catch (serviceError) {
      // If trading service fails, delete the bot instance
      logger.error("Error initializing trading service:", {
        error: serviceError instanceof Error ? serviceError.message : "Unknown error",
        stack: serviceError instanceof Error ? serviceError.stack : undefined,
        botId: botInstance.id,
        userId: req.user!.id,
        brokerName: brokerCredential.broker_name,
      });

      await prisma.botInstance.delete({
        where: { id: botInstance.id },
      });

      return res.status(400).json({
        error: serviceError instanceof Error ? serviceError.message : "Failed to initialize trading service",
      });
    }
  } catch (error) {
    logger.error("Error creating bot:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
      config: req.body,
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
    logger.error("Error fetching all bots:", { error, userId: req.user?.id });
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
        logger.error("Error getting bot status:", { error, userId: req.user?.id, botId: req.params.id });
        status.errors = [error instanceof Error ? error.message : "Failed to get bot status"];
      }
    }

    logger.info("Bot fetched successfully", { userId: req.user?.id, botId: req.params.id });
    res.json({
      ...bot,
      status,
    });
  } catch (error) {
    logger.error("Error fetching bot:", { error, userId: req.user?.id, botId: req.params.id });
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
    logger.error("Error starting bot:", { error, userId: req.user?.id, botId });
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
    logger.error("Error stopping bot:", { error, userId: req.user?.id, botId });
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
    logger.error("Error deleting bot:", { error, userId: req.user?.id, botId: req.params.id });
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
    logger.error("Error fetching bot logs:", { error, userId: req.user?.id, botId: req.params.id });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch bot logs" });
  }
});

export default router;
