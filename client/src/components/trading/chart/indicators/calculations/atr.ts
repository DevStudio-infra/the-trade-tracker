"use client";

import { FormattedCandle } from "../../../chart/core/ChartTypes";

/**
 * Calculate the Average True Range (ATR)
 *
 * @param candles Array of formatted candles
 * @param period The period for the ATR calculation (typically 14)
 * @returns Array of {time, value} points for the ATR
 */
export function calculateATR(candles: FormattedCandle[], period: number = 14) {
  // Handle edge cases
  if (!candles || candles.length === 0 || period <= 0) {
    return [];
  }

  // We need at least period+1 candles to calculate the first ATR
  if (candles.length < period + 1) {
    return [];
  }

  // Initialize result array
  const result = [];

  // Calculate true ranges
  const trueRanges = [];

  // Calculate first true range (for the second candle, since we need a previous candle)
  for (let i = 1; i < candles.length; i++) {
    const currentCandle = candles[i];
    const previousCandle = candles[i - 1];

    // True Range is the greatest of:
    // 1. Current High - Current Low
    // 2. |Current High - Previous Close|
    // 3. |Current Low - Previous Close|
    const tr1 = currentCandle.high - currentCandle.low;
    const tr2 = Math.abs(currentCandle.high - previousCandle.close);
    const tr3 = Math.abs(currentCandle.low - previousCandle.close);

    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }

  // Initialize the first ATR as the SMA of the first 'period' true ranges
  let firstAtr = 0;
  for (let i = 0; i < period; i++) {
    firstAtr += trueRanges[i];
  }
  firstAtr /= period;

  // Add the first ATR value
  result.push({
    time: candles[period].time,
    value: firstAtr,
  });

  // Calculate subsequent ATRs using the smoothed method:
  // ATR = ((period - 1) * previousATR + currentTR) / period
  let currentAtr = firstAtr;

  for (let i = period; i < trueRanges.length; i++) {
    currentAtr = ((period - 1) * currentAtr + trueRanges[i]) / period;

    result.push({
      time: candles[i + 1].time,
      value: currentAtr,
    });
  }

  return result;
}
