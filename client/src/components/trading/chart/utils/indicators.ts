import { Time } from "lightweight-charts";

interface FormattedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

/**
 * Calculate Simple Moving Average (SMA)
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
 * Calculate Exponential Moving Average (EMA)
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
 * Calculate Relative Strength Index (RSI)
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
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(candles: FormattedCandle[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  // Calculate the EMAs
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: { time: Time; value: number }[] = [];

  // Need to align the EMAs by time
  const emaMap = new Map<string, { fast?: number; slow?: number }>();

  // Populate the map with slow EMA values
  slowEMA.forEach((point) => {
    const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();
    emaMap.set(timeKey, { slow: point.value });
  });

  // Add fast EMA values and calculate MACD line
  fastEMA.forEach((point) => {
    const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();

    const entry = emaMap.get(timeKey) || {};
    entry.fast = point.value;
    emaMap.set(timeKey, entry);

    if (entry.slow !== undefined && entry.fast !== undefined) {
      macdLine.push({
        time: point.time,
        value: entry.fast - entry.slow,
      });
    }
  });

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMAFromPoints(macdLine, signalPeriod);

  // Calculate histogram (MACD line - signal line)
  const histogram: { time: Time; value: number }[] = [];

  // Align MACD and signal by time
  const lineMap = new Map<string, { macd?: number; signal?: number }>();

  // Populate with MACD values
  macdLine.forEach((point) => {
    const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();
    lineMap.set(timeKey, { macd: point.value });
  });

  // Add signal values and calculate histogram
  signalLine.forEach((point) => {
    const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();

    const entry = lineMap.get(timeKey) || {};
    entry.signal = point.value;
    lineMap.set(timeKey, entry);

    if (entry.macd !== undefined && entry.signal !== undefined) {
      histogram.push({
        time: point.time,
        value: entry.macd - entry.signal,
      });
    }
  });

  return { macdLine, signalLine, histogram };
}

/**
 * Calculate EMA from points
 */
export function calculateEMAFromPoints(points: { time: Time; value: number }[], period: number) {
  if (points.length < period) {
    return [];
  }

  const k = 2 / (period + 1);
  const result: { time: Time; value: number }[] = [];

  // Initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += points[i].value;
  }
  let ema = sum / period;

  // First EMA uses SMA as previous
  result.push({
    time: points[period - 1].time,
    value: ema,
  });

  // Calculate remaining EMAs
  for (let i = period; i < points.length; i++) {
    ema = (points[i].value - ema) * k + ema;
    result.push({
      time: points[i].time,
      value: ema,
    });
  }

  return result;
}
