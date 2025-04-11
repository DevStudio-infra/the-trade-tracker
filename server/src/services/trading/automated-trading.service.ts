import { PrismaClient, BotInstance, Trade as PrismaTrade, Prisma } from "@prisma/client";
import { createLogger } from "../../utils/logger";
import { addBotToPolling } from "../jobs/automated-trading-polling.job";
import { EventEmitter } from "events";
import { IBroker, IBrokerCredentials } from "../broker/interfaces/broker.interface";
import { Order, Position, OrderParameters, OrderType, OrderStatus, MarketData } from "../broker/interfaces/types";
import { AIService } from "../ai/ai.service";
import { ChartAnalysisService, ChartAnalysisRequest, ChartAnalysisResponse } from "../ai/chart-analysis.service";

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

interface TradingConfig {
  maxPositions: number;
  maxRiskPerTrade: number;
  maxDrawdown: number;
  timeframes: string[];
  symbols: string[];
}

interface TradingState {
  activePositions: Map<string, Position>;
  pendingOrders: Map<string, Order>;
  lastAnalysis: Map<
    string,
    {
      timestamp: number;
      signal: "BUY" | "SELL" | "HOLD";
      confidence: number;
    }
  >;
}

export class AutomatedTradingService extends EventEmitter {
  private readonly logger = createLogger("automated-trading");
  private readonly state: TradingState = {
    activePositions: new Map(),
    pendingOrders: new Map(),
    lastAnalysis: new Map(),
  };
  private isRunning = false;
  private analysisInterval?: NodeJS.Timeout;

  constructor(
    private readonly broker: IBroker,
    private readonly ai: AIService,
    private readonly chartAnalysis: ChartAnalysisService,
    private readonly config: TradingConfig
  ) {
    super();
    this.setupEventListeners();
  }

  /**
   * Get current positions from broker
   */
  public async getPositions(): Promise<Position[]> {
    try {
      return await this.broker.getPositions();
    } catch (error) {
      this.logger.error("Failed to get positions:", error);
      throw error;
    }
  }

  /**
   * Start automated trading
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.logger.info("Starting automated trading...");

      // Connect to broker if not connected
      if (!this.broker.isConnected()) {
        await this.broker.connect({
          apiKey: process.env.CAPITAL_COM_API_KEY || "",
          apiSecret: process.env.CAPITAL_COM_API_SECRET || "",
          isDemo: true,
        });
      }

      // Load existing positions
      await this.loadExistingPositions();

      // Subscribe to market data for all symbols
      for (const symbol of this.config.symbols) {
        const callback = (data: MarketData) => this.handleMarketData(data);
        await this.broker.subscribeToMarketData(symbol, callback);
      }

      this.isRunning = true;
      this.emit("started");
      this.logger.info("Automated trading started successfully");
    } catch (error) {
      this.logger.error("Failed to start automated trading:", error);
      throw error;
    }
  }

  /**
   * Stop automated trading
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.logger.info("Stopping automated trading...");

      // Stop analysis loop
      if (this.analysisInterval) {
        clearInterval(this.analysisInterval);
        this.analysisInterval = undefined;
      }

      // Unsubscribe from market data
      await this.unsubscribeFromMarketData();

      this.isRunning = false;
      this.emit("stopped");
      this.logger.info("Automated trading stopped successfully");
    } catch (error) {
      this.logger.error("Failed to stop automated trading:", error);
      throw error;
    }
  }

  /**
   * Load existing positions from broker
   */
  private async loadExistingPositions(): Promise<void> {
    try {
      const positions = await this.broker.getPositions();
      positions.forEach((position) => {
        this.state.activePositions.set(position.symbol, position);
      });
      this.logger.info(`Loaded ${positions.length} existing positions`);
    } catch (error) {
      this.logger.error("Failed to load existing positions:", error);
      throw error;
    }
  }

  /**
   * Subscribe to market data for all configured symbols
   */
  private async subscribeToMarketData(): Promise<void> {
    try {
      for (const symbol of this.config.symbols) {
        for (const timeframe of this.config.timeframes) {
          await this.broker.subscribeToMarketData(symbol, (data) => this.handleMarketData({ symbol, timeframe, currentPrice: 0, candles: [] }), timeframe);
        }
      }
      this.logger.info("Subscribed to market data for all symbols");
    } catch (error) {
      this.logger.error("Failed to subscribe to market data:", error);
      throw error;
    }
  }

  /**
   * Unsubscribe from market data
   */
  private async unsubscribeFromMarketData(): Promise<void> {
    try {
      for (const symbol of this.config.symbols) {
        for (const timeframe of this.config.timeframes) {
          await this.broker.unsubscribeFromMarketData(symbol, timeframe);
        }
      }
      this.logger.info("Unsubscribed from market data");
    } catch (error) {
      this.logger.error("Failed to unsubscribe from market data:", error);
      throw error;
    }
  }

  /**
   * Start analysis loop
   */
  private startAnalysisLoop(): void {
    // Run analysis every minute
    this.analysisInterval = setInterval(async () => {
      try {
        await this.runAnalysis();
      } catch (error) {
        this.logger.error("Error in analysis loop:", error);
      }
    }, 60000);
    this.analysisInterval.unref();
  }

  /**
   * Run analysis on all symbols
   */
  private async runAnalysis(): Promise<void> {
    for (const symbol of this.config.symbols) {
      try {
        // Get chart analysis from AI
        const analysis = await this.chartAnalysis.analyzeChart({
          pair: symbol,
          timeframe: this.config.timeframes[0],
          candles: [], // This should be populated with actual candle data
          strategy: undefined,
        });

        // Update last analysis
        this.state.lastAnalysis.set(symbol, {
          timestamp: Date.now(),
          signal: analysis.signal,
          confidence: analysis.confidence,
        });

        // Execute trades based on analysis
        if (analysis.confidence >= 0.8) {
          if (analysis.signal === "BUY") {
            await this.executeEntryOrder(symbol, "BUY", analysis);
          } else if (analysis.signal === "SELL") {
            await this.executeEntryOrder(symbol, "SELL", analysis);
          }
        }

        // Check for exit signals
        const position = this.state.activePositions.get(symbol);
        if (position && analysis.confidence >= 0.7) {
          if ((position.side === "LONG" && analysis.signal === "SELL") || (position.side === "SHORT" && analysis.signal === "BUY")) {
            await this.executeExitOrder(symbol, position);
          }
        }
      } catch (error) {
        this.logger.error(`Error analyzing ${symbol}:`, error);
      }
    }
  }

  /**
   * Execute entry order
   */
  private async executeEntryOrder(symbol: string, side: "BUY" | "SELL", analysis: ChartAnalysisResponse): Promise<void> {
    try {
      // Check if we already have a position
      if (this.state.activePositions.has(symbol)) {
        return;
      }

      // Check if we have too many positions
      if (this.state.activePositions.size >= this.config.maxPositions) {
        return;
      }

      // Create order parameters
      const orderParams: OrderParameters = {
        symbol,
        type: "MARKET",
        side,
        quantity: 0.01, // Minimum quantity for testing
        stopPrice: analysis.risk_assessment.stop_loss,
        takeProfit: analysis.risk_assessment.take_profit,
      };

      // Execute order
      const order = await this.broker.createOrder(orderParams);
      this.state.pendingOrders.set(order.id, order);
      this.logger.info(`Created ${side} order for ${symbol}:`, order);
    } catch (error) {
      this.logger.error(`Failed to execute ${side} order for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Execute exit order
   */
  private async executeExitOrder(symbol: string, position: Position): Promise<void> {
    try {
      await this.broker.closePosition(symbol);
      this.state.activePositions.delete(symbol);
      this.logger.info(`Closed position for ${symbol}`);
    } catch (error) {
      this.logger.error(`Failed to close position for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.broker) {
      throw new Error("Broker not initialized");
    }

    // Listen for order updates
    this.broker.on("orderUpdate", (order: Order) => {
      if (order.status === OrderStatus.FILLED) {
        this.state.pendingOrders.delete(order.id);
        // Update position if order was filled
        this.loadExistingPositions().catch((error: Error) => {
          this.logger.error("Failed to update positions after order fill:", error);
        });
      }
    });

    // Listen for market data updates
    this.broker.on("marketData", (data: MarketData) => {
      this.handleMarketData(data);
    });

    // Listen for broker disconnections
    this.broker.on("disconnect", () => {
      this.logger.warn("Broker disconnected, attempting to reconnect...");
      this.reconnectBroker();
    });

    // Listen for broker errors
    this.broker.on("error", (error: Error) => {
      this.logger.error("Broker error:", error);
    });
  }

  private async reconnectBroker(): Promise<void> {
    try {
      await this.broker.connect({
        apiKey: process.env.CAPITAL_COM_API_KEY || "",
        apiSecret: process.env.CAPITAL_COM_API_SECRET || "",
        isDemo: true,
      });
      this.logger.info("Successfully reconnected to broker");
    } catch (error) {
      this.logger.error("Failed to reconnect to broker:", error);
      // Try again in 5 seconds
      setTimeout(() => this.reconnectBroker(), 5000);
    }
  }

  /**
   * Handle market data updates
   */
  private async handleMarketData(data: MarketData): Promise<void> {
    const position = this.state.activePositions.get(data.symbol);
    if (position) {
      // Check for stop loss or take profit hits
      await this.checkStopLossAndTakeProfit(position, data);
    }
  }

  private async checkStopLossAndTakeProfit(position: Position, data: MarketData): Promise<void> {
    const currentPrice = data.currentPrice || (data.bid + data.ask) / 2;
    const stopLoss = position.stopLoss || 0;
    const takeProfit = position.takeProfit || 0;

    // Check stop loss
    if ((position.side === "LONG" && currentPrice <= stopLoss) || (position.side === "SHORT" && currentPrice >= stopLoss)) {
      await this.executeExitOrder(data.symbol, position);
      this.logger.info(`Stop loss hit for ${data.symbol}`);
    }

    // Check take profit
    if ((position.side === "LONG" && currentPrice >= takeProfit) || (position.side === "SHORT" && currentPrice <= takeProfit)) {
      await this.executeExitOrder(data.symbol, position);
      this.logger.info(`Take profit hit for ${data.symbol}`);
    }
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
  }

  /**
   * Get logs for a specific bot instance
   * @param botId The ID of the bot instance
   * @returns Array of AI evaluation logs
   */
  public async getBotLogs(botId: string) {
    try {
      this.logger.info("Fetching logs for bot", { botId });

      const logs = await prisma.aIEvaluation.findMany({
        where: {
          botInstanceId: botId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, // Limit to most recent 50 logs
        include: {
          botInstance: {
            select: {
              pair: true,
              timeframe: true,
            },
          },
        },
      });

      return logs;
    } catch (error) {
      this.logger.error("Failed to fetch bot logs:", { error, botId });
      throw error;
    }
  }
}
