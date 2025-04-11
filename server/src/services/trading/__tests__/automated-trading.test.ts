import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from "@jest/globals";
import { AutomatedTradingService } from "../automated-trading.service";
import { AIService } from "../../ai/ai.service";
import { ChartAnalysisService } from "../../ai/chart-analysis.service";
import { CapitalService } from "../../broker/capital-com/capital.service";
import { StorageService } from "../../storage/storage.service";
import { EventEmitter } from "events";
import type { Order, Position, MarketData, OrderStatus, AccountBalance, OrderParameters } from "../../broker/interfaces/types";
import type { ChartAnalysisResponse } from "../../ai/chart-analysis.service";

// Mock dependencies
jest.mock("../../ai/ai.service");
jest.mock("../../ai/chart-analysis.service");
jest.mock("../../broker/capital-com/capital.service");
jest.mock("../../storage/storage.service");

describe("AutomatedTradingService", () => {
  let tradingService: AutomatedTradingService;
  let broker: jest.Mocked<CapitalService>;
  let aiService: jest.Mocked<AIService>;
  let chartAnalysis: jest.Mocked<ChartAnalysisService>;

  const mockConfig = {
    maxPositions: 5,
    maxRiskPerTrade: 2,
    maxDrawdown: 10,
    timeframes: ["1H", "4H", "1D"],
    symbols: ["EURUSD", "GBPUSD", "USDJPY"],
  };

  beforeAll(() => {
    // Set up mock implementations
    broker = new CapitalService({
      apiKey: "test-key",
      apiSecret: "test-secret",
      isDemo: true,
    }) as jest.Mocked<CapitalService>;
    aiService = new AIService() as jest.Mocked<AIService>;
    chartAnalysis = new ChartAnalysisService() as jest.Mocked<ChartAnalysisService>;

    // Mock broker methods
    broker.connect.mockResolvedValue();
    broker.isConnected.mockReturnValue(false);
    broker.getPositions.mockResolvedValue([]);
    broker.subscribeToMarketData.mockResolvedValue();
    broker.getMarketData.mockResolvedValue({
      symbol: "EURUSD",
      bid: 1.1,
      ask: 1.1001,
      timestamp: Date.now(),
    });

    // Mock chart analysis methods
    chartAnalysis.analyzeChart.mockResolvedValue({
      signal: "BUY",
      confidence: 0.85,
      analysis: {
        market_condition: "Uptrend",
        key_levels: [1.099, 1.102],
        strategy_rules_met: true,
        filters_passed: ["trend", "momentum"],
        indicators: {},
      },
      risk_assessment: {
        stop_loss: 1.099,
        take_profit: 1.102,
        risk_reward_ratio: 2,
      },
      risk_percent_score: 75,
      prompt: "",
      rawResponse: {},
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tradingService = new AutomatedTradingService(broker, aiService, chartAnalysis, mockConfig);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with correct configuration", () => {
      expect(tradingService).toBeDefined();
    });

    it("should connect to broker on start", async () => {
      await tradingService.start();
      expect(broker.connect).toHaveBeenCalled();
    });

    it("should load existing positions on start", async () => {
      await tradingService.start();
      expect(broker.getPositions).toHaveBeenCalled();
    });

    it("should subscribe to market data for configured symbols", async () => {
      await tradingService.start();
      expect(broker.subscribeToMarketData).toHaveBeenCalledTimes(mockConfig.symbols.length * mockConfig.timeframes.length);
    });
  });

  describe("Trading Logic", () => {
    beforeEach(async () => {
      await tradingService.start();
    });

    it("should execute trades when analysis signal is strong", async () => {
      // Simulate market data update
      const marketData: MarketData = {
        symbol: "EURUSD",
        bid: 1.1,
        ask: 1.1001,
        timestamp: Date.now(),
      };

      // Emit market data update
      broker.emit("marketData", marketData);

      // Wait for analysis to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify trade execution
      expect(broker.createOrder).toHaveBeenCalled();
    });

    it("should respect position limits", async () => {
      // Mock existing positions
      broker.getPositions.mockResolvedValue([
        {
          id: "pos1",
          symbol: "EURUSD",
          side: "LONG",
          leverage: 1,
          entryPrice: 1.1,
          currentPrice: 1.1,
          quantity: 1000,
          unrealizedPnL: 0,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // ... similar positions for other pairs
      ] as Position[]);

      // Simulate market data update
      const marketData: MarketData = {
        symbol: "EURUSD",
        bid: 1.1,
        ask: 1.1001,
        timestamp: Date.now(),
      };

      // Emit market data update
      broker.emit("marketData", marketData);

      // Wait for analysis to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify no new trades are executed
      expect(broker.createOrder).not.toHaveBeenCalled();
    });

    it("should handle order updates correctly", async () => {
      // Simulate order fill
      const order: Order = {
        id: "test-order",
        symbol: "EURUSD",
        side: "BUY",
        type: "MARKET",
        status: "FILLED" as OrderStatus,
        quantity: 1000,
        filledQuantity: 1000,
        price: 1.1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      broker.emit("orderUpdate", order);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify position tracking is updated
      expect(broker.getPositions).toHaveBeenCalled();
    });

    it("should handle broker disconnections", async () => {
      broker.emit("disconnect");

      // Wait for reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(broker.connect).toHaveBeenCalled();
    });
  });

  describe("Risk Management", () => {
    it("should respect maximum risk per trade", async () => {
      const marketData: MarketData = {
        symbol: "EURUSD",
        bid: 1.1,
        ask: 1.1001,
        timestamp: Date.now(),
      };

      const mockBalance: AccountBalance = {
        total: 10000,
        available: 10000,
        locked: 0,
        unrealizedPnL: 0,
        currency: "USD",
      };

      broker.getBalance.mockResolvedValue(mockBalance);
      broker.getMinQuantity.mockResolvedValue(0.01);

      // Emit market data update
      broker.emit("marketData", marketData);

      // Wait for analysis to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get the order parameters from the mock
      const orderParams = (broker.createOrder as jest.Mock).mock.calls[0][0] as OrderParameters;
      const riskAmount = (mockConfig.maxRiskPerTrade / 100) * mockBalance.total;
      const stopLoss = Math.abs(orderParams.stopPrice! - marketData.ask);
      const expectedQuantity = Math.floor(riskAmount / stopLoss / 0.01) * 0.01;

      expect(orderParams.quantity).toBeLessThanOrEqual(expectedQuantity);
    });

    it("should close positions when stop loss is hit", async () => {
      // Set up mock position
      const position: Position = {
        id: "test-position",
        symbol: "EURUSD",
        side: "LONG",
        leverage: 1,
        entryPrice: 1.1,
        currentPrice: 1.099,
        quantity: 1000,
        unrealizedPnL: -100,
        realizedPnL: 0,
        stopLoss: 1.0995,
        takeProfit: 1.102,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      broker.getPositions.mockResolvedValue([position]);

      // Simulate price drop below stop loss
      const marketData: MarketData = {
        symbol: "EURUSD",
        bid: 1.0994,
        ask: 1.0995,
        timestamp: Date.now(),
      };

      broker.emit("marketData", marketData);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(broker.closePosition).toHaveBeenCalledWith("EURUSD");
    });
  });

  describe("Error Handling", () => {
    it("should handle analysis errors gracefully", async () => {
      chartAnalysis.analyzeChart.mockRejectedValueOnce(new Error("Analysis failed"));

      const marketData: MarketData = {
        symbol: "EURUSD",
        bid: 1.1,
        ask: 1.1001,
        timestamp: Date.now(),
      };

      // Emit market data update
      broker.emit("marketData", marketData);

      // Wait for analysis to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify no trades are executed on error
      expect(broker.createOrder).not.toHaveBeenCalled();
    });

    it("should handle broker errors gracefully", async () => {
      broker.createOrder.mockRejectedValueOnce(new Error("Order failed"));

      const marketData: MarketData = {
        symbol: "EURUSD",
        bid: 1.1,
        ask: 1.1001,
        timestamp: Date.now(),
      };

      // Emit market data update
      broker.emit("marketData", marketData);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify service is still running
      expect(tradingService["isRunning"]).toBeTruthy();
    });
  });

  describe("Performance", () => {
    it("should handle high frequency market data updates", async () => {
      const updates = 1000;
      const startTime = Date.now();

      for (let i = 0; i < updates; i++) {
        broker.emit("marketData", {
          symbol: "EURUSD",
          bid: 1.1 + i * 0.0001,
          ask: 1.1001 + i * 0.0001,
          timestamp: Date.now(),
        });
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify performance (should process 1000 updates in under 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
