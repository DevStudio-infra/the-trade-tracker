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
    console.warn("[EMA] Invalid input parameters:", { candlesLength: candles?.length, period });
    return [];
  }

  // We need at least 'period' number of candles
  if (candles.length < period) {
    console.warn("[EMA] Not enough candles for period:", { candlesLength: candles.length, period });
    return [];
  }

  try {
    // Calculate initial SMA for the first EMA value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[i].close;
    }
    let prevEma = sum / period;

    // Calculate the smoothing factor
    const alpha = 2 / (period + 1);

    // Initialize result array with first EMA (which is the SMA)
    const result = [
      {
        time: candles[period - 1].time,
        value: prevEma,
      },
    ];

    // Calculate EMA for remaining candles using the correct formula:
    // EMA = α × price + (1 − α) × previous EMA
    // where α = 2/(period + 1)
    for (let i = period; i < candles.length; i++) {
      const currentPrice = candles[i].close;
      const ema = currentPrice * alpha + prevEma * (1 - alpha);

      result.push({
        time: candles[i].time,
        value: ema,
      });

      // Update previous EMA for next calculation
      prevEma = ema;
    }

    console.log("[EMA] Calculated EMA values:", {
      period,
      points: result.length,
      firstValue: result[0].value,
      lastValue: result[result.length - 1].value,
    });

    return result;
  } catch (error) {
    console.error("[EMA] Error calculating EMA:", error);
    return [];
  }
}
