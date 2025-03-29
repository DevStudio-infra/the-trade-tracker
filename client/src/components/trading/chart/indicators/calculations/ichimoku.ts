"use client";

import { Time } from "lightweight-charts";
import { FormattedCandle } from "../../core/ChartTypes";

/**
 * Ichimoku Cloud data point structure
 */
export interface IchimokuPoint {
  time: Time;
  tenkan: number; // Conversion line
  kijun: number; // Base line
  senkou_a: number; // Leading span A
  senkou_b: number; // Leading span B
  chikou: number; // Lagging span
}

/**
 * Calculate the highest high and lowest low for the specified period
 */
const calculateHighLow = (candles: FormattedCandle[], period: number, index: number): [number, number] => {
  let highestHigh = -Infinity;
  let lowestLow = Infinity;

  for (let i = Math.max(0, index - period + 1); i <= index; i++) {
    highestHigh = Math.max(highestHigh, candles[i].high);
    lowestLow = Math.min(lowestLow, candles[i].low);
  }

  return [highestHigh, lowestLow];
};

/**
 * Calculate Ichimoku Cloud components for candle data
 * @param candles - Array of formatted candles
 * @param conversionPeriod - Period for Tenkan-sen (conversion line)
 * @param basePeriod - Period for Kijun-sen (base line)
 * @param spanPeriod - Period for Senkou Span B calculation
 * @param displacement - Displacement period for cloud offset
 * @returns Array of Ichimoku Cloud data points
 */
export function calculateIchimoku(
  candles: FormattedCandle[],
  conversionPeriod: number = 9,
  basePeriod: number = 26,
  spanPeriod: number = 52,
  displacement: number = 26
): IchimokuPoint[] {
  if (candles.length < Math.max(conversionPeriod, basePeriod, spanPeriod) + displacement) {
    return []; // Not enough data to calculate
  }

  const result: IchimokuPoint[] = [];
  const maxPeriod = Math.max(conversionPeriod, basePeriod, spanPeriod);

  // Calculate for each candle
  for (let i = maxPeriod - 1; i < candles.length; i++) {
    // Calculate Tenkan-sen (Conversion Line)
    const [conversionHigh, conversionLow] = calculateHighLow(candles, conversionPeriod, i);
    const tenkan = (conversionHigh + conversionLow) / 2;

    // Calculate Kijun-sen (Base Line)
    const [baseHigh, baseLow] = calculateHighLow(candles, basePeriod, i);
    const kijun = (baseHigh + baseLow) / 2;

    // Calculate Senkou Span A (Leading Span A)
    const senkou_a = (tenkan + kijun) / 2;

    // Calculate Senkou Span B (Leading Span B)
    const [spanHigh, spanLow] = calculateHighLow(candles, spanPeriod, i);
    const senkou_b = (spanHigh + spanLow) / 2;

    // Calculate Chikou Span (Lagging Span)
    const chikouIndex = i - displacement;
    const chikou = chikouIndex >= 0 ? candles[i].close : NaN;

    result.push({
      time: candles[i].time,
      tenkan,
      kijun,
      senkou_a,
      senkou_b,
      chikou,
    });
  }

  return result;
}
