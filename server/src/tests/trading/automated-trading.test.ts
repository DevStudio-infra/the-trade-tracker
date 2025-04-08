import { PrismaClient } from "@prisma/client";
import { AutomatedTradingService } from "../../services/trading/automated-trading.service";
import { RiskManagementService } from "../../services/trading/risk-management.service";
import { createLogger } from "../../utils/logger";

const logger = createLogger("automated-trading-test");
const prisma = new PrismaClient();
const tradingService = new AutomatedTradingService();
const riskManager = new RiskManagementService();

describe("Automated Trading System", () => {
  let testBot: any;
  let testUserId: string;
  let testStrategyId: string;

  beforeAll(async () => {
    // Create test user and strategy
    const testUser = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
      },
    });
    testUserId = testUser.id;

    const testStrategy = await prisma.strategy.create({
      data: {
        name: "Test Strategy",
        description: "Test strategy for automated trading",
        userId: testUserId,
        rules: {
          indicators: ["EMA", "RSI"],
          conditions: ["EMA_CROSS", "RSI_OVERSOLD"],
        },
        timeframes: ["5", "15", "30"],
        riskParameters: {
          stopLoss: 1,
          takeProfit: 2,
        },
        isActive: true,
        isPublic: false,
      },
    });
    testStrategyId = testStrategy.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.trade.deleteMany({ where: { botInstanceId: testBot?.id } });
    await prisma.signal.deleteMany({ where: { botInstanceId: testBot?.id } });
    await prisma.botInstance.deleteMany({ where: { id: testBot?.id } });
    await prisma.strategy.deleteMany({ where: { id: testStrategyId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe("Bot Creation and Management", () => {
    it("should create a new bot with valid configuration", async () => {
      const config = {
        strategyId: testStrategyId,
        pair: "EURUSD",
        timeframe: "5",
        riskSettings: {
          maxPositionSize: 1000,
          maxDailyLoss: 100,
          maxDrawdown: 5,
          stopLossPercentage: 1,
          takeProfitRatio: 2,
        },
      };

      testBot = await tradingService.createBot(testUserId, config);
      expect(testBot).toBeDefined();
      expect(testBot.userId).toBe(testUserId);
      expect(testBot.pair).toBe("EURUSD");
      expect(testBot.isActive).toBe(false);
    });

    it("should start a bot successfully", async () => {
      await tradingService.startBot(testBot.id);
      const status = await tradingService.getBotStatus(testBot.id);
      expect(status.isActive).toBe(true);
    });

    it("should stop a bot successfully", async () => {
      await tradingService.stopBot(testBot.id);
      const status = await tradingService.getBotStatus(testBot.id);
      expect(status.isActive).toBe(false);
    });
  });

  describe("Risk Management", () => {
    it("should validate trade parameters correctly", async () => {
      const validation = await riskManager.validateTrade(
        testBot.id,
        500, // within maxPositionSize
        1.1 // sample entry price
      );
      expect(validation.allowed).toBe(true);
    });

    it("should reject trades exceeding position size limit", async () => {
      const validation = await riskManager.validateTrade(
        testBot.id,
        2000, // exceeds maxPositionSize
        1.1
      );
      expect(validation.allowed).toBe(false);
      expect(validation.reason).toContain("exceeds maximum");
    });

    it("should calculate stop loss correctly", () => {
      const entryPrice = 1.1;
      const stopLoss = riskManager.calculateStopLoss(
        entryPrice,
        testBot.riskSettings,
        true // long position
      );
      expect(stopLoss).toBeLessThan(entryPrice);
    });

    it("should calculate take profit correctly", () => {
      const entryPrice = 1.1;
      const stopLoss = 1.09;
      const takeProfit = riskManager.calculateTakeProfit(
        entryPrice,
        stopLoss,
        testBot.riskSettings,
        true // long position
      );
      expect(takeProfit).toBeGreaterThan(entryPrice);
    });
  });

  describe("Trading Operations", () => {
    it("should analyze trading pair and generate valid signals", async () => {
      await tradingService.startBot(testBot.id);
      const signal = await tradingService.analyzeTradingPair(testBot.id);

      if (signal) {
        expect(signal.botInstanceId).toBe(testBot.id);
        expect(signal.stopLoss).toBeDefined();
        expect(signal.takeProfit).toBeDefined();
        expect(signal.status).toBe("PENDING");
      }
    });

    it("should execute trades based on valid signals", async () => {
      const signal = await prisma.signal.create({
        data: {
          botInstanceId: testBot.id,
          userId: testUserId,
          pair: "EURUSD",
          timeframe: "5",
          signalType: "LONG",
          confidence: 85,
          stopLoss: 1.09,
          takeProfit: 1.11,
          riskScore: 3,
          status: "PENDING",
          chartImageUrl: "test-chart-url",
        },
      });

      const trade = await tradingService.executeTrade(signal);
      expect(trade).toBeDefined();
      expect(trade.botInstanceId).toBe(testBot.id);
      expect(trade.signalId).toBe(signal.id);
    });
  });

  describe("Performance Monitoring", () => {
    it("should track daily statistics correctly", async () => {
      // Create some test trades
      await prisma.trade.createMany({
        data: [
          {
            botInstanceId: testBot.id,
            userId: testUserId,
            pair: "EURUSD",
            entryPrice: 1.1,
            exitPrice: 1.11,
            profitLoss: 100,
            createdAt: new Date(),
          },
          {
            botInstanceId: testBot.id,
            userId: testUserId,
            pair: "EURUSD",
            entryPrice: 1.1,
            exitPrice: 1.09,
            profitLoss: -100,
            createdAt: new Date(),
          },
        ],
      });

      const status = await tradingService.getBotStatus(testBot.id);
      expect(status.dailyStats.trades).toBe(2);
      expect(status.dailyStats.winRate).toBe(50);
      expect(status.dailyStats.profitLoss).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid bot IDs gracefully", async () => {
      await expect(tradingService.getBotStatus("invalid-id")).rejects.toThrow();
    });

    it("should handle market condition checks", async () => {
      const conditions = await riskManager.checkMarketConditions("EURUSD", "5");
      expect(conditions).toHaveProperty("normal");
    });

    it("should prevent operations on inactive bots", async () => {
      await tradingService.stopBot(testBot.id);
      const signal = await tradingService.analyzeTradingPair(testBot.id);
      expect(signal).toBeNull();
    });
  });
});
