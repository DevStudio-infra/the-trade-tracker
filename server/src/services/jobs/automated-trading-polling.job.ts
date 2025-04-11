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

const tradingService = new AutomatedTradingService();

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
  await redis.setex(`${BOT_PROCESSING_KEY}${botId}`, 300, "1"); // 5 minute timeout
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

    // Use the trading service to analyze the pair and potentially generate a signal
    const signal = await tradingService.analyzeTradingPair(botId);

    if (signal) {
      // Execute trade if signal is generated
      logger.info(`Signal generated for bot ${botId}, executing trade`);
      await tradingService.executeTrade(botId, signal);
    } else {
      logger.debug(`No trading signal generated for bot ${botId}`);
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
export async function initializePollingJobs() {
  try {
    // Get all active bots grouped by timeframe
    const activeBots = await prisma.botInstance.findMany({
      where: { isActive: true },
      select: { id: true, timeframe: true },
    });

    // Group bots by timeframe
    const botsByTimeframe: Record<string, string[]> = {};
    activeBots.forEach((bot) => {
      if (!botsByTimeframe[bot.timeframe]) {
        botsByTimeframe[bot.timeframe] = [];
      }
      botsByTimeframe[bot.timeframe].push(bot.id);
    });

    // Create jobs for each timeframe
    Object.entries(botsByTimeframe).forEach(([timeframe, botIds]) => {
      if (TIMEFRAME_CRONS[timeframe] && !activeJobs[timeframe]) {
        const job = new CronJob(
          TIMEFRAME_CRONS[timeframe],
          async () => {
            logger.info(`Running polling job for timeframe ${timeframe}`);
            await Promise.all(
              botIds.map(async (botId) => {
                try {
                  await processBot(botId);
                } catch (error) {
                  logger.error(`Error processing bot ${botId}:`, error);
                }
              })
            );
          },
          null,
          true,
          "UTC"
        );

        activeJobs[timeframe] = job;
        logger.info(`Started polling job for timeframe ${timeframe}`);
      }
    });
  } catch (error) {
    logger.error("Error initializing polling jobs:", error);
    throw error;
  }
}

/**
 * Add a bot to the polling system
 */
export async function addBotToPolling(botId: string, timeframe: string) {
  try {
    if (!TIMEFRAME_CRONS[timeframe]) {
      throw new Error(`Invalid timeframe: ${timeframe}`);
    }

    // Create job for timeframe if it doesn't exist
    if (!activeJobs[timeframe]) {
      const job = new CronJob(
        TIMEFRAME_CRONS[timeframe],
        async () => {
          logger.info(`Running polling job for timeframe ${timeframe}`);
          await processBot(botId);
        },
        null,
        true,
        "UTC"
      );

      activeJobs[timeframe] = job;
      logger.info(`Started polling job for timeframe ${timeframe}`);
    }
  } catch (error) {
    logger.error(`Error adding bot ${botId} to polling:`, error);
    throw error;
  }
}

/**
 * Remove a bot from the polling system
 */
export async function removeBotFromPolling(botId: string, timeframe: string) {
  try {
    // Clear any processing status
    await clearBotProcessing(botId);

    // Check if there are any other bots using this timeframe
    const otherBots = await prisma.botInstance.findMany({
      where: {
        timeframe,
        isActive: true,
        NOT: { id: botId },
      },
    });

    // If no other bots are using this timeframe, stop the job
    if (otherBots.length === 0 && activeJobs[timeframe]) {
      activeJobs[timeframe].stop();
      delete activeJobs[timeframe];
      logger.info(`Stopped polling job for timeframe ${timeframe}`);
    }
  } catch (error) {
    logger.error(`Error removing bot ${botId} from polling:`, error);
    throw error;
  }
}

/**
 * Main function to start the automated trading polling system
 */
export async function startAutomatedTradingPollingJob(): Promise<void> {
  logger.info("Starting automated trading polling job");
  await initializePollingJobs();
  logger.info("Automated trading polling job initialized successfully");
  return Promise.resolve();
}
