"use client";

import { Time } from "lightweight-charts";
import { FormattedCandle } from "../../../chart/core/ChartTypes";
import { calculateSMA } from "./sma";

/**
 * Bollinger Bands data structure
 */
export interface BollingerBandsData {
  middle: Array<{ time: Time; value: number }>;
  upper: Array<{ time: Time; value: number }>;
  lower: Array<{ time: Time; value: number }>;
}

/**
 * Calculate Bollinger Bands
 *
 * @param candles Array of formatted candles
 * @param period The period for the SMA (typically 20)
 * @param stdDev The number of standard deviations (typically 2)
 * @returns Object containing middle, upper, and lower band data
 */
export function calculateBollingerBands(candles: FormattedCandle[], period: number = 20, stdDev: number = 2): BollingerBandsData {
  // Handle edge cases
  if (!candles || candles.length === 0 || period <= 0) {
    return { middle: [], upper: [], lower: [] };
  }

  // Calculate SMA (middle band)
  const middle = calculateSMA(candles, period);

  // Create maps for easy lookup
  const middleMap = new Map(middle.map((point) => [String(point.time), point.value]));

  // If we don't have enough data, return empty bands
  if (middle.length === 0) {
    return { middle: [], upper: [], lower: [] };
  }

  // Initialize upper and lower bands
  const upper: Array<{ time: Time; value: number }> = [];
  const lower: Array<{ time: Time; value: number }> = [];

  // For each point where we have an SMA value
  for (let i = period - 1; i < candles.length; i++) {
    const time = candles[i].time;

    // Skip if we don't have a middle band value for this time
    if (!middleMap.has(String(time))) continue;

    // Calculate standard deviation
    let sumSquaredDiff = 0;

    // Sum squared differences from the mean (SMA) for the period
    for (let j = 0; j < period; j++) {
      const diff = candles[i - j].close - middleMap.get(String(time))!;
      sumSquaredDiff += diff * diff;
    }

    // Standard deviation
    const stdDevValue = Math.sqrt(sumSquaredDiff / period);

    // Upper band = SMA + (stdDev * σ)
    upper.push({
      time,
      value: middleMap.get(String(time))! + stdDevValue * stdDev,
    });

    // Lower band = SMA - (stdDev * σ)
    lower.push({
      time,
      value: middleMap.get(String(time))! - stdDevValue * stdDev,
    });
  }

  return {
    middle,
    upper,
    lower,
  };
}
