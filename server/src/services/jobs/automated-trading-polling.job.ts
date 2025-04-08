import { PrismaClient } from "@prisma/client";
import { CronJob } from "cron";
import { createLogger } from "../../utils/logger";
import { AutomatedTradingService } from "../trading/automated-trading.service";
import { ChartGeneratorService } from "../chart/chart-generator.service";
import { redis } from "../../config/redis.config";
import { RiskManagementService } from "../trading/risk-management.service";
import { TradeExecutionService } from "../trading/trade-execution.service";
import { AIService } from "../ai/ai.service";
import { RedisService } from "../redis/redis.service";

const logger = createLogger("automated-trading-polling");
const prisma = new PrismaClient();

// Initialize required services
const riskManagementService = new RiskManagementService();
const tradeExecutionService = new TradeExecutionService();
const chartGeneratorService = new ChartGeneratorService();
const aiService = new AIService();
const redisService = new RedisService();

const tradingService = new AutomatedTradingService(riskManagementService, tradeExecutionService, chartGeneratorService, aiService, redisService);

// Cache key prefix for bot processing status
const BOT_PROCESSING_KEY = "bot:processing:";

// Map of standard timeframes to cron expressions
const TIMEFRAME_CRONS: Record<string, string> = {
  "1": "* * * * *", // 1 minute
  "5": "*/5 * * * *", // 5 minutes
  "15": "*/15 * * * *", // 15 minutes
  "30": "*/30 * * * *", // 30 minutes
  "60": "0 * * * *", // 1 hour
  "240": "0 */4 * * *", // 4 hours
  "1D": "0 0 * * *", // Daily at midnight
};

// Store active jobs by timeframe
const activeJobs: Record<string, CronJob> = {};

/**
 * Check if a bot is currently being processed
 */
async function isBotProcessing(botId: string): Promise<boolean> {
  const isProcessing = await redis.get(`${BOT_PROCESSING_KEY}${botId}`);
  return !!isProcessing;
}

/**
 * Mark a bot as being processed
 */
async function markBotProcessing(botId: string): Promise<void> {
  await redis.setex(`${BOT_PROCESSING_KEY}${botId}`, 300, "1"); // 5 minute lock
}

/**
 * Clear bot processing status
 */
async function clearBotProcessing(botId: string): Promise<void> {
  await redis.del(`${BOT_PROCESSING_KEY}${botId}`);
}

/**
 * Process a single bot
 */
async function processBot(botId: string) {
  // Skip if bot is already being processed
  if (await isBotProcessing(botId)) {
    logger.debug(`Bot ${botId} is already being processed, skipping`);
    return;
  }

  try {
    // Mark bot as being processed
    await markBotProcessing(botId);

    // Get bot details
    const bot = await prisma.botInstance.findUnique({
      where: { id: botId },
      include: {
        strategy: true,
      },
    });

    if (!bot || !bot.isActive) {
      logger.debug(`Bot ${botId} not found or inactive, skipping`);
      return;
    }

    // Generate and analyze chart
    logger.info(`Analyzing trading pair ${bot.pair} for bot ${botId}`);
    const signal = await tradingService.analyzeTradingPair(botId);

    if (signal) {
      // Execute trade if signal is generated
      logger.info(`Signal generated for bot ${botId}, executing trade`);
      await tradingService.executeTrade(botId, signal);
    }
  } catch (error) {
    logger.error(`Error processing bot ${botId}:`, error);
  } finally {
    // Clear processing status
    await clearBotProcessing(botId);
  }
}

/**
 * Process all bots for a given timeframe
 */
async function processBotsByTimeframe(timeframe: string) {
  try {
    // Get all active bots for this timeframe
    const bots = await prisma.botInstance.findMany({
      where: {
        timeframe,
        isActive: true,
      },
    });

    logger.info(`Processing ${bots.length} bots for timeframe ${timeframe}`);

    // Process each bot
    await Promise.all(bots.map((bot) => processBot(bot.id)));
  } catch (error) {
    logger.error(`Error processing bots for timeframe ${timeframe}:`, error);
  }
}

/**
 * Initialize jobs for each timeframe
 */
function initializeTimeframeJobs() {
  // Stop any existing jobs
  Object.values(activeJobs).forEach((job) => job.stop());

  // Clear jobs object
  Object.keys(activeJobs).forEach((key) => delete activeJobs[key]);

  // Create new jobs for each timeframe
  Object.entries(TIMEFRAME_CRONS).forEach(([timeframe, cronExpression]) => {
    activeJobs[timeframe] = new CronJob(cronExpression, () => processBotsByTimeframe(timeframe), null, true, "UTC");
  });

  logger.info("Timeframe jobs initialized");
}

/**
 * Start the polling jobs
 */
export function startAutomatedTradingPollingJob() {
  try {
    initializeTimeframeJobs();
    logger.info("Automated trading polling jobs scheduled");

    // Reinitialize jobs every hour to pick up any new timeframes
    new CronJob(
      "0 * * * *", // Every hour
      initializeTimeframeJobs,
      null,
      true,
      "UTC"
    );
  } catch (error) {
    logger.error("Error starting automated trading polling jobs:", error);
  }
}

/**
 * Stop all polling jobs
 */
export function stopAutomatedTradingPollingJob() {
  try {
    Object.values(activeJobs).forEach((job) => job.stop());
    logger.info("All automated trading polling jobs stopped");
  } catch (error) {
    logger.error("Error stopping automated trading polling jobs:", error);
  }
}
