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
 * Calculates Moving Average Convergence Divergence (MACD) for the provided candles
 */
export function calculateMACD(candles: FormattedCandle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  // Step 1: Calculate fast and slow EMAs
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  // Create a map for easier lookup of EMA values by time
  const fastEMAMap = new Map(fastEMA.map((point) => [point.time, point.value]));

  // Step 2: Calculate MACD line (fast EMA - slow EMA)
  const macdLine = slowEMA
    .filter((point) => fastEMAMap.has(point.time))
    .map((point) => ({
      time: point.time,
      value: fastEMAMap.get(point.time)! - point.value,
    }));

  // Step 3: Calculate the signal line (EMA of MACD line)
  // First, convert MACD line to a format similar to candles for the EMA function
  const macdForEMA = macdLine.map((point) => ({
    time: point.time as Time,
    open: point.value,
    high: point.value,
    low: point.value,
    close: point.value,
    value: 0,
  }));

  let signalLine: { time: Time; value: number }[] = [];

  // Only calculate signal line if we have enough MACD points
  if (macdForEMA.length >= signalPeriod) {
    signalLine = calculateEMA(macdForEMA, signalPeriod);
  }

  // Create a map for easier lookup of signal values by time
  const signalMap = new Map(signalLine.map((point) => [point.time, point.value]));

  // Step 4: Calculate histogram (MACD line - signal line)
  const histogram = macdLine
    .filter((point) => signalMap.has(point.time))
    .map((point) => ({
      time: point.time,
      value: point.value - signalMap.get(point.time)!,
      color: point.value >= signalMap.get(point.time)! ? "green" : "red",
    }));

  return {
    macdLine,
    signalLine,
    histogram,
  };
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
