import { PrismaClient, BotInstance } from "@prisma/client";
import { createLogger } from "../../utils/logger";

const logger = createLogger("automated-trading-service");
const prisma = new PrismaClient();

interface BotConfig {
  pair: string;
  timeframe: string;
  strategyId: string;
  riskSettings: {
    maxRiskPerTrade: number;
    stopLossPercent: number;
    takeProfitPercent: number;
  };
}

interface BotStatus {
  id: string;
  isActive: boolean;
  lastCheck: Date | null;
  lastTrade: Date | null;
  dailyStats: {
    tradesExecuted: number;
    winRate: number;
    profitLoss: number;
  };
  errors: string[];
}

export class AutomatedTradingService {
  async createBot(userId: string, config: BotConfig): Promise<BotInstance> {
    try {
      const bot = await prisma.botInstance.create({
        data: {
          userId,
          pair: config.pair,
          timeframe: config.timeframe,
          strategyId: config.strategyId,
          riskSettings: config.riskSettings,
          isActive: true,
        },
      });

      logger.info(`Created new bot instance for user ${userId}`, { botId: bot.id });
      return bot;
    } catch (error) {
      logger.error("Error creating bot instance:", error);
      throw new Error("Failed to create bot instance");
    }
  }

  async startBot(botId: string): Promise<void> {
    try {
      await prisma.botInstance.update({
        where: { id: botId },
        data: { isActive: true },
      });

      logger.info(`Started bot instance ${botId}`);
    } catch (error) {
      logger.error(`Error starting bot ${botId}:`, error);
      throw new Error("Failed to start bot");
    }
  }

  async stopBot(botId: string): Promise<void> {
    try {
      await prisma.botInstance.update({
        where: { id: botId },
        data: { isActive: false },
      });

      logger.info(`Stopped bot instance ${botId}`);
    } catch (error) {
      logger.error(`Error stopping bot ${botId}:`, error);
      throw new Error("Failed to stop bot");
    }
  }

  async getBotStatus(botId: string): Promise<BotStatus | null> {
    try {
      const bot = await prisma.botInstance.findUnique({
        where: { id: botId },
        include: {
          trades: {
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!bot) return null;

      // Filter trades with valid profitLoss values
      const winningTrades = bot.trades.filter((t) => t.profitLoss && t.profitLoss.toNumber() > 0);
      const totalPL = bot.trades.reduce((sum, t) => {
        const profit = t.profitLoss ? t.profitLoss.toNumber() : 0;
        return sum + profit;
      }, 0);

      return {
        id: bot.id,
        isActive: bot.isActive,
        lastCheck: bot.updatedAt,
        lastTrade: bot.trades.length > 0 ? bot.trades[0].createdAt : null,
        dailyStats: {
          tradesExecuted: bot.trades.length,
          winRate: bot.trades.length ? (winningTrades.length / bot.trades.length) * 100 : 0,
          profitLoss: totalPL,
        },
        errors: [], // TODO: Implement error tracking
      };
    } catch (error) {
      logger.error(`Error fetching bot status ${botId}:`, error);
      throw new Error("Failed to fetch bot status");
    }
  }

  async getAllUserBots(userId: string): Promise<BotStatus[]> {
    try {
      const bots = await prisma.botInstance.findMany({
        where: { userId },
        include: {
          trades: {
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      return bots.map((bot) => {
        // Filter trades with valid profitLoss values
        const winningTrades = bot.trades.filter((t) => t.profitLoss && t.profitLoss.toNumber() > 0);
        const totalPL = bot.trades.reduce((sum, t) => {
          const profit = t.profitLoss ? t.profitLoss.toNumber() : 0;
          return sum + profit;
        }, 0);

        return {
          id: bot.id,
          isActive: bot.isActive,
          lastCheck: bot.updatedAt,
          lastTrade: bot.trades.length > 0 ? bot.trades[0].createdAt : null,
          dailyStats: {
            tradesExecuted: bot.trades.length,
            winRate: bot.trades.length ? (winningTrades.length / bot.trades.length) * 100 : 0,
            profitLoss: totalPL,
          },
          errors: [], // TODO: Implement error tracking
        };
      });
    } catch (error) {
      logger.error(`Error fetching bots for user ${userId}:`, error);
      throw new Error("Failed to fetch user bots");
    }
  }

  async getBotLogs(botId: string): Promise<any[]> {
    // TODO: Implement bot logging system
    return [];
  }

  /**
   * Get all active bots
   */
  async getAllActiveBots() {
    try {
      const bots = await prisma.botInstance.findMany({
        where: { isActive: true },
        include: {
          trades: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      return bots;
    } catch (error) {
      logger.error("Error fetching active bots:", error);
      throw new Error("Failed to fetch active bots");
    }
  }
}
