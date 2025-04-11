import { EventEmitter } from "events";
import { createLogger } from "../../../utils/logger";
import { IBroker, IBrokerCredentials } from "../interfaces/broker.interface";
import { Order, Position, OrderParameters, OrderType, OrderStatus, MarketData } from "../interfaces/types";
import { AIService } from "../../ai/ai.service";
import { ChartAnalysisService } from "../../ai/chart-analysis.service";

interface ChartAnalysis {
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  stopLoss: number;
  takeProfit: number;
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
   * Start automated trading
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.logger.info("Starting automated trading...");

      // Connect to broker if not connected
      if (!this.broker.isConnected()) {
        await this.broker.connect({} as IBrokerCredentials);
      }

      // Load existing positions
      await this.loadExistingPositions();

      // Subscribe to market data for all symbols
      await this.subscribeToMarketData();

      // Start analysis loop
      this.startAnalysisLoop();

      this.isRunning = true;
      this.emit("started");
      this.logger.info("Automated trading started successfully");
    } catch (error) {
      this.logger.error("Failed to start automated trading:", error);
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
          await this.broker.subscribeToMarketData(symbol, (data: MarketData) => this.handleMarketData(symbol, data), timeframe);
        }
      }
      this.logger.info("Subscribed to market data for all symbols");
    } catch (error) {
      this.logger.error("Failed to subscribe to market data:", error);
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
   * Handle market data updates
   */
  private handleMarketData(symbol: string, data: MarketData): void {
    // Update position tracking
    const position = this.state.activePositions.get(symbol);
    if (position) {
      // Check for stop loss or take profit hits
      this.checkStopLossAndTakeProfit(symbol, position, data).catch((error: Error) => {
        this.logger.error(`Failed to check SL/TP for ${symbol}:`, error);
      });
    }
  }

  /**
   * Execute entry order
   */
  private async executeEntryOrder(symbol: string, side: "BUY" | "SELL", analysis: ChartAnalysis): Promise<void> {
    try {
      // Check if we already have a position
      if (this.state.activePositions.has(symbol)) {
        return;
      }

      // Check if we have too many positions
      if (this.state.activePositions.size >= this.config.maxPositions) {
        return;
      }

      // Calculate position size based on risk
      const riskAmount = await this.calculateRiskAmount(symbol, analysis.stopLoss);
      const quantity = await this.calculatePositionSize(symbol, riskAmount, analysis.stopLoss);

      // Create order parameters
      const orderParams: OrderParameters = {
        symbol,
        type: "MARKET",
        side,
        quantity,
        stopPrice: analysis.stopLoss,
        takeProfit: analysis.takeProfit,
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
   * Run analysis on all symbols
   */
  private async runAnalysis(): Promise<void> {
    for (const symbol of this.config.symbols) {
      try {
        // Get chart analysis from AI
        const analysis = await this.chartAnalysis.analyzeChart({
          symbol,
          timeframes: this.config.timeframes,
        });

        // Update last analysis
        this.state.lastAnalysis.set(symbol, {
          timestamp: Date.now(),
          signal: analysis.signal === "NO_SIGNAL" ? "HOLD" : analysis.signal,
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
   * Check if stop loss or take profit has been hit
   */
  private async checkStopLossAndTakeProfit(symbol: string, position: Position, data: MarketData): Promise<void> {
    const currentPrice = (data.bid + data.ask) / 2;

    // Check stop loss
    if ((position.side === "LONG" && currentPrice <= position.stopLoss) || (position.side === "SHORT" && currentPrice >= position.stopLoss)) {
      await this.executeExitOrder(symbol, position);
      this.logger.info(`Stop loss hit for ${symbol}`);
    }

    // Check take profit
    if ((position.side === "LONG" && currentPrice >= position.takeProfit) || (position.side === "SHORT" && currentPrice <= position.takeProfit)) {
      await this.executeExitOrder(symbol, position);
      this.logger.info(`Take profit hit for ${symbol}`);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for order updates
    this.broker.on("orderUpdate", (order: Order) => {
      if (order.status === "FILLED") {
        this.state.pendingOrders.delete(order.id);
        // Update position if order was filled
        this.loadExistingPositions().catch((error: Error) => {
          this.logger.error("Failed to update positions after order fill:", error);
        });
      }
    });

    // ... rest of the event listeners ...
  }

  // ... rest of the class implementation ...
}
