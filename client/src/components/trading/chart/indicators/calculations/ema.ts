"use client";

import { FormattedCandle } from "../../../chart/core/ChartTypes";

/**
 * Calculate the Exponential Moving Average (EMA) from an array of values
 *
 * @param values Array of numeric values
 * @param period The period for the EMA calculation
 * @returns Array of EMA values
 */
export function calculateEMAFromValues(values: number[], period: number): number[] {
  // Handle edge cases
  if (!values || values.length === 0 || period <= 0) {
    return [];
  }

  // We need at least 'period' number of values
  if (values.length < period) {
    return [];
  }

  // Calculate multiplier (smoothing factor)
  const multiplier = 2 / (period + 1);

  // Initialize result array
  const result: number[] = [];

  // Calculate initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let ema = sum / period;
  result.push(ema);

  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    // EMA = Current * k + EMA(prev) * (1-k)
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result.push(ema);
  }

  return result;
}

/**
 * Calculate the Exponential Moving Average (EMA) from candle data
 *
 * @param candles Array of formatted candles
 * @param period The period for the EMA calculation
 * @returns Array of {time, value} points for the EMA
 */
export function calculateEMA(candles: FormattedCandle[], period: number) {
  // Handle edge cases
  if (!candles || candles.length === 0 || period <= 0) {
    return [];
  }

  // We need at least 'period' number of candles
  if (candles.length < period) {
    return [];
  }

  // Extract closing prices
  const prices = candles.map((candle) => candle.close);

  // Calculate EMA values
  const emaValues = calculateEMAFromValues(prices, period);

  // Map EMA values back to time series starting from the period point
  return emaValues.map((value, index) => ({
    time: candles[index + period - 1].time,
    value,
  }));
}
