import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { CapitalService } from "../capital.service";
import { IBrokerCredentials } from "../../interfaces/broker.interface";
import { OrderParameters } from "../../interfaces/types";

// Skip these tests if no API credentials are provided
const runIntegrationTests = process.env.CAPITAL_API_KEY && process.env.CAPITAL_API_SECRET;

(runIntegrationTests ? describe : describe.skip)("CapitalService Integration Tests", () => {
  let service: CapitalService;
  const testSymbol = "EURUSD";

  beforeAll(async () => {
    const credentials: IBrokerCredentials = {
      apiKey: process.env.CAPITAL_API_KEY!,
      apiSecret: process.env.CAPITAL_API_SECRET!,
      isDemo: true, // Always use demo account for testing
    };

    service = new CapitalService(credentials);
    await service.connect(credentials);
  });

  afterAll(async () => {
    if (service) {
      await service.disconnect();
    }
  });

  describe("Connection", () => {
    it("should connect to the API", () => {
      expect(service.isConnected()).toBe(true);
    });

    it("should validate credentials", async () => {
      const isValid = await service.validateCredentials();
      expect(isValid).toBe(true);
    });
  });

  describe("Market Data", () => {
    it("should get market data", async () => {
      const data = await service.getMarketData(testSymbol);
      expect(data).toEqual(
        expect.objectContaining({
          symbol: testSymbol,
          bid: expect.any(Number),
          ask: expect.any(Number),
          timestamp: expect.any(Number),
        })
      );
    });

    it("should get candles", async () => {
      const candles = await service.getCandles(testSymbol, "1h", 10);
      expect(candles).toHaveLength(10);
      expect(candles[0]).toEqual(
        expect.objectContaining({
          timestamp: expect.any(Number),
          open: expect.any(Number),
          high: expect.any(Number),
          low: expect.any(Number),
          close: expect.any(Number),
          volume: expect.any(Number),
        })
      );
    });

    it("should subscribe to market data updates", async () => {
      const updates: any[] = [];
      await service.subscribeToMarketData(testSymbol, (data) => {
        updates.push(data);
      });

      // Wait for some updates
      await new Promise((resolve) => setTimeout(resolve, 5000));

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0]).toEqual(
        expect.objectContaining({
          symbol: testSymbol,
          bid: expect.any(Number),
          ask: expect.any(Number),
          timestamp: expect.any(Number),
        })
      );

      await service.unsubscribeFromMarketData(testSymbol);
    });
  });

  describe("Trading Operations", () => {
    it("should get account balance", async () => {
      const balance = await service.getBalance();
      expect(balance).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          available: expect.any(Number),
          locked: expect.any(Number),
          currency: expect.any(String),
        })
      );
    });

    it("should create and cancel a limit order", async () => {
      const marketData = await service.getMarketData(testSymbol);
      const limitPrice = marketData.bid * 0.99; // 1% below current price

      const orderParams: OrderParameters = {
        symbol: testSymbol,
        type: "LIMIT",
        side: "BUY",
        quantity: 0.01,
        price: limitPrice,
      };

      const order = await service.createOrder(orderParams);
      expect(order).toEqual(
        expect.objectContaining({
          symbol: testSymbol,
          type: "LIMIT",
          side: "BUY",
          quantity: 0.01,
          price: limitPrice,
          status: expect.stringMatching(/PENDING|OPEN/),
        })
      );

      // Cancel the order
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled).toBe(true);
    });

    it("should handle market order rejection gracefully", async () => {
      const orderParams: OrderParameters = {
        symbol: testSymbol,
        type: "MARKET",
        side: "BUY",
        quantity: 999999, // Unreasonably large quantity to trigger rejection
      };

      await expect(service.createOrder(orderParams)).rejects.toThrow();
    });
  });

  describe("Performance", () => {
    it("should handle multiple market data requests efficiently", async () => {
      const symbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"];
      const startTime = Date.now();

      await Promise.all(symbols.map((symbol) => service.getMarketData(symbol)));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it("should maintain WebSocket connection stability", async () => {
      const symbol = testSymbol;
      let disconnections = 0;

      // Subscribe and monitor for 30 seconds
      const updates: any[] = [];
      await service.subscribeToMarketData(symbol, (data) => {
        updates.push(data);
      });

      await new Promise((resolve) => setTimeout(resolve, 30000));

      await service.unsubscribeFromMarketData(symbol);

      // Should have received updates consistently
      const updateIntervals = updates.map((u, i) => (i > 0 ? u.timestamp - updates[i - 1].timestamp : 0));
      const maxInterval = Math.max(...updateIntervals.slice(1));

      // No gaps longer than 5 seconds
      expect(maxInterval).toBeLessThan(5000);
      // Should have received multiple updates
      expect(updates.length).toBeGreaterThan(10);
    });
  });
});
