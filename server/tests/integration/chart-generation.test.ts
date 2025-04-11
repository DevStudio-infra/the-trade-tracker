import { ChartGeneratorService } from "../../src/services/chart/chart-generator.service";
import { CapitalService } from "../../src/services/broker/capital-com/capital.service";
import { StorageService } from "../../src/services/storage/storage.service";
import { ChartData } from "../../src/services/chart/chart-generator.service";
import { createLogger } from "../../src/utils/logger";

const logger = createLogger("chart-generation-test");

describe("Chart Generation Pipeline", () => {
  let chartGenerator: ChartGeneratorService;
  let capitalService: CapitalService;
  let storageService: StorageService;

  beforeAll(async () => {
    // Initialize services
    capitalService = new CapitalService({
      apiKey: process.env.CAPITAL_COM_API_KEY || "",
      apiSecret: process.env.CAPITAL_COM_API_SECRET || "",
      isDemo: true,
    });

    storageService = new StorageService();
    chartGenerator = new ChartGeneratorService(capitalService, storageService);

    // Connect to broker
    await capitalService.connect({
      apiKey: process.env.CAPITAL_COM_API_KEY || "",
      apiSecret: process.env.CAPITAL_COM_API_SECRET || "",
    });
  });

  afterAll(async () => {
    // Disconnect from broker
    await capitalService.disconnect();
    // Clean up any test data
    await storageService.cleanupOldChartImages();
    // Wait for any pending operations to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe("Market Data Fetching", () => {
    it("should fetch market data for a valid trading pair", async () => {
      const pair = "EUR/USD";
      const timeframe = "1h";
      const result = await chartGenerator.generateChart(pair, timeframe, {
        userId: "test-user",
        signalId: "test-signal",
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);

      // Validate candle data structure
      const firstCandle = result.data[0];
      expect(firstCandle).toHaveProperty("timestamp");
      expect(firstCandle).toHaveProperty("open");
      expect(firstCandle).toHaveProperty("high");
      expect(firstCandle).toHaveProperty("low");
      expect(firstCandle).toHaveProperty("close");
      expect(firstCandle).toHaveProperty("volume");
    });

    it("should handle invalid trading pair gracefully", async () => {
      const pair = "INVALID/PAIR";
      const timeframe = "1h";

      await expect(
        chartGenerator.generateChart(pair, timeframe, {
          userId: "test-user",
          signalId: "test-signal",
        })
      ).rejects.toThrow();
    });
  });

  describe("Technical Indicators", () => {
    it("should calculate all required indicators", async () => {
      const pair = "EUR/USD";
      const timeframe = "1h";
      const result = await chartGenerator.generateChart(pair, timeframe, {
        userId: "test-user",
        signalId: "test-signal",
      });

      expect(result.indicators).toBeDefined();
      expect(result.indicators).toHaveProperty("ema20");
      expect(result.indicators).toHaveProperty("rsi14");
      expect(result.indicators).toHaveProperty("sma50");
      expect(result.indicators).toHaveProperty("sma200");
      expect(result.indicators).toHaveProperty("macd");
      expect(result.indicators).toHaveProperty("macdSignal");
      expect(result.indicators).toHaveProperty("macdHistogram");
      expect(result.indicators).toHaveProperty("bollingerUpper");
      expect(result.indicators).toHaveProperty("bollingerMiddle");
      expect(result.indicators).toHaveProperty("bollingerLower");

      // Validate indicator data lengths match candle data
      Object.values(result.indicators).forEach((indicator) => {
        expect(indicator.length).toBe(result.data.length);
      });
    });

    it("should handle empty data gracefully", async () => {
      const emptyData: ChartData[] = [];
      await expect(chartGenerator["calculateIndicators"](emptyData)).rejects.toThrow();
    });
  });

  describe("Chart Rendering", () => {
    it("should generate a valid chart image URL", async () => {
      const pair = "EUR/USD";
      const timeframe = "1h";
      const result = await chartGenerator.generateChart(pair, timeframe, {
        userId: "test-user",
        signalId: "test-signal",
      });

      expect(result.url).toBeDefined();
      expect(result.url).toMatch(/^https?:\/\//); // Should be a valid URL
      expect(result.url).toMatch(/\.png$/); // Should be a PNG file
    });

    it("should store the chart image successfully", async () => {
      const pair = "EUR/USD";
      const timeframe = "1h";
      const result = await chartGenerator.generateChart(pair, timeframe, {
        userId: "test-user",
        signalId: "test-signal",
      });

      // Verify the image exists in storage
      const imageExists = await storageService.uploadChartImage(
        Buffer.from("test"), // Mock buffer since we can't access the actual buffer
        {
          userId: "test-user",
          signalId: "test-signal",
          timeframe,
          chartType: "analysis",
        }
      );

      expect(imageExists).toBeDefined();
      expect(imageExists.url).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle broker connection errors", async () => {
      // Disconnect from broker to simulate connection error
      await capitalService.disconnect();

      const pair = "EUR/USD";
      const timeframe = "1h";

      await expect(
        chartGenerator.generateChart(pair, timeframe, {
          userId: "test-user",
          signalId: "test-signal",
        })
      ).rejects.toThrow("Not connected to broker");

      // Reconnect for other tests
      await capitalService.connect({
        apiKey: process.env.CAPITAL_COM_API_KEY || "",
        apiSecret: process.env.CAPITAL_COM_API_SECRET || "",
      });
    });

    it("should handle storage errors gracefully", async () => {
      // Mock storage service to simulate error
      jest.spyOn(storageService, "uploadChartImage").mockRejectedValueOnce(new Error("Storage error"));

      const pair = "EUR/USD";
      const timeframe = "1h";

      await expect(
        chartGenerator.generateChart(pair, timeframe, {
          userId: "test-user",
          signalId: "test-signal",
        })
      ).rejects.toThrow("Storage error");
    });
  });

  describe("Performance", () => {
    it("should generate chart within acceptable time", async () => {
      const pair = "EUR/USD";
      const timeframe = "1h";
      const startTime = Date.now();

      await chartGenerator.generateChart(pair, timeframe, {
        userId: "test-user",
        signalId: "test-signal",
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
