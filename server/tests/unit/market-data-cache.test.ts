import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { MarketDataCacheService } from "../../src/services/broker/capital-com/market-data-cache.service";
import { Candle } from "../../src/services/broker/interfaces/types";
import { PrismaClient } from "@prisma/client";

jest.mock("@prisma/client");

describe("MarketDataCacheService", () => {
  let service: MarketDataCacheService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      marketDataCache: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    } as unknown as jest.Mocked<PrismaClient>;

    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    service = new MarketDataCacheService();
  });

  afterEach(async () => {
    await service.destroy();
    jest.clearAllMocks();
  });

  describe("getCachedCandles", () => {
    it("should return null when no cache exists", async () => {
      mockPrisma.marketDataCache.findFirst.mockResolvedValue(null);

      const result = await service.getCachedCandles("EURUSD", "1h", Date.now() - 3600000, Date.now());
      expect(result).toBeNull();
    });

    it("should return cached data when valid cache exists", async () => {
      const mockCandles: Candle[] = [
        {
          timestamp: Date.now(),
          open: 1.1,
          high: 1.11,
          low: 1.09,
          close: 1.105,
          volume: 1000,
        },
      ];

      mockPrisma.marketDataCache.findFirst.mockResolvedValue({
        data: JSON.stringify(mockCandles),
        lastUpdated: new Date(),
        isComplete: true,
      } as any);

      const result = await service.getCachedCandles("EURUSD", "1h", Date.now() - 3600000, Date.now());
      expect(result).toEqual(mockCandles);
    });
  });

  describe("cacheCandles", () => {
    it("should store candles in cache", async () => {
      const mockCandles: Candle[] = [
        {
          timestamp: Date.now(),
          open: 1.1,
          high: 1.11,
          low: 1.09,
          close: 1.105,
          volume: 1000,
        },
      ];

      await service.cacheCandles("EURUSD", "1h", Date.now() - 3600000, Date.now(), mockCandles);

      expect(mockPrisma.marketDataCache.upsert).toHaveBeenCalled();
      const upsertArgs = mockPrisma.marketDataCache.upsert.mock.calls[0][0];
      expect(JSON.parse(upsertArgs.create.data)).toEqual(mockCandles);
    });
  });

  describe("invalidateCache", () => {
    it("should remove cache entries for symbol", async () => {
      await service.invalidateCache("EURUSD");
      expect(mockPrisma.marketDataCache.deleteMany).toHaveBeenCalledWith({
        where: {
          symbol: "EURUSD",
        },
      });
    });

    it("should remove cache entries for symbol and timeframe", async () => {
      await service.invalidateCache("EURUSD", "1h");
      expect(mockPrisma.marketDataCache.deleteMany).toHaveBeenCalledWith({
        where: {
          symbol: "EURUSD",
          timeframe: "1h",
        },
      });
    });
  });
});
