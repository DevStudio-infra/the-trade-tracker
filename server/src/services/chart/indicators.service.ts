import { createLogger } from "../../utils/logger";
import { ChartData } from "./chart-generator.service";

const logger = createLogger("indicators-service");

export class IndicatorsService {
  /**
   * Calculate Exponential Moving Average (EMA)
   */
  calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema = new Array(data.length);

    // Initialize with SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    ema[period - 1] = sum / period;

    // Calculate EMA
    for (let i = period; i < data.length; i++) {
      ema[i] = data[i] * k + ema[i - 1] * (1 - k);
    }

    // Fill initial values with first EMA
    for (let i = 0; i < period - 1; i++) {
      ema[i] = ema[period - 1];
    }

    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  calculateRSI(data: number[], period: number = 14): number[] {
    const rsi = new Array(data.length).fill(50);
    const gains = new Array(data.length).fill(0);
    const losses = new Array(data.length).fill(0);

    // Calculate price changes and separate gains and losses
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains[i] = change > 0 ? change : 0;
      losses[i] = change < 0 ? -change : 0;
    }

    // Calculate initial averages
    let avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b) / period;
    let avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b) / period;

    // Calculate RSI values
    for (let i = period; i < data.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      const rs = avgGain / (avgLoss || 1); // Avoid division by zero
      rsi[i] = 100 - 100 / (1 + rs);
    }

    return rsi;
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  calculateSMA(data: number[], period: number): number[] {
    const sma = new Array(data.length).fill(0);
    let sum = 0;

    // Calculate first SMA
    for (let i = 0; i < period; i++) {
      sum += data[i];
      sma[i] = sum / (i + 1);
    }

    // Calculate remaining SMAs
    for (let i = period; i < data.length; i++) {
      sum = sum - data[i - period] + data[i];
      sma[i] = sum / period;
    }

    return sma;
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   */
  calculateMACD(
    data: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): {
    macd: number[];
    signal: number[];
    histogram: number[];
  } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);

    // Calculate MACD line
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);

    // Calculate signal line
    const signalLine = this.calculateEMA(macdLine, signalPeriod);

    // Calculate histogram
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(
    data: number[],
    period: number = 20,
    stdDev: number = 2
  ): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const sma = this.calculateSMA(data, period);
    const bands = {
      upper: new Array(data.length),
      middle: sma,
      lower: new Array(data.length),
    };

    // Calculate standard deviation and bands
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(data[i - j] - sma[i], 2);
      }
      const std = Math.sqrt(sum / period);
      bands.upper[i] = sma[i] + stdDev * std;
      bands.lower[i] = sma[i] - stdDev * std;
    }

    // Fill initial values
    for (let i = 0; i < period - 1; i++) {
      bands.upper[i] = bands.upper[period - 1];
      bands.lower[i] = bands.lower[period - 1];
    }

    return bands;
  }

  /**
   * Calculate all indicators for a given dataset
   */
  calculateAllIndicators(data: ChartData[]): Record<string, number[]> {
    try {
      const closes = data.map((d) => d.close);

      // Calculate all indicators
      const ema20 = this.calculateEMA(closes, 20);
      const rsi14 = this.calculateRSI(closes, 14);
      const sma50 = this.calculateSMA(closes, 50);
      const sma200 = this.calculateSMA(closes, 200);
      const macd = this.calculateMACD(closes);
      const bands = this.calculateBollingerBands(closes);

      return {
        ema20,
        rsi14,
        sma50,
        sma200,
        macd: macd.macd,
        macdSignal: macd.signal,
        macdHistogram: macd.histogram,
        bollingerUpper: bands.upper,
        bollingerMiddle: bands.middle,
        bollingerLower: bands.lower,
      };
    } catch (error) {
      logger.error("Error calculating indicators:", error);
      throw error;
    }
  }
}
