import { Router } from "express";
import { AutomatedTradingService } from "../../services/trading/automated-trading.service";
import { validateRequest } from "../../middleware/validate-request";
import { z } from "zod";
import { authenticateUser } from "../../middleware/auth";
import { createLogger } from "../../utils/logger";

const logger = createLogger("bot-routes");
const router = Router();
const tradingService = new AutomatedTradingService();

// Validation schemas
const createBotSchema = z.object({
  pair: z.string(),
  timeframe: z.string(),
  strategyId: z.string(),
  riskSettings: z.object({
    maxRiskPerTrade: z.number(),
  }),
});

// Create new bot
router.post(
  "/",
  authenticateUser,
  (req, res, next) => {
    // Debug middleware to check request body
    logger.info(`Create bot request received:`, {
      bodyType: typeof req.body,
      contentType: req.headers["content-type"],
      bodyKeys: req.body ? Object.keys(req.body) : [],
      rawBody: JSON.stringify(req.body),
    });

    // Continue to validation middleware
    next();
  },
  validateRequest(createBotSchema),
  async (req, res) => {
    logger.info("Creating new bot", { userId: req.user?.id, config: req.body });
    try {
      // If risk settings are not complete, try to get them from the strategy
      const { strategyId, riskSettings } = req.body;

      // Create the bot instance
      const botInstance = await tradingService.createBot(req.user!.id, req.body);
      logger.info("Bot created successfully", { botId: botInstance.id });
      res.status(201).json(botInstance);
    } catch (error) {
      logger.error("Error creating bot:", { error, userId: req.user?.id, config: req.body });
      res.status(500).json({ error: "Failed to create bot" });
    }
  }
);

// Get bot status
router.get("/status", authenticateUser, async (req, res) => {
  try {
    logger.info("Fetching bot status for user", { userId: req.user?.id });
    // Get all bots for the user
    const bots = await tradingService.getAllUserBots(req.user!.id);

    if (bots.length === 0) {
      // If no bots found, return a default inactive bot status
      const mockStatus = {
        id: null,
        isActive: false,
        lastCheck: new Date(),
        lastTrade: null,
        dailyStats: {
          tradesExecuted: 0,
          winRate: 0,
          profitLoss: 0,
        },
        errors: [],
      };
      return res.status(200).json(mockStatus);
    }

    // Return the most recently active bot, or the first bot if none are active
    const activeBot = bots.find((bot) => bot.isActive) || bots[0];

    res.status(200).json(activeBot);
  } catch (error) {
    logger.error("Error fetching bot status:", error);
    res.status(500).json({ message: "Failed to fetch bot status", error: String(error) });
  }
});

// Get all bots for a user
router.get("/all", authenticateUser, async (req, res) => {
  logger.info("Fetching all bots for user", { userId: req.user?.id });
  try {
    const bots = await tradingService.getAllUserBots(req.user!.id);
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
    const bot = await tradingService.getBotStatus(req.params.id);
    if (!bot) {
      logger.warn("Bot not found", { userId: req.user?.id, botId: req.params.id });
      return res.status(404).json({ error: "Bot not found" });
    }
    logger.info("Bot fetched successfully", { userId: req.user?.id, botId: req.params.id });
    res.json(bot);
  } catch (error) {
    logger.error("Error fetching bot:", { error, userId: req.user?.id, botId: req.params.id });
    res.status(500).json({ error: "Failed to fetch bot" });
  }
});

// Start a bot
router.post("/:id/start", authenticateUser, async (req, res) => {
  const botId = req.params.id;
  logger.info("Starting bot", { userId: req.user?.id, botId });
  try {
    await tradingService.startBot(botId);
    logger.info("Bot started successfully", { userId: req.user?.id, botId });
    res.status(200).json({ success: true, message: "Bot started successfully" });
  } catch (error) {
    logger.error("Error starting bot:", { error, userId: req.user?.id, botId });
    res.status(500).json({ error: "Failed to start bot" });
  }
});

// Stop a bot
router.post("/:id/stop", authenticateUser, async (req, res) => {
  const botId = req.params.id;
  logger.info("Stopping bot", { userId: req.user?.id, botId });
  try {
    await tradingService.stopBot(botId);
    logger.info("Bot stopped successfully", { userId: req.user?.id, botId });
    res.status(200).json({ success: true, message: "Bot stopped successfully" });
  } catch (error) {
    logger.error("Error stopping bot:", { error, userId: req.user?.id, botId });
    res.status(500).json({ error: "Failed to stop bot" });
  }
});

// Delete/stop bot
router.delete("/:id", authenticateUser, async (req, res) => {
  logger.info("Stopping bot", { userId: req.user?.id, botId: req.params.id });
  try {
    await tradingService.stopBot(req.params.id);
    logger.info("Bot stopped successfully", { userId: req.user?.id, botId: req.params.id });
    res.status(204).send();
  } catch (error) {
    logger.error("Error stopping bot:", { error, userId: req.user?.id, botId: req.params.id });
    res.status(500).json({ error: "Failed to stop bot" });
  }
});

// Get bot logs
router.get("/:id/logs", authenticateUser, async (req, res) => {
  logger.info("Fetching bot logs", { userId: req.user?.id, botId: req.params.id });
  try {
    const logs = await tradingService.getBotLogs(req.params.id);
    logger.info("Bot logs fetched successfully", { userId: req.user?.id, botId: req.params.id, logsCount: logs.length });
    res.json(logs);
  } catch (error) {
    logger.error("Error fetching bot logs:", { error, userId: req.user?.id, botId: req.params.id });
    res.status(500).json({ error: "Failed to fetch bot logs" });
  }
});

export default router;
