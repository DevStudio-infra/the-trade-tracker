import { PrismaClient, Trade, BotInstance } from "@prisma/client";
import { createLogger } from "../../utils/logger";
import { Decimal } from "@prisma/client/runtime/library";

const logger = createLogger("risk-management-service");
const prisma = new PrismaClient();

interface MarketConditions {
  safe: boolean;
  reason?: string;
}

interface TradeValidation {
  botId: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  positionSize: number;
  riskSettings: {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
    stopLossPercent: number;
    takeProfitRatio: number;
  };
}

export interface RiskParameters {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  stopLossPercentage: number;
  takeProfitRatio: number;
}

export class RiskManagementService {
  /**
   * Validate if a new trade can be executed based on risk parameters
   */
  async validateTrade(validation: TradeValidation): Promise<boolean> {
    try {
      const { botId, positionSize, riskSettings } = validation;

      // Check position size
      if (positionSize > riskSettings.maxPositionSize) {
        logger.warn(`Position size ${positionSize} exceeds maximum ${riskSettings.maxPositionSize}`);
        return false;
      }

      // Get today's trades
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayTrades = await prisma.trade.findMany({
        where: {
          tradingBotId: botId,
          createdAt: {
            gte: todayStart,
          },
        },
      });

      // Calculate daily loss
      const dailyLoss = todayTrades.reduce((total, trade) => {
        if (trade.profitLoss && Number(trade.profitLoss) < 0) {
          return total + Math.abs(Number(trade.profitLoss));
        }
        return total;
      }, 0);

      if (dailyLoss >= riskSettings.maxDailyLoss) {
        logger.warn(`Daily loss ${dailyLoss} exceeds maximum ${riskSettings.maxDailyLoss}`);
        return false;
      }

      // Calculate drawdown
      const allTrades = await prisma.trade.findMany({
        where: {
          tradingBotId: botId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      let peak = 0;
      let currentBalance = 0;
      let maxDrawdown = 0;

      allTrades.forEach((trade) => {
        if (trade.profitLoss) {
          currentBalance += Number(trade.profitLoss);
          peak = Math.max(peak, currentBalance);
          const drawdown = peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0;
          maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
      });

      if (maxDrawdown >= riskSettings.maxDrawdown) {
        logger.warn(`Drawdown ${maxDrawdown}% exceeds maximum ${riskSettings.maxDrawdown}%`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Error validating trade:", error);
      return false;
    }
  }

  /**
   * Calculate stop loss price based on entry price and risk settings
   */
  async calculateStopLoss(entryPrice: number, direction: "LONG" | "SHORT", stopLossPercent: number): Promise<number> {
    const multiplier = direction === "LONG" ? 1 - stopLossPercent / 100 : 1 + stopLossPercent / 100;
    return entryPrice * multiplier;
  }

  /**
   * Calculate take profit price based on entry price and risk settings
   */
  async calculateTakeProfit(entryPrice: number, direction: "LONG" | "SHORT", takeProfitRatio: number): Promise<number> {
    const multiplier = direction === "LONG" ? 1 + takeProfitRatio / 100 : 1 - takeProfitRatio / 100;
    return entryPrice * multiplier;
  }

  /**
   * Check if market conditions are normal
   * Returns false if there are signs of high volatility or unusual activity
   */
  async checkMarketConditions(pair: string): Promise<MarketConditions> {
    try {
      // TODO: Implement proper market condition checks
      // For now, return safe conditions
      return {
        safe: true,
      };
    } catch (error) {
      logger.error(`Error checking market conditions for ${pair}:`, error);
      return {
        safe: false,
        reason: "Error checking market conditions",
      };
    }
  }

  /**
   * Emergency stop for a bot
   * Called when risk limits are breached or unusual conditions detected
   */
  async emergencyStop(botId: string, reason: string): Promise<void> {
    try {
      // Update bot status
      await prisma.botInstance.update({
        where: { id: botId },
        data: {
          isActive: false,
          metadata: {
            emergencyStop: {
              timestamp: new Date(),
              reason: reason,
            },
          },
        },
      });

      // Close any open positions
      const openTrades = await prisma.trade.findMany({
        where: {
          botInstanceId: botId,
          exitPrice: null,
        },
      });

      // Log the emergency stop
      logger.warn(`Emergency stop triggered for bot ${botId}: ${reason}`);

      // TODO: Implement position closing logic
      // This should be implemented in the trade execution service
    } catch (error) {
      logger.error(`Error during emergency stop for bot ${botId}:`, error);
      throw error;
    }
  }
}
