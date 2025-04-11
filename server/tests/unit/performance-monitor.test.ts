import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { PerformanceMonitorService } from "../../src/services/trading/performance-monitor.service";
import { PrismaClient, Prisma } from "@prisma/client";

jest.mock("@prisma/client");

describe("PerformanceMonitorService", () => {
  let service: PerformanceMonitorService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  const mockAlertConfig = {
    maxDrawdown: 10,
    minWinRate: 40,
    maxDailyLoss: 1000,
    maxMarginUsage: 80,
  };

  beforeEach(() => {
    mockPrisma = {
      trade: {
        findMany: jest.fn(),
      },
      accountBalance: {
        findFirst: jest.fn(),
      },
      performanceMetrics: {
        create: jest.fn(),
      },
      $disconnect: jest.fn(),
    } as unknown as jest.Mocked<PrismaClient>;

    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    service = new PerformanceMonitorService(mockAlertConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialize", () => {
    it("should load historical metrics and start updates", async () => {
      // Mock trade data
      const mockTrades = [
        {
          id: "1",
          userId: "user1",
          botInstanceId: "bot1",
          signalId: null,
          pair: "BTC/USD",
          entryPrice: new Prisma.Decimal(50000),
          exitPrice: new Prisma.Decimal(51000),
          quantity: new Prisma.Decimal(1),
          profitLoss: new Prisma.Decimal(1000),
          riskPercent: new Prisma.Decimal(1),
          riskReward: new Prisma.Decimal(2),
          createdAt: new Date(),
          closedAt: new Date(),
          metadata: {},
        },
        {
          id: "2",
          userId: "user1",
          botInstanceId: "bot1",
          signalId: null,
          pair: "BTC/USD",
          entryPrice: new Prisma.Decimal(50000),
          exitPrice: new Prisma.Decimal(49000),
          quantity: new Prisma.Decimal(1),
          profitLoss: new Prisma.Decimal(-1000),
          riskPercent: new Prisma.Decimal(1),
          riskReward: new Prisma.Decimal(2),
          createdAt: new Date(),
          closedAt: new Date(),
          metadata: {},
        },
      ];

      mockPrisma.trade.findMany.mockResolvedValueOnce(mockTrades); // Today's trades
      mockPrisma.trade.findMany.mockResolvedValueOnce(mockTrades); // All-time trades

      // Initialize service
      await service.initialize();

      // Verify metrics were loaded
      expect(mockPrisma.trade.findMany).toHaveBeenCalledTimes(2);

      const metrics = service.getMetrics();
      expect(metrics.totalTrades).toBe(2);
      expect(metrics.winningTrades).toBe(1);
      expect(metrics.losingTrades).toBe(1);
      expect(metrics.winRate).toBe(50);
    });
  });

  describe("updateMetrics", () => {
    it("should update metrics and store snapshot", async () => {
      // Mock open positions
      const mockOpenPositions = [
        {
          id: "1",
          userId: "user1",
          botInstanceId: "bot1",
          signalId: null,
          pair: "BTC/USD",
          entryPrice: new Prisma.Decimal(50000),
          exitPrice: null,
          quantity: new Prisma.Decimal(1),
          profitLoss: null,
          riskPercent: new Prisma.Decimal(1),
          riskReward: null,
          createdAt: new Date(),
          closedAt: null,
          metadata: {},
        },
      ];

      // Mock account balance
      const mockBalance = {
        id: "1",
        timestamp: new Date(),
        total: new Prisma.Decimal(100000),
        available: new Prisma.Decimal(90000),
        locked: new Prisma.Decimal(10000),
        currency: "USD",
      };

      mockPrisma.trade.findMany.mockResolvedValue(mockOpenPositions);
      mockPrisma.accountBalance.findFirst.mockResolvedValue(mockBalance);

      // Initialize service
      await service.initialize();

      // Verify metrics were updated
      const metrics = service.getMetrics();
      expect(metrics.openPositions).toBe(1);
      expect(metrics.marginUsage).toBe(50); // (1 * 50000) / 100000 * 100

      // Verify metrics snapshot was stored
      expect(mockPrisma.performanceMetrics.create).toHaveBeenCalled();
    });
  });

  describe("alerts", () => {
    it("should emit alerts when thresholds are exceeded", (done) => {
      // Set up metrics that will trigger alerts
      const metrics = service.getMetrics();
      metrics.maxDrawdown = 15; // Above maxDrawdown threshold
      metrics.winRate = 30; // Below minWinRate threshold
      metrics.dailyProfitLoss = -1500; // Above maxDailyLoss threshold
      metrics.marginUsage = 90; // Above maxMarginUsage threshold

      // Listen for alerts
      let alertCount = 0;
      service.on("alert", (alert) => {
        alertCount++;

        if (alert.type === "MAX_DRAWDOWN") {
          expect(alert.level).toBe("critical");
        } else if (alert.type === "LOW_WIN_RATE") {
          expect(alert.level).toBe("warning");
        } else if (alert.type === "MAX_DAILY_LOSS") {
          expect(alert.level).toBe("critical");
        } else if (alert.type === "HIGH_MARGIN_USAGE") {
          expect(alert.level).toBe("warning");
        }

        if (alertCount === 4) {
          done();
        }
      });

      // Trigger alerts check
      service["checkAlerts"]();
    });
  });

  describe("cleanup", () => {
    it("should disconnect from database and remove listeners", async () => {
      await service.destroy();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
