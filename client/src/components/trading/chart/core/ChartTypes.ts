"use client";

import { IChartApi, ISeriesApi, Time, IPaneApi, SeriesType, SeriesDefinition, SeriesPartialOptionsMap } from "lightweight-charts";

/**
 * Available timeframes for chart display
 */
export const timeframes = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
  { label: "1w", value: "1w" },
];

/**
 * Extended Chart API that includes v5 specific methods
 * This interface combines the standard IChartApi with additional
 * methods available in v5 of lightweight-charts
 */
export interface ChartApiWithPanes extends IChartApi {
  createPane: (options: { height: number }) => IPaneApi<Time>;
  panes: () => IPaneApi<Time>[];
  removePane: (index: number) => void;
  addSeries: <T extends SeriesType>(definition: SeriesDefinition<T>, options?: SeriesPartialOptionsMap[T], paneIndex?: number) => ISeriesApi<T>;
}

/**
 * Reference to all chart instances and series
 */
export interface ChartInstanceRef {
  chart: IChartApi | null;
  candlestickSeries: ISeriesApi<"Candlestick"> | null;
  volumeSeries: ISeriesApi<"Histogram"> | null;
}

/**
 * Formatted candle data for rendering
 */
export interface FormattedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Indicator parameter type
 * This is a union of all possible parameter types
 */
export type IndicatorParameterValue = string | number | boolean | Record<string, unknown>;

/**
 * Indicator parameters
 */
export interface IndicatorParameters {
  [key: string]: IndicatorParameterValue | undefined;
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  paneIndex?: number;
  additionalSeries?: {
    [key: string]: ISeriesApi<SeriesType> | null;
  };
  // Allow storing arbitrary objects as a property, needed for renderer references
  [key: symbol]: unknown;
}

/**
 * Supported indicator types
 */
export type IndicatorType = "SMA" | "EMA" | "RSI" | "MACD" | "BollingerBands" | "ATR" | "Stochastic" | "Ichimoku";

/**
 * Indicator configuration
 */
export interface IndicatorConfig {
  id: string;
  type: IndicatorType | string;
  name: string;
  color: string;
  visible: boolean;
  parameters: IndicatorParameters;
  series?: ISeriesApi<SeriesType>;
  paneIndex?: number;
}

/**
 * Default indicator settings
 */
export interface IndicatorDefaults {
  [key: string]: {
    defaultPane: number;
    defaultParameters: IndicatorParameters;
  };
}

/**
 * Base indicator defaults (to be extended by specific indicators)
 */
export const indicatorDefaults: IndicatorDefaults = {
  SMA: {
    defaultPane: 0,
    defaultParameters: {
      period: 20,
    },
  },
  EMA: {
    defaultPane: 0,
    defaultParameters: {
      period: 20,
    },
  },
  RSI: {
    defaultPane: 2,
    defaultParameters: {
      period: 14,
    },
  },
  MACD: {
    defaultPane: 2,
    defaultParameters: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      macdColor: "#2962FF",
      signalColor: "#FF6D00",
      histogramColorPositive: "#26A69A",
      histogramColorNegative: "#EF5350",
    },
  },
  BollingerBands: {
    defaultPane: 0,
    defaultParameters: {
      period: 20,
      stdDev: 2,
    },
  },
  ATR: {
    defaultPane: 2,
    defaultParameters: {
      period: 14,
    },
  },
  Stochastic: {
    defaultPane: 2,
    defaultParameters: {
      kPeriod: 14,
      dPeriod: 3,
    },
  },
  Ichimoku: {
    defaultPane: 0,
    defaultParameters: {
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
    },
  },
};
