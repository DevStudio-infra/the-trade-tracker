"use client";

import { FormattedCandle } from "../../../chart/core/ChartTypes";
import { calculateSMA } from "./sma";

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

  // We need at least 'period' number of candles to calculate the first SMA
  if (candles.length < period) {
    return [];
  }

  // Calculate multiplier
  const multiplier = 2 / (period + 1);

  // Initialize result array
  const result = [];

  // Get initial SMA for the first 'period' candles as the first EMA value
  const initialSMA = calculateSMA(candles.slice(0, period), period);

  if (initialSMA.length === 0) {
    return [];
  }

  // Initialize EMA with the first SMA value
  let previousEMA = initialSMA[0].value;

  // Add the first EMA (which is the SMA)
  result.push({
    time: candles[period - 1].time,
    value: previousEMA,
  });

  // Calculate EMA for the rest of the candles
  for (let i = period; i < candles.length; i++) {
    // EMA = (Current Price × Multiplier) + (Previous EMA × (1 - Multiplier))
    const currentEMA = candles[i].close * multiplier + previousEMA * (1 - multiplier);

    result.push({
      time: candles[i].time,
      value: currentEMA,
    });

    // Update previous EMA for next calculation
    previousEMA = currentEMA;
  }

  return result;
}

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

  // We need at least 'period' number of values to calculate the first SMA
  if (values.length < period) {
    return [];
  }

  // Calculate multiplier
  const multiplier = 2 / (period + 1);

  // Initialize result array
  const result: number[] = [];

  // Calculate the initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  // First EMA is the SMA
  let previousEMA = sum / period;
  result.push(previousEMA);

  // Calculate EMA for the rest of the values
  for (let i = period; i < values.length; i++) {
    // EMA = (Current Value × Multiplier) + (Previous EMA × (1 - Multiplier))
    const currentEMA = values[i] * multiplier + previousEMA * (1 - multiplier);
    result.push(currentEMA);

    // Update previous EMA for next calculation
    previousEMA = currentEMA;
  }

  return result;
}
