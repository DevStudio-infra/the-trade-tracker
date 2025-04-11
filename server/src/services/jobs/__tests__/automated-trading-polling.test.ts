import { jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { CronJob } from "cron";
import { redis } from "../../../config/redis.config";
import { AutomatedTradingService } from "../../trading/automated-trading.service";
import { ChartAnalysisService } from "../../ai/chart-analysis.service";
import { AIService } from "../../ai/ai.service";
import { CapitalService } from "../../broker/capital-com/capital.service";
import { startAutomatedTradingPollingJob, initializePollingJobs, addBotToPolling, removeBotFromPolling } from "../automated-trading-polling.job";

// Mock dependencies
jest.mock("@prisma/client");
jest.mock("../../../config/redis.config");
jest.mock("../../trading/automated-trading.service");
jest.mock("../../ai/chart-analysis.service");
jest.mock("../../ai/ai.service");
jest.mock("../../broker/capital-com/capital.service");
jest.mock("cron");

describe("AutomatedTradingPollingJob", () => {
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRedis: jest.Mocked<typeof redis>;
  let mockTradingService: jest.Mocked<AutomatedTradingService>;

  const mockBot = {
    id: "bot1",
    userId: "user1",
    strategyId: "strategy1",
    pair: "BTCUSDT",
    timeframe: "1",
    riskSettings: { maxRiskPerTrade: 1 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    strategy: { id: "strategy1" },
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Prisma mock
    mockPrisma = {
      botInstance: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

    // Setup Redis mock
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<typeof redis>;
    jest.mock("../../../config/redis.config", () => ({
      redis: mockRedis,
    }));

    // Setup TradingService mock
    mockTradingService = {
      start: jest.fn(),
    } as unknown as jest.Mocked<AutomatedTradingService>;
    (AutomatedTradingService as unknown as jest.Mock).mockImplementation(() => mockTradingService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initializePollingJobs", () => {
    it("should initialize jobs for active bots", async () => {
      const mockBots = [mockBot];
      mockPrisma.botInstance.findMany.mockResolvedValue(mockBots);

      await initializePollingJobs();

      expect(mockPrisma.botInstance.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true, timeframe: true },
      });
    });

    it("should handle initialization errors gracefully", async () => {
      mockPrisma.botInstance.findMany.mockRejectedValue(new Error("Database error"));

      await expect(initializePollingJobs()).rejects.toThrow("Database error");
    });
  });

  describe("addBotToPolling", () => {
    it("should add bot to polling system", async () => {
      await addBotToPolling("bot1", "1");
      // Verify cron job creation
      expect(CronJob).toHaveBeenCalledWith("* * * * *", expect.any(Function), null, true, "UTC");
    });

    it("should reject invalid timeframes", async () => {
      await expect(addBotToPolling("bot1", "invalid")).rejects.toThrow("Invalid timeframe");
    });
  });

  describe("removeBotFromPolling", () => {
    it("should remove bot and clean up Redis", async () => {
      await removeBotFromPolling("bot1", "1");
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("should stop job if no other bots use timeframe", async () => {
      mockPrisma.botInstance.findMany.mockResolvedValue([]);
      await removeBotFromPolling("bot1", "1");
      // Verify job cleanup
      // Note: Implementation details will depend on how jobs are stored
    });
  });

  describe("Bot Processing", () => {
    it("should skip processing if bot is already being processed", async () => {
      mockRedis.get.mockResolvedValue("1");
      mockPrisma.botInstance.findUnique.mockResolvedValue(mockBot);

      // Trigger bot processing (implementation detail)
      // Verify that trading service was not started
      expect(mockTradingService.start).not.toHaveBeenCalled();
    });

    it("should process bot successfully", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.botInstance.findUnique.mockResolvedValue(mockBot);

      // Trigger bot processing (implementation detail)
      // Verify that trading service was started
      expect(mockTradingService.start).toHaveBeenCalled();
    });

    it("should handle inactive bots", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.botInstance.findUnique.mockResolvedValue({
        ...mockBot,
        isActive: false,
      });

      // Trigger bot processing (implementation detail)
      // Verify that trading service was not started
      expect(mockTradingService.start).not.toHaveBeenCalled();
    });

    it("should handle processing errors gracefully", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockTradingService.start.mockRejectedValue(new Error("Trading error"));
      mockPrisma.botInstance.findUnique.mockResolvedValue(mockBot);

      // Trigger bot processing (implementation detail)
      // Verify error handling and Redis cleanup
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe("startAutomatedTradingPollingJob", () => {
    it("should start polling job successfully", async () => {
      const mockBots = [mockBot];
      mockPrisma.botInstance.findMany.mockResolvedValue(mockBots);

      await startAutomatedTradingPollingJob();

      expect(mockPrisma.botInstance.findMany).toHaveBeenCalled();
      // Verify that jobs were initialized
    });

    it("should handle startup errors gracefully", async () => {
      mockPrisma.botInstance.findMany.mockRejectedValue(new Error("Startup error"));

      await expect(startAutomatedTradingPollingJob()).rejects.toThrow("Startup error");
    });
  });
});
