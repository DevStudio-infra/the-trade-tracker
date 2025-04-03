"use client";

import { Time } from "lightweight-charts";
import { FormattedCandle } from "../../../chart/core/ChartTypes";
import { calculateEMA } from "./ema";

/**
 * MACD (Moving Average Convergence Divergence) data structure
 */
export interface MACDData {
  macdLine: Array<{ time: Time; value: number }>;
  signalLine: Array<{ time: Time; value: number }>;
  histogram: Array<{ time: Time; value: number }>;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 *
 * @param candles - Array of candle data
 * @param fastPeriod - Fast EMA period
 * @param slowPeriod - Slow EMA period
 * @param signalPeriod - Signal line EMA period
 * @returns MACD data with MACD line, signal line, and histogram
 */
export function calculateMACD(candles: FormattedCandle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDData {
  // Handle edge cases
  if (!candles || candles.length === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Ensure we have enough candles for the calculation
  if (candles.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  // Create a map of slow EMA values by time for easy lookup
  const slowEMAMap = new Map(slowEMA.map((point) => [String(point.time), point.value]));

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine = fastEMA
    .filter((point) => slowEMAMap.has(String(point.time)))
    .map((point) => ({
      time: point.time,
      value: point.value - slowEMAMap.get(String(point.time))!,
    }));

  // If we don't have enough MACD points, return empty data
  if (macdLine.length < signalPeriod) {
    return { macdLine, signalLine: [], histogram: [] };
  }

  // Prepare data for signal line calculation
  const macdForSignal = macdLine.map((point) => ({
    time: point.time,
    close: point.value,
  })) as FormattedCandle[];

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdForSignal, signalPeriod);

  // Create a map of signal line values by time for easy lookup
  const signalMap = new Map(signalLine.map((point) => [String(point.time), point.value]));

  // Calculate histogram (MACD line - signal line)
  const histogram = macdLine
    .filter((point) => signalMap.has(String(point.time)))
    .map((point) => ({
      time: point.time,
      value: point.value - signalMap.get(String(point.time))!,
    }));

  return {
    macdLine,
    signalLine,
    histogram,
  };
}
