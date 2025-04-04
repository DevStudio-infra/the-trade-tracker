"use client";

import { FormattedCandle } from "../../../chart/core/ChartTypes";

/**
 * Calculate the Simple Moving Average (SMA) from candle data
 *
 * @param candles Array of formatted candles
 * @param period The period for the SMA calculation
 * @returns Array of {time, value} points for the SMA
 */
export function calculateSMA(candles: FormattedCandle[], period: number) {
  // Handle edge cases
  if (!candles || candles.length === 0 || period <= 0) {
    console.warn("[SMA] Invalid input parameters:", { candlesLength: candles?.length, period });
    return [];
  }

  // We need at least 'period' number of candles
  if (candles.length < period) {
    console.warn("[SMA] Not enough candles for period:", { candlesLength: candles.length, period });
    return [];
  }

  try {
    // Initialize result array
    const result = [];

    // Calculate first SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[i].close;
    }

    // Add first SMA value
    result.push({
      time: candles[period - 1].time,
      value: sum / period,
    });

    // Calculate subsequent SMAs using a moving window
    for (let i = period; i < candles.length; i++) {
      // Remove oldest price and add newest price
      sum = sum - candles[i - period].close + candles[i].close;

      result.push({
        time: candles[i].time,
        value: sum / period,
      });
    }

    console.log("[SMA] Calculated SMA values:", {
      period,
      points: result.length,
      firstValue: result[0].value,
      lastValue: result[result.length - 1].value,
    });

    return result;
  } catch (error) {
    console.error("[SMA] Error calculating SMA:", error);
    return [];
  }
}

/**
 * Calculate the Simple Moving Average (SMA) from an array of values
 *
 * @param values Array of numeric values
 * @param period The period for the SMA calculation
 * @returns Array of moving averages
 */
export function calculateSMAFromValues(values: number[], period: number): number[] {
  // Handle edge cases
  if (!values || values.length === 0 || period <= 0) {
    return [];
  }

  // Ensure the period isn't larger than the data set
  const actualPeriod = Math.min(period, values.length);

  // Initialize result array
  const result: number[] = [];

  // Calculate SMA for each point where we have enough data
  for (let i = actualPeriod - 1; i < values.length; i++) {
    let sum = 0;

    // Sum the values for the period
    for (let j = 0; j < actualPeriod; j++) {
      sum += values[i - j];
    }

    // Calculate average and add to result
    const smaValue = sum / actualPeriod;
    result.push(smaValue);
  }

  return result;
}
