import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { MarketDataStreamService } from "../../src/services/broker/capital-com/market-data-stream.service";
import { MarketData, Candle } from "../../src/services/broker/interfaces/types";

describe("MarketDataStreamService", () => {
  let service: MarketDataStreamService;

  beforeEach(() => {
    service = new MarketDataStreamService(100, 1000);
  });

  afterEach(() => {
    service.destroy();
  });

  describe("Market Data Buffering", () => {
    it("should buffer and aggregate market data", (done) => {
      const symbol = "EURUSD";
      const marketData: MarketData[] = [
        { symbol, bid: 1.1, ask: 1.1001, timestamp: Date.now(), volume: 100 },
        { symbol, bid: 1.1002, ask: 1.1003, timestamp: Date.now(), volume: 200 },
        { symbol, bid: 1.1001, ask: 1.1002, timestamp: Date.now(), volume: 150 },
      ];

      let emittedData: MarketData | null = null;
      service.on("marketData", (data: MarketData) => {
        emittedData = data;
        expect(data.symbol).toBe(symbol);
        expect(data.volume).toBe(450); // Sum of all volumes
        expect(data.bid).toBeDefined();
        expect(data.ask).toBeDefined();
        done();
      });

      // Feed market data
      marketData.forEach((data) => service.handleMarketDataUpdate(data));
    });
  });

  describe("Candle Aggregation", () => {
    it("should aggregate candles for the specified timeframe", (done) => {
      const symbol = "EURUSD";
      const timeframe = "1m";

      service.subscribe(symbol, timeframe);

      const marketData: MarketData[] = [
        { symbol, bid: 1.1, ask: 1.1001, timestamp: Date.now(), volume: 100 },
        { symbol, bid: 1.1002, ask: 1.1003, timestamp: Date.now(), volume: 200 },
        { symbol, bid: 1.1001, ask: 1.1002, timestamp: Date.now(), volume: 150 },
      ];

      service.on("candle", ({ symbol: s, timeframe: t, candle }) => {
        expect(s).toBe(symbol);
        expect(t).toBe(timeframe);
        expect(candle).toBeDefined();
        expect(candle.open).toBeGreaterThan(0);
        expect(candle.high).toBeGreaterThan(0);
        expect(candle.low).toBeGreaterThan(0);
        expect(candle.close).toBeGreaterThan(0);
        expect(candle.volume).toBeGreaterThan(0);
        done();
      });

      // Feed market data
      marketData.forEach((data) => service.handleMarketDataUpdate(data));
    });
  });

  describe("Resource Management", () => {
    it("should clean up resources on destroy", () => {
      const symbol = "EURUSD";
      const timeframe = "1m";

      service.subscribe(symbol, timeframe);
      service.handleMarketDataUpdate({
        symbol,
        bid: 1.1,
        ask: 1.1001,
        timestamp: Date.now(),
        volume: 100,
      });

      // Add some listeners
      const listener = () => {};
      service.on("marketData", listener);
      service.on("candle", listener);

      // Destroy service
      service.destroy();

      // Verify cleanup
      expect(service.listenerCount("marketData")).toBe(0);
      expect(service.listenerCount("candle")).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid timeframes", () => {
      const symbol = "EURUSD";
      const invalidTimeframe = "invalid";

      expect(() => {
        service.subscribe(symbol, invalidTimeframe);
      }).toThrow("Invalid timeframe");
    });

    it("should handle missing data gracefully", (done) => {
      const symbol = "EURUSD";
      const timeframe = "1m";

      service.subscribe(symbol, timeframe);

      // Wait for aggregation interval
      setTimeout(() => {
        service.unsubscribe(symbol, timeframe);
        done();
      }, 1100);
    });
  });
});
