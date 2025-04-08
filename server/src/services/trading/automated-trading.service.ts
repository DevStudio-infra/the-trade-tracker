import { PrismaClient } from "@prisma/client";
import { createLogger } from "../../utils/logger";
import { RiskManagementService } from "./risk-management.service";
import { TradeExecutionService } from "./trade-execution.service";
import { ChartGeneratorService } from "../chart/chart-generator.service";
import { AIService, ChartAnalysis } from "../ai/ai.service";
import { RedisService } from "../redis/redis.service";

const logger = createLogger("automated-trading-service");
const prisma = new PrismaClient();

interface BotConfig {
  userId: string;
  strategyId: string;
  pair: string;
  timeframe: string;
  riskSettings: {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
    stopLossPercent: number;
    takeProfitRatio: number;
  };
}

interface BotStatus {
  id: string;
  active: boolean;
  lastCheck: Date;
  lastTrade: Date | null;
  dailyStats: {
    trades: number;
    winRate: number;
    pnl: number;
  };
  errors: Array<{
    timestamp: Date;
    message: string;
  }>;
}

export class AutomatedTradingService {
  constructor(
    private readonly riskManager: RiskManagementService,
    private readonly tradeExecutor: TradeExecutionService,
    private readonly chartGenerator: ChartGeneratorService,
    private readonly aiService: AIService,
    private readonly redisService: RedisService
  ) {}

  async createBot(config: BotConfig): Promise<string> {
    try {
      const bot = await prisma.tradingBot.create({
        data: {
          userId: config.userId,
          strategyId: config.strategyId,
          pair: config.pair,
          timeframe: config.timeframe,
          riskSettings: config.riskSettings,
          active: false,
          metadata: {
            lastCheck: new Date(),
            lastTrade: null,
            dailyStats: {
              trades: 0,
              winRate: 0,
              pnl: 0,
            },
            errors: [],
          },
        },
      });

      logger.info(`Created new trading bot: ${bot.id}`);
      return bot.id;
    } catch (error) {
      logger.error("Error creating trading bot:", error);
      throw new Error("Failed to create trading bot");
    }
  }

  async startBot(botId: string): Promise<BotStatus> {
    try {
      const bot = await prisma.tradingBot.findUnique({
        where: { id: botId },
      });

      if (!bot) {
        throw new Error("Bot not found");
      }

      // Check market conditions before starting
      const marketConditions = await this.riskManager.checkMarketConditions(bot.pair);
      if (!marketConditions.safe) {
        throw new Error(`Unsafe market conditions: ${marketConditions.reason}`);
      }

      const updatedBot = await prisma.tradingBot.update({
        where: { id: botId },
        data: {
          active: true,
          metadata: {
            ...bot.metadata,
            lastCheck: new Date(),
          },
        },
      });

      return this.mapBotStatus(updatedBot);
    } catch (error) {
      logger.error(`Error starting bot ${botId}:`, error);
      throw error;
    }
  }

  async stopBot(botId: string): Promise<BotStatus> {
    try {
      const bot = await prisma.tradingBot.update({
        where: { id: botId },
        data: { active: false },
      });

      return this.mapBotStatus(bot);
    } catch (error) {
      logger.error(`Error stopping bot ${botId}:`, error);
      throw error;
    }
  }

  async getBotStatus(botId: string): Promise<BotStatus> {
    try {
      const bot = await prisma.tradingBot.findUnique({
        where: { id: botId },
      });

      if (!bot) {
        throw new Error("Bot not found");
      }

      return this.mapBotStatus(bot);
    } catch (error) {
      logger.error(`Error getting bot status ${botId}:`, error);
      throw error;
    }
  }

  async analyzeTradingPair(botId: string): Promise<ChartAnalysis> {
    try {
      const bot = await prisma.tradingBot.findUnique({
        where: { id: botId },
        include: { strategy: true },
      });

      if (!bot || !bot.active) {
        throw new Error("Bot not found or inactive");
      }

      // Generate chart with indicators
      const chart = await this.chartGenerator.generateChart(bot.pair, bot.timeframe);

      // Analyze chart using AI
      const analysis = await this.aiService.analyzeChart(chart, bot.strategy.rules);

      // Validate against risk parameters
      if (analysis.shouldTrade) {
        const isValid = await this.riskManager.validateTrade({
          botId: bot.id,
          direction: analysis.direction,
          entryPrice: analysis.entryPrice,
          positionSize: analysis.positionSize,
          riskSettings: bot.riskSettings as any,
        });

        if (!isValid) {
          analysis.shouldTrade = false;
        }
      }

      return analysis;
    } catch (error) {
      logger.error(`Error analyzing trading pair for bot ${botId}:`, error);
      throw error;
    }
  }

  async executeTrade(botId: string, analysis: ChartAnalysis): Promise<void> {
    try {
      const bot = await prisma.tradingBot.findUnique({
        where: { id: botId },
      });

      if (!bot || !bot.active) {
        throw new Error("Bot not found or inactive");
      }

      // Final market condition check before execution
      const marketConditions = await this.riskManager.checkMarketConditions(bot.pair);
      if (!marketConditions.safe) {
        throw new Error(`Unsafe market conditions: ${marketConditions.reason}`);
      }

      // Execute trade
      await this.tradeExecutor.executeTrade({
        userId: bot.userId,
        pair: bot.pair,
        direction: analysis.direction,
        quantity: analysis.positionSize,
        entryPrice: analysis.entryPrice,
        stopLoss: await this.riskManager.calculateStopLoss(analysis.entryPrice, analysis.direction, (bot.riskSettings as any).stopLossPercent),
        takeProfit: await this.riskManager.calculateTakeProfit(analysis.entryPrice, analysis.direction, (bot.riskSettings as any).takeProfitRatio),
        metadata: {
          botId: bot.id,
          confidence: analysis.confidence,
          riskScore: analysis.riskScore,
        },
      });

      // Update bot status
      await prisma.tradingBot.update({
        where: { id: botId },
        data: {
          metadata: {
            ...bot.metadata,
            lastTrade: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error(`Error executing trade for bot ${botId}:`, error);
      throw error;
    }
  }

  private mapBotStatus(bot: any): BotStatus {
    return {
      id: bot.id,
      active: bot.active,
      lastCheck: bot.metadata.lastCheck,
      lastTrade: bot.metadata.lastTrade,
      dailyStats: bot.metadata.dailyStats,
      errors: bot.metadata.errors,
    };
  }
}
