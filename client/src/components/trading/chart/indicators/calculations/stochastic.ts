"use client";

import { Time } from "lightweight-charts";
import { FormattedCandle } from "../../../chart/core/ChartTypes";
import { calculateSMA } from "./sma";

/**
 * Stochastic data structure
 */
export interface StochasticData {
  k: Array<{ time: Time; value: number }>;
  d: Array<{ time: Time; value: number }>;
}

/**
 * Calculate Stochastic Oscillator
 *
 * %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = SMA of %K
 *
 * @param candles - Array of candle data
 * @param period - The period for calculations (typically 14)
 * @param smoothK - Smoothing for %K (typically 1 or 3)
 * @param smoothD - Smoothing for %D (typically 3)
 * @returns Stochastic data with %K and %D lines
 */
export function calculateStochastic(candles: FormattedCandle[], period: number = 14, smoothK: number = 3, smoothD: number = 3): StochasticData {
  if (!candles || candles.length === 0) {
    return { k: [], d: [] };
  }

  // Ensure we have enough candles
  if (candles.length < period) {
    return { k: [], d: [] };
  }

  // Calculate raw %K values
  const rawK: Array<{ time: Time; value: number }> = [];
  for (let i = period - 1; i < candles.length; i++) {
    const periodCandles = candles.slice(i - period + 1, i + 1);
    const currentClose = periodCandles[period - 1].close;
    const lowestLow = Math.min(...periodCandles.map((c) => c.low));
    const highestHigh = Math.max(...periodCandles.map((c) => c.high));

    const k =
      highestHigh - lowestLow === 0
        ? 100 // If there's no range, consider it overbought
        : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

    rawK.push({
      time: candles[i].time,
      value: k,
    });
  }

  // Smooth %K if needed
  const smoothedK =
    smoothK > 1
      ? calculateSMA(
          rawK.map((point) => ({
            time: point.time,
            open: point.value,
            high: point.value,
            low: point.value,
            close: point.value,
          })),
          smoothK
        )
      : rawK;

  // Calculate %D (SMA of smoothed %K)
  const kForD = smoothedK.map((point) => ({
    time: point.time,
    open: point.value,
    high: point.value,
    low: point.value,
    close: point.value,
  }));

  const d = calculateSMA(kForD, smoothD);

  return {
    k: smoothedK,
    d: d.map((point) => ({
      time: point.time,
      value: point.value,
    })),
  };
}
