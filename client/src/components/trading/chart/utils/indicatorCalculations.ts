import { FormattedCandle, Time } from "./chartTypes";

/**
 * Calculates Simple Moving Average (SMA) for the provided candles
 */
export function calculateSMA(candles: FormattedCandle[], period: number) {
  const result = [];

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }

  return result;
}

/**
 * Calculates Exponential Moving Average (EMA) for the provided candles
 */
export function calculateEMA(candles: FormattedCandle[], period: number) {
  const result = [];

  // First value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;

  // Multiplier: (2 / (period + 1))
  const multiplier = 2 / (period + 1);

  result.push({
    time: candles[period - 1].time,
    value: ema,
  });

  // Calculate EMA for the rest
  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close - ema) * multiplier + ema;
    result.push({
      time: candles[i].time,
      value: ema,
    });
  }

  return result;
}

/**
 * Calculates Relative Strength Index (RSI) for the provided candles
 */
export function calculateRSI(candles: FormattedCandle[], period: number) {
  const result = [];
  const gains = [];
  const losses = [];

  // Calculate initial gains and losses
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);

    // Once we have enough data to calculate the first RSI value
    if (i >= period) {
      // Calculate average gain and loss for the period
      let avgGain = 0;
      let avgLoss = 0;

      if (i === period) {
        // First calculation is a simple average
        for (let j = 0; j < period; j++) {
          avgGain += gains[j];
          avgLoss += losses[j];
        }
        avgGain /= period;
        avgLoss /= period;
      } else {
        // Subsequent calculations use the previous values
        const prevAvgGain = result[result.length - 1].avgGain;
        const prevAvgLoss = result[result.length - 1].avgLoss;

        // Smoothed averages
        avgGain = (prevAvgGain * (period - 1) + gains[gains.length - 1]) / period;
        avgLoss = (prevAvgLoss * (period - 1) + losses[losses.length - 1]) / period;
      }

      // Calculate RS and RSI
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      result.push({
        time: candles[i].time,
        value: rsi,
        avgGain,
        avgLoss,
      });
    }
  }

  // Remove the avgGain and avgLoss properties for the final result
  return result.map(({ time, value }) => ({ time, value }));
}

/**
 * The result returned by the MACD calculation
 */
export interface MACDResult {
  macdLine: { time: Time; value: number }[];
  signalLine: { time: Time; value: number }[];
  histogram: { time: Time; value: number }[];
}

/**
 * Calculate the MACD (Moving Average Convergence Divergence) indicator
 *
 * @param candles - Array of candle data
 * @param fastPeriod - The period of the fast EMA (default: 12)
 * @param slowPeriod - The period of the slow EMA (default: 26)
 * @param signalPeriod - The period of the signal line (default: 9)
 * @returns Object containing the MACD line, signal line, and histogram data
 */
export function calculateMACD(candles: FormattedCandle[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDResult {
  if (!candles || candles.length === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Calculate the fast EMA
  const fastEMA = calculateEMA(candles, fastPeriod);
  // Calculate the slow EMA
  const slowEMA = calculateEMA(candles, slowPeriod);

  // Create MACD line (fast EMA - slow EMA)
  const macdLine: { time: Time; value: number }[] = [];

  // We need at least the slow period of data to start calculating
  const startingIndex = Math.max(fastPeriod, slowPeriod) - 1;

  // Calculate MACD Line values
  for (let i = startingIndex; i < candles.length; i++) {
    const time = candles[i].time;

    // Find corresponding EMA values
    const fastValue = fastEMA.find((item) => item.time === time)?.value;
    const slowValue = slowEMA.find((item) => item.time === time)?.value;

    if (fastValue !== undefined && slowValue !== undefined) {
      macdLine.push({
        time,
        value: fastValue - slowValue,
      });
    }
  }

  // Calculate Signal Line (EMA of MACD Line)
  const signalLine: { time: Time; value: number }[] = [];

  // Need at least signalPeriod data points to calculate the signal line
  if (macdLine.length >= signalPeriod) {
    // Calculate EMA of MACD values
    let signalSum = 0;

    // Calculate first SMA for the signal line
    for (let i = 0; i < signalPeriod; i++) {
      signalSum += macdLine[i].value;
    }

    let prevSignal = signalSum / signalPeriod;

    // Add first signal point
    signalLine.push({
      time: macdLine[signalPeriod - 1].time,
      value: prevSignal,
    });

    // Calculate rest of signal line using EMA formula
    const multiplier = 2 / (signalPeriod + 1);

    for (let i = signalPeriod; i < macdLine.length; i++) {
      const currValue = macdLine[i].value;
      const newSignal = (currValue - prevSignal) * multiplier + prevSignal;

      signalLine.push({
        time: macdLine[i].time,
        value: newSignal,
      });

      prevSignal = newSignal;
    }
  }

  // Calculate Histogram (MACD Line - Signal Line)
  const histogram: { time: Time; value: number }[] = [];

  if (signalLine.length > 0) {
    for (let i = 0; i < signalLine.length; i++) {
      const time = signalLine[i].time;
      const macdValue = macdLine.find((item) => item.time === time)?.value;
      const signalValue = signalLine[i].value;

      if (macdValue !== undefined) {
        histogram.push({
          time,
          value: macdValue - signalValue,
        });
      }
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Calculates Bollinger Bands for the provided candles
 */
export function calculateBollingerBands(candles: FormattedCandle[], period: number = 20, stdDev: number = 2) {
  // Calculate SMA first
  const sma = calculateSMA(candles, period);

  // Create a map for easier lookup of SMA values by time
  const smaMap = new Map(sma.map((point) => [point.time, point.value]));

  const result = [];

  // For each point in SMA, calculate Bollinger Bands
  for (let i = period - 1; i < candles.length; i++) {
    // Get current candle time
    const time = candles[i].time;

    // Skip if no SMA value for this time
    if (!smaMap.has(time)) continue;

    // Get SMA value
    const middle = smaMap.get(time)!;

    // Calculate standard deviation
    let squaredDiffs = 0;
    for (let j = 0; j < period; j++) {
      const diff = candles[i - j].close - middle;
      squaredDiffs += diff * diff;
    }
    const standardDeviation = Math.sqrt(squaredDiffs / period);

    // Calculate upper and lower bands
    const upper = middle + standardDeviation * stdDev;
    const lower = middle - standardDeviation * stdDev;

    result.push({
      time,
      middle,
      upper,
      lower,
    });
  }

  return result;
}

/**
 * Calculates Stochastic Oscillator for the provided candles
 */
export function calculateStochastic(candles: FormattedCandle[], kPeriod: number = 14, dPeriod: number = 3) {
  const result = {
    k: [] as { time: Time; value: number }[],
    d: [] as { time: Time; value: number }[],
  };

  // Need at least kPeriod candles
  if (candles.length < kPeriod) return result;

  // Calculate %K
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    // Find highest high and lowest low over the lookback period
    for (let j = 0; j < kPeriod; j++) {
      const candle = candles[i - j];
      highestHigh = Math.max(highestHigh, candle.high);
      lowestLow = Math.min(lowestLow, candle.low);
    }

    // Calculate %K: ((close - lowestLow) / (highestHigh - lowestLow)) * 100
    const range = highestHigh - lowestLow;
    let kValue = 50; // Default to 50 if range is 0

    if (range > 0) {
      kValue = ((candles[i].close - lowestLow) / range) * 100;
    }

    result.k.push({
      time: candles[i].time,
      value: kValue,
    });
  }

  // Calculate %D (which is a dPeriod-SMA of %K)
  if (result.k.length >= dPeriod) {
    for (let i = dPeriod - 1; i < result.k.length; i++) {
      let sum = 0;
      for (let j = 0; j < dPeriod; j++) {
        sum += result.k[i - j].value;
      }

      result.d.push({
        time: result.k[i].time,
        value: sum / dPeriod,
      });
    }
  }

  return result;
}
