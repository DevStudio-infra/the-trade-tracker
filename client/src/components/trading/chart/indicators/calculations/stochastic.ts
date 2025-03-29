"use client";

import { Time } from "lightweight-charts";
import { FormattedCandle } from "../../../chart/core/ChartTypes";
import { calculateSMAFromValues } from "./sma";

/**
 * Stochastic Oscillator data structure
 */
export interface StochasticData {
  k: Array<{ time: Time; value: number }>;
  d: Array<{ time: Time; value: number }>;
}

/**
 * Calculate the Stochastic Oscillator
 *
 * @param candles Array of formatted candles
 * @param kPeriod The period for the %K line (typically 14)
 * @param dPeriod The period for the %D line (typically 3)
 * @returns Object containing %K and %D line data
 */
export function calculateStochastic(candles: FormattedCandle[], kPeriod: number = 14, dPeriod: number = 3): StochasticData {
  // Handle edge cases
  if (!candles || candles.length === 0 || kPeriod <= 0 || dPeriod <= 0) {
    return { k: [], d: [] };
  }

  // We need at least kPeriod candles to calculate the first %K
  if (candles.length < kPeriod) {
    return { k: [], d: [] };
  }

  // Initialize arrays for %K values and timestamps
  const kValues: number[] = [];
  const times: Time[] = [];

  // Calculate %K values for each point
  for (let i = kPeriod - 1; i < candles.length; i++) {
    // Get highest high and lowest low over the kPeriod
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = 0; j < kPeriod; j++) {
      const candle = candles[i - j];
      highestHigh = Math.max(highestHigh, candle.high);
      lowestLow = Math.min(lowestLow, candle.low);
    }

    // Calculate %K = ((Close - Lowest Low) / (Highest High - Lowest Low)) * 100
    let kValue = 0;
    if (highestHigh !== lowestLow) {
      kValue = ((candles[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
    }

    kValues.push(kValue);
    times.push(candles[i].time);
  }

  // Create array for %K line
  const kLine = kValues.map((value, i) => ({
    time: times[i],
    value,
  }));

  // Calculate %D line (SMA of %K)
  const dValues = calculateSMAFromValues(kValues, dPeriod);

  // Create array for %D line
  const dLine = dValues.map((value, i) => ({
    time: times[i + dPeriod - 1], // Offset to align with corresponding time
    value,
  }));

  return {
    k: kLine,
    d: dLine,
  };
}
