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
    return [];
  }

  // Ensure the period isn't larger than the data set
  const actualPeriod = Math.min(period, candles.length);

  // Initialize result array
  const result = [];

  // Calculate SMA for each point where we have enough data
  for (let i = actualPeriod - 1; i < candles.length; i++) {
    let sum = 0;

    // Sum the closing prices for the period
    for (let j = 0; j < actualPeriod; j++) {
      sum += candles[i - j].close;
    }

    // Calculate average and add to result
    const smaValue = sum / actualPeriod;

    result.push({
      time: candles[i].time,
      value: smaValue,
    });
  }

  return result;
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
