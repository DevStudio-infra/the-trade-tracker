import { Time } from "lightweight-charts";
import { Candle } from "@/lib/api";

export interface FormattedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

/**
 * Format candles for indicator use
 */
export function formatCandlesForIndicator(candles: Candle[]): FormattedCandle[] {
  return candles.map((candle) => ({
    time: (candle.timestamp / 1000) as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    value: candle.close,
  }));
}

/**
 * Format candles for chart display
 */
export function formatCandlesForChart(candles: Candle[]) {
  return candles.map((candle) => ({
    time: (candle.timestamp / 1000) as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

/**
 * Format candles for volume display
 */
export function formatCandlesForVolume(candles: Candle[]) {
  return candles.map((candle) => ({
    time: (candle.timestamp / 1000) as Time,
    value: candle.volume,
    color: candle.open <= candle.close ? "rgba(38, 166, 154, 0.3)" : "rgba(239, 83, 80, 0.3)",
  }));
}
