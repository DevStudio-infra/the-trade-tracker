"use client";

import { FormattedCandle } from "../../../chart/core/ChartTypes";

/**
 * Calculate the Relative Strength Index (RSI) from candle data
 *
 * @param candles Array of formatted candles
 * @param period The period for the RSI calculation (typically 14)
 * @returns Array of {time, value} points for the RSI
 */
export function calculateRSI(candles: FormattedCandle[], period: number) {
  // Handle edge cases
  if (!candles || candles.length === 0 || period <= 0) {
    return [];
  }

  // We need at least period+1 candles to calculate the first RSI
  if (candles.length < period + 1) {
    return [];
  }

  // Initialize result array
  const result = [];

  // Calculate price changes
  const priceChanges = [];
  for (let i = 1; i < candles.length; i++) {
    priceChanges.push(candles[i].close - candles[i - 1].close);
  }

  // Separate gains and losses
  const gains = priceChanges.map((change) => (change > 0 ? change : 0));
  const losses = priceChanges.map((change) => (change < 0 ? Math.abs(change) : 0));

  // Calculate average gain and loss for the first period
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Avoid division by zero
  if (avgLoss === 0) {
    result.push({
      time: candles[period].time,
      value: 100,
    });
  } else {
    // Calculate RS and RSI
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    result.push({
      time: candles[period].time,
      value: rsi,
    });
  }

  // Calculate RSI for remaining periods using smoothed method
  for (let i = period; i < priceChanges.length; i++) {
    // Update average gain and loss using smoothed method
    // avgGain = ((period - 1) * prevAvgGain + currentGain) / period
    avgGain = ((period - 1) * avgGain + gains[i]) / period;
    avgLoss = ((period - 1) * avgLoss + losses[i]) / period;

    // Avoid division by zero
    if (avgLoss === 0) {
      result.push({
        time: candles[i + 1].time,
        value: 100,
      });
    } else {
      // Calculate RS and RSI
      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      result.push({
        time: candles[i + 1].time,
        value: rsi,
      });
    }
  }

  return result;
}
