import { PrismaClient, BotInstance, Trade as PrismaTrade, Prisma } from "@prisma/client";
import { createLogger } from "../../utils/logger";
import { addBotToPolling } from "../jobs/automated-trading-polling.job";

const logger = createLogger("automated-trading-service");
const prisma = new PrismaClient();

interface BotConfig {
  pair: string;
  timeframe: string;
  strategyId: string;
  riskSettings: {
    maxRiskPerTrade: number;
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

// Signal type definition
interface TradingSignal {
  type: "BUY" | "SELL";
  price: number;
  confidence: number;
  indicators: Record<string, number>;
}

// Market data type definition
interface MarketData {
  pair: string;
  timeframe: string;
  currentPrice: number;
  candles: CandleData[];
}

// Candle data type definition
interface CandleData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Bot with strategy and trades
interface BotWithDetails extends BotInstance {
  strategy: {
    id: string;
    name: string;
    rules: any;
  };
  trades: PrismaTrade[];
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
      const bot = await prisma.botInstance.update({
        where: { id: botId },
        data: { isActive: true },
      });

      logger.info(`Started bot instance ${botId}`);

      // Add the bot to the polling system
      await addBotToPolling(botId, bot.timeframe);
      logger.info(`Added bot ${botId} to polling system with timeframe ${bot.timeframe}`);
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

  /**
   * Analyze trading pair and generate signals for the bot
   */
  async analyzeTradingPair(botId: string): Promise<TradingSignal | null> {
    try {
      logger.info(`Analyzing trading pair for bot ${botId}`);

      // Get bot details with strategy
      const bot = await prisma.botInstance.findUnique({
        where: { id: botId },
        include: {
          strategy: true,
        },
      });

      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }

      // Get market data for the pair and timeframe
      const marketData = await this.getMarketData(bot.pair, bot.timeframe);

      // Apply strategy rules to market data
      const signal = await this.applyStrategyRules(bot.strategyId, marketData, bot.id);

      // Update bot's last check time
      await prisma.botInstance.update({
        where: { id: botId },
        data: { updatedAt: new Date() },
      });

      return signal;
    } catch (error) {
      logger.error(`Error analyzing trading pair for bot ${botId}:`, error);
      throw new Error("Failed to analyze trading pair");
    }
  }

  /**
   * Get market data for a pair and timeframe
   */
  private async getMarketData(pair: string, timeframe: string): Promise<MarketData> {
    try {
      // This would connect to your data provider (exchange API, etc.)
      // For now, we'll return mock data
      const currentPrice = Math.random() * 40000 + 30000; // Mock BTC price

      // Mock candle data
      const candles = Array.from({ length: 100 }, (_, i) => {
        const basePrice = currentPrice - i * 100;
        const open = basePrice + (Math.random() * 200 - 100);
        const high = open + Math.random() * 200;
        const low = open - Math.random() * 200;
        const close = low + Math.random() * (high - low);
        const volume = Math.random() * 100;

        const timestamp = new Date();
        timestamp.setMinutes(timestamp.getMinutes() - i * parseInt(timeframe));

        return {
          timestamp,
          open,
          high,
          low,
          close,
          volume,
        };
      }).reverse(); // Newest candles last

      return {
        pair,
        timeframe,
        currentPrice,
        candles,
      };
    } catch (error) {
      logger.error(`Error fetching market data for ${pair}/${timeframe}:`, error);
      throw new Error("Failed to fetch market data");
    }
  }

  /**
   * Apply strategy rules to market data
   */
  private async applyStrategyRules(strategyId: string, marketData: MarketData, botId: string): Promise<TradingSignal | null> {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });

      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      // Extract candles for easier processing
      const candles = marketData.candles;
      const currentPrice = marketData.currentPrice;

      // Apply strategy rules based on strategy id
      switch (strategyId) {
        case "rsi_mean_reversion": {
          // Calculate RSI
          const rsiPeriod = strategy.rules?.indicators?.rsi || 14;
          const rsi = this.calculateRSI(candles, rsiPeriod);
          const latestRSI = rsi[rsi.length - 1];

          // Generate signal based on RSI rules
          let signalType: "BUY" | "SELL" | null = null;
          if (latestRSI < 30) {
            signalType = "BUY";
          } else if (latestRSI > 70) {
            signalType = "SELL";
          }

          if (signalType) {
            logger.info(`Generated ${signalType} signal for bot ${botId} with RSI ${latestRSI}`);
            return {
              type: signalType,
              price: currentPrice,
              confidence: Math.abs(latestRSI - 50) / 50, // Higher confidence further from 50
              indicators: {
                rsi: latestRSI,
              },
            };
          }
          break;
        }

        case "sma_crossover": {
          // Calculate SMAs
          const fastPeriod = strategy.rules?.indicators?.fast_sma || 50;
          const slowPeriod = strategy.rules?.indicators?.slow_sma || 200;

          const fastSMA = this.calculateSMA(candles, fastPeriod);
          const slowSMA = this.calculateSMA(candles, slowPeriod);

          // Check for crossover
          const isFastAboveSlow = fastSMA[fastSMA.length - 1] > slowSMA[slowSMA.length - 1];
          const wasFastAboveSlow = fastSMA[fastSMA.length - 2] > slowSMA[slowSMA.length - 2];

          let signalType: "BUY" | "SELL" | null = null;
          if (isFastAboveSlow && !wasFastAboveSlow) {
            signalType = "BUY"; // Golden cross
          } else if (!isFastAboveSlow && wasFastAboveSlow) {
            signalType = "SELL"; // Death cross
          }

          if (signalType) {
            logger.info(`Generated ${signalType} signal for bot ${botId} with SMA crossover`);
            return {
              type: signalType,
              price: currentPrice,
              confidence: 0.8, // Crossovers are high confidence signals
              indicators: {
                fastSMA: fastSMA[fastSMA.length - 1],
                slowSMA: slowSMA[slowSMA.length - 1],
              },
            };
          }
          break;
        }

        // Add more strategies as needed

        default:
          logger.warn(`No implementation for strategy ${strategyId}`);
          return null;
      }

      return null; // No signal generated
    } catch (error) {
      logger.error(`Error applying strategy rules for ${strategyId}:`, error);
      throw new Error("Failed to apply strategy rules");
    }
  }

  /**
   * Execute a trade based on a signal
   */
  async executeTrade(botId: string, signal: TradingSignal): Promise<void> {
    try {
      // Get bot details
      const bot = (await prisma.botInstance.findUnique({
        where: { id: botId },
        include: {
          strategy: true,
          // Get user's active trades for this pair to avoid duplicates
          trades: {
            where: {
              pair: { equals: botId }, // Just to get bot's pair trades - we'll filter for open ones below
            },
          },
        },
      })) as BotWithDetails;

      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }

      // Check if there's an existing open trade for this pair
      // Filter trades where closedAt is null (open trades)
      const openTrades = bot.trades.filter((trade) => trade.closedAt === null);
      const hasOpenTrade = openTrades.length > 0;

      // If BUY signal but already has open position, skip
      if (signal.type === "BUY" && hasOpenTrade) {
        logger.info(`Bot ${botId} already has an open position for ${bot.pair}, skipping buy signal`);
        return;
      }

      // If SELL signal but no open position, skip
      if (signal.type === "SELL" && !hasOpenTrade) {
        logger.info(`Bot ${botId} has no open position for ${bot.pair}, skipping sell signal`);
        return;
      }

      // Calculate position size based on risk settings
      const positionSize = this.calculatePositionSize(bot, signal);

      // Create trade record
      await prisma.trade.create({
        data: {
          userId: bot.userId,
          botInstanceId: bot.id,
          pair: bot.pair,
          type: signal.type,
          entryPrice: new Prisma.Decimal(signal.price.toString()),
          quantity: new Prisma.Decimal(positionSize.toString()),
          stopLoss: new Prisma.Decimal(this.calculateStopLoss(signal).toString()),
          takeProfit: new Prisma.Decimal(this.calculateTakeProfit(signal).toString()),
          riskPercent: new Prisma.Decimal((bot.riskSettings as any).maxRiskPerTrade || "1.0"),
          metadata: {
            signal: signal,
            indicators: signal.indicators,
          },
        },
      });

      logger.info(`Created ${signal.type} trade for bot ${botId} at price ${signal.price}`);

      // In a real implementation, this would connect to your broker API to place the actual order
      // For now, we'll just log it
      logger.info(`[MOCK] Executed ${signal.type} order for ${bot.pair} at ${signal.price}`);
    } catch (error) {
      logger.error(`Error executing trade for bot ${botId}:`, error);
      throw new Error("Failed to execute trade");
    }
  }

  /**
   * Calculate position size based on risk settings
   */
  private calculatePositionSize(bot: BotWithDetails, signal: TradingSignal): number {
    // Mock calculation - in a real implementation this would use account balance and risk per trade
    const accountBalance = 10000; // Mock balance
    const riskSettings = bot.riskSettings as any;
    const riskPercentage = riskSettings?.maxRiskPerTrade || 1; // Default 1% risk per trade
    return (accountBalance * riskPercentage) / 100;
  }

  /**
   * Calculate stop loss price
   */
  private calculateStopLoss(signal: TradingSignal): number {
    // Mock calculation - in a real implementation this would be more sophisticated
    if (signal.type === "BUY") {
      return signal.price * 0.95; // 5% below entry for buys
    } else {
      return signal.price * 1.05; // 5% above entry for sells
    }
  }

  /**
   * Calculate take profit price
   */
  private calculateTakeProfit(signal: TradingSignal): number {
    // Mock calculation
    if (signal.type === "BUY") {
      return signal.price * 1.1; // 10% above entry for buys
    } else {
      return signal.price * 0.9; // 10% below entry for sells
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(candles: CandleData[], period: number): number[] {
    if (candles.length < period + 1) {
      return Array(candles.length).fill(50); // Not enough data, return neutral values
    }

    // Extract close prices
    const closePrices = candles.map((c) => c.close);

    // Calculate price changes
    const priceChanges = [];
    for (let i = 1; i < closePrices.length; i++) {
      priceChanges.push(closePrices[i] - closePrices[i - 1]);
    }

    // Calculate gains and losses
    const gains = priceChanges.map((change) => (change > 0 ? change : 0));
    const losses = priceChanges.map((change) => (change < 0 ? Math.abs(change) : 0));

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate RSI for each period
    const rsiValues = [50]; // Start with a placeholder for the first period

    for (let i = period; i < priceChanges.length; i++) {
      // Smooth averages
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      // Calculate RS and RSI
      const rs = avgGain / (avgLoss || 0.001); // Avoid division by zero
      const rsi = 100 - 100 / (1 + rs);

      rsiValues.push(rsi);
    }

    return rsiValues;
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  private calculateSMA(candles: CandleData[], period: number): number[] {
    const closePrices = candles.map((c) => c.close);
    const smaValues: number[] = [];

    for (let i = 0; i < closePrices.length; i++) {
      if (i < period - 1) {
        smaValues.push(0); // Not enough data yet, use 0 as placeholder
      } else {
        const sum = closePrices.slice(i - period + 1, i + 1).reduce((sum, price) => sum + price, 0);
        smaValues.push(sum / period);
      }
    }

    return smaValues;
  }
}
