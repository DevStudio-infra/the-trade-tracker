import { EventEmitter } from "events";
import { createLogger } from "../../utils/logger";
import { Order, Position, MarketData } from "../broker/interfaces/types";
import { PrismaClient } from "@prisma/client";

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  dailyProfitLoss: number;
  openPositions: number;
  marginUsage: number;
}

interface AlertConfig {
  maxDrawdown: number;
  minWinRate: number;
  maxDailyLoss: number;
  maxMarginUsage: number;
}

export class PerformanceMonitorService extends EventEmitter {
  private readonly logger = createLogger("performance-monitor");
  private readonly prisma = new PrismaClient();
  private metrics: PerformanceMetrics = {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfitLoss: 0,
    winRate: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    dailyProfitLoss: 0,
    openPositions: 0,
    marginUsage: 0,
  };

  constructor(private readonly alertConfig: AlertConfig) {
    super();
  }

  /**
   * Initialize performance monitoring
   */
  public async initialize(): Promise<void> {
    try {
      // Load historical metrics from database
      await this.loadHistoricalMetrics();

      // Start periodic metrics update
      this.startMetricsUpdate();

      this.logger.info("Performance monitoring initialized");
    } catch (error) {
      this.logger.error("Failed to initialize performance monitoring:", error);
      throw error;
    }
  }

  /**
   * Load historical metrics from database
   */
  private async loadHistoricalMetrics(): Promise<void> {
    try {
      // Get today's trades
      const todayTrades = await this.prisma.trade.findMany({
        where: {
          closedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      // Calculate daily metrics
      this.metrics.dailyProfitLoss = todayTrades.reduce((sum, trade) => {
        return sum + (trade.profitLoss?.toNumber() || 0);
      }, 0);

      // Get all-time trades
      const allTrades = await this.prisma.trade.findMany({
        where: {
          closedAt: {
            not: null,
          },
        },
      });

      // Calculate all-time metrics
      const winningTrades = allTrades.filter((t) => (t.profitLoss?.toNumber() || 0) > 0);
      const losingTrades = allTrades.filter((t) => (t.profitLoss?.toNumber() || 0) < 0);

      this.metrics.totalTrades = allTrades.length;
      this.metrics.winningTrades = winningTrades.length;
      this.metrics.losingTrades = losingTrades.length;
      this.metrics.winRate = this.metrics.totalTrades ? (this.metrics.winningTrades / this.metrics.totalTrades) * 100 : 0;

      // Calculate average win/loss
      this.metrics.averageWin = winningTrades.length ? winningTrades.reduce((sum, t) => sum + (t.profitLoss?.toNumber() || 0), 0) / winningTrades.length : 0;
      this.metrics.averageLoss = losingTrades.length ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss?.toNumber() || 0), 0)) / losingTrades.length : 0;

      // Calculate profit factor
      const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profitLoss?.toNumber() || 0), 0);
      const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss?.toNumber() || 0), 0));
      this.metrics.profitFactor = totalLoss ? totalProfit / totalLoss : 0;

      this.logger.info("Historical metrics loaded");
    } catch (error) {
      this.logger.error("Failed to load historical metrics:", error);
      throw error;
    }
  }

  /**
   * Start periodic metrics update
   */
  private startMetricsUpdate(): void {
    // Update metrics every minute
    setInterval(() => {
      this.updateMetrics().catch((error) => {
        this.logger.error("Failed to update metrics:", error);
      });
    }, 60000);
  }

  /**
   * Update current metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Get open positions
      const openPositions = await this.prisma.trade.findMany({
        where: {
          closedAt: null,
        },
      });

      this.metrics.openPositions = openPositions.length;

      // Calculate margin usage
      const totalMargin = openPositions.reduce((sum, pos) => {
        const margin = pos.quantity.toNumber() * pos.entryPrice.toNumber();
        return sum + margin;
      }, 0);

      // Get account balance
      const balance = await this.prisma.accountBalance.findFirst({
        orderBy: {
          timestamp: "desc",
        },
      });

      if (balance) {
        this.metrics.marginUsage = (totalMargin / balance.total.toNumber()) * 100;
      }

      // Check for alerts
      this.checkAlerts();

      // Store metrics snapshot
      await this.storeMetricsSnapshot();

      this.emit("metricsUpdated", this.metrics);
    } catch (error) {
      this.logger.error("Failed to update metrics:", error);
      throw error;
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    // Check drawdown
    if (this.metrics.maxDrawdown >= this.alertConfig.maxDrawdown) {
      this.emit("alert", {
        type: "MAX_DRAWDOWN",
        message: `Maximum drawdown threshold reached: ${this.metrics.maxDrawdown.toFixed(2)}%`,
        level: "critical",
      });
    }

    // Check win rate
    if (this.metrics.winRate < this.alertConfig.minWinRate) {
      this.emit("alert", {
        type: "LOW_WIN_RATE",
        message: `Win rate below threshold: ${this.metrics.winRate.toFixed(2)}%`,
        level: "warning",
      });
    }

    // Check daily loss
    if (this.metrics.dailyProfitLoss <= -this.alertConfig.maxDailyLoss) {
      this.emit("alert", {
        type: "MAX_DAILY_LOSS",
        message: `Maximum daily loss threshold reached: ${Math.abs(this.metrics.dailyProfitLoss).toFixed(2)}`,
        level: "critical",
      });
    }

    // Check margin usage
    if (this.metrics.marginUsage >= this.alertConfig.maxMarginUsage) {
      this.emit("alert", {
        type: "HIGH_MARGIN_USAGE",
        message: `High margin usage: ${this.metrics.marginUsage.toFixed(2)}%`,
        level: "warning",
      });
    }
  }

  /**
   * Store metrics snapshot in database
   */
  private async storeMetricsSnapshot(): Promise<void> {
    try {
      await this.prisma.performanceMetrics.create({
        data: {
          timestamp: new Date(),
          totalTrades: this.metrics.totalTrades,
          winningTrades: this.metrics.winningTrades,
          losingTrades: this.metrics.losingTrades,
          totalProfitLoss: this.metrics.totalProfitLoss,
          winRate: this.metrics.winRate,
          averageWin: this.metrics.averageWin,
          averageLoss: this.metrics.averageLoss,
          profitFactor: this.metrics.profitFactor,
          maxDrawdown: this.metrics.maxDrawdown,
          sharpeRatio: this.metrics.sharpeRatio,
          dailyProfitLoss: this.metrics.dailyProfitLoss,
          openPositions: this.metrics.openPositions,
          marginUsage: this.metrics.marginUsage,
        },
      });
    } catch (error) {
      this.logger.error("Failed to store metrics snapshot:", error);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Handle trade update
   */
  public async onTradeUpdate(trade: any): Promise<void> {
    try {
      // Update metrics when trade is closed
      if (trade.closedAt) {
        await this.loadHistoricalMetrics();
        this.checkAlerts();
      }
    } catch (error) {
      this.logger.error("Failed to handle trade update:", error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    await this.prisma.$disconnect();
    this.removeAllListeners();
  }
}
