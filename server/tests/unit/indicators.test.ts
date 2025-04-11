import { IndicatorsService } from "../../src/services/chart/indicators.service";
import { ChartData } from "../../src/services/chart/chart-generator.service";
import "@types/jest";

describe("Technical Indicators Service", () => {
  let indicatorsService: IndicatorsService;

  beforeEach(() => {
    indicatorsService = new IndicatorsService();
  });

  describe("EMA Calculation", () => {
    it("should calculate EMA correctly", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const period = 3;
      const ema = indicatorsService.calculateEMA(data, period);

      expect(ema).toHaveLength(data.length);
      expect(ema[0]).toBeDefined();
      expect(ema[ema.length - 1]).toBeGreaterThan(ema[0]); // Should trend upward for increasing data
    });

    it("should handle period longer than data", () => {
      const data = [1, 2, 3];
      const period = 5;
      const ema = indicatorsService.calculateEMA(data, period);

      expect(ema).toHaveLength(data.length);
      expect(ema.every((val) => !isNaN(val))).toBe(true);
    });
  });

  describe("RSI Calculation", () => {
    it("should calculate RSI correctly", () => {
      const data = [45, 46, 45, 44, 43, 44, 45, 46, 47, 46, 45, 44, 43, 42, 41, 42, 43, 44, 45, 46];
      const period = 14;
      const rsi = indicatorsService.calculateRSI(data, period);

      expect(rsi).toHaveLength(data.length);
      expect(rsi[rsi.length - 1]).toBeGreaterThanOrEqual(0);
      expect(rsi[rsi.length - 1]).toBeLessThanOrEqual(100);
    });

    it("should handle all increasing values", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rsi = indicatorsService.calculateRSI(data);

      expect(rsi[rsi.length - 1]).toBeCloseTo(100, 0); // Should be close to 100 for all gains
    });

    it("should handle all decreasing values", () => {
      const data = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const rsi = indicatorsService.calculateRSI(data);

      expect(rsi[rsi.length - 1]).toBeCloseTo(0, 0); // Should be close to 0 for all losses
    });
  });

  describe("SMA Calculation", () => {
    it("should calculate SMA correctly", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const period = 3;
      const sma = indicatorsService.calculateSMA(data, period);

      expect(sma).toHaveLength(data.length);
      expect(sma[sma.length - 1]).toBe((8 + 9 + 10) / 3);
    });

    it("should handle period equal to data length", () => {
      const data = [1, 2, 3, 4, 5];
      const period = 5;
      const sma = indicatorsService.calculateSMA(data, period);

      expect(sma).toHaveLength(data.length);
      expect(sma[sma.length - 1]).toBe(3); // Average of 1,2,3,4,5
    });
  });

  describe("MACD Calculation", () => {
    it("should calculate MACD components correctly", () => {
      const data = Array.from({ length: 50 }, (_, i) => i + 1);
      const { macd, signal, histogram } = indicatorsService.calculateMACD(data);

      expect(macd).toHaveLength(data.length);
      expect(signal).toHaveLength(data.length);
      expect(histogram).toHaveLength(data.length);

      // Verify histogram is the difference between MACD and signal
      histogram.forEach((h, i) => {
        expect(h).toBeCloseTo(macd[i] - signal[i], 5);
      });
    });
  });

  describe("Bollinger Bands Calculation", () => {
    it("should calculate Bollinger Bands correctly", () => {
      const data = Array.from({ length: 30 }, (_, i) => i + 1);
      const { upper, middle, lower } = indicatorsService.calculateBollingerBands(data);

      expect(upper).toHaveLength(data.length);
      expect(middle).toHaveLength(data.length);
      expect(lower).toHaveLength(data.length);

      // Verify bands relationship
      for (let i = 0; i < data.length; i++) {
        expect(upper[i]).toBeGreaterThan(middle[i]);
        expect(middle[i]).toBeGreaterThan(lower[i]);
      }
    });

    it("should handle custom standard deviation multiplier", () => {
      const data = Array.from({ length: 30 }, (_, i) => i + 1);
      const stdDev = 3; // 3 standard deviations
      const { upper, middle, lower } = indicatorsService.calculateBollingerBands(data, 20, stdDev);

      // Bands should be wider with higher stdDev
      for (let i = 0; i < data.length; i++) {
        expect(upper[i] - middle[i]).toBeGreaterThan(middle[i] - lower[i] - 0.0001); // Account for floating point
        expect(upper[i] - middle[i]).toBeCloseTo(middle[i] - lower[i], 5);
      }
    });
  });

  describe("All Indicators Calculation", () => {
    it("should calculate all indicators for valid data", () => {
      const data: ChartData[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() + i * 60000,
        open: i + 1,
        high: i + 2,
        low: i,
        close: i + 1,
        volume: 1000 * (i + 1),
      }));

      const indicators = indicatorsService.calculateAllIndicators(data);

      expect(indicators).toHaveProperty("ema20");
      expect(indicators).toHaveProperty("rsi14");
      expect(indicators).toHaveProperty("sma50");
      expect(indicators).toHaveProperty("sma200");
      expect(indicators).toHaveProperty("macd");
      expect(indicators).toHaveProperty("macdSignal");
      expect(indicators).toHaveProperty("macdHistogram");
      expect(indicators).toHaveProperty("bollingerUpper");
      expect(indicators).toHaveProperty("bollingerMiddle");
      expect(indicators).toHaveProperty("bollingerLower");

      // All arrays should have the same length as input data
      Object.values(indicators).forEach((indicator) => {
        expect(indicator).toHaveLength(data.length);
      });
    });

    it("should handle empty data array", () => {
      const data: any[] = [];
      expect(() => indicatorsService.calculateAllIndicators(data)).toThrow();
    });
  });
});
