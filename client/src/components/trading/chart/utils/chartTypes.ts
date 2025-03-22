// Type definitions for the Trading Chart components
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";

// Re-export Time type from lightweight-charts
export type { Time } from "lightweight-charts";

// Define timeframes
export const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

// Define types for indicator parameters
export interface IndicatorParameters {
  period?: number;
  color?: string;
  overbought?: number;
  oversold?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  macdColor?: string;
  signalColor?: string;
  histogramColorPositive?: string;
  histogramColorNegative?: string;
  stdDev?: number;
  kPeriod?: number;
  dPeriod?: number;
  conversionPeriod?: number;
  basePeriod?: number;
  spanPeriod?: number;
  displacement?: number;
  levels?: number[];
  upColor?: string;
  downColor?: string;
}

// Define top indicators
export type IndicatorType = "sma" | "ema" | "rsi" | "macd" | "bollinger" | "stochastic" | "atr" | "ichimoku" | "fibonacci" | "volume";

// Indicator configuration type
export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  color: string;
  visible: boolean;
  parameters: IndicatorParameters;
  series?: ISeriesApi<"Line" | "Histogram" | "Area"> | null;
}

// Common indicator default parameters
export const indicatorDefaults: Record<IndicatorType, { name: string; parameters: IndicatorParameters }> = {
  sma: {
    name: "Simple Moving Average",
    parameters: { period: 20, color: "#2962FF" },
  },
  ema: {
    name: "Exponential Moving Average",
    parameters: { period: 20, color: "#FF6D00" },
  },
  rsi: {
    name: "Relative Strength Index",
    parameters: { period: 14, color: "#F44336", overbought: 70, oversold: 30 },
  },
  macd: {
    name: "MACD",
    parameters: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      macdColor: "#2962FF",
      signalColor: "#FF6D00",
      histogramColorPositive: "#26A69A",
      histogramColorNegative: "#EF5350",
    },
  },
  bollinger: {
    name: "Bollinger Bands",
    parameters: { period: 20, stdDev: 2, color: "#7B1FA2" },
  },
  stochastic: {
    name: "Stochastic Oscillator",
    parameters: { kPeriod: 14, dPeriod: 3, color: "#43A047" },
  },
  atr: {
    name: "Average True Range",
    parameters: { period: 14, color: "#FFB300" },
  },
  ichimoku: {
    name: "Ichimoku Cloud",
    parameters: {
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
    },
  },
  fibonacci: {
    name: "Fibonacci Retracement",
    parameters: { levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] },
  },
  volume: {
    name: "Volume",
    parameters: {
      upColor: "rgba(76, 175, 80, 0.5)",
      downColor: "rgba(255, 82, 82, 0.5)",
    },
  },
};

// Define a type for candle data to address 'any' type warnings
export interface FormattedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

// Chart instance reference type
export interface ChartInstanceRef {
  chart: IChartApi | null;
  candlestickSeries: ISeriesApi<"Candlestick"> | null;
  volumeSeries: ISeriesApi<"Histogram"> | null;
}

// Trading chart props
export interface TradingChartProps {
  pair: string | null;
}

// Chart colors type
export interface ChartColors {
  background: string;
  text: string;
  grid: string;
  borderColor: string;
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
  volumeUp: string;
  volumeDown: string;
}

// Request parameters type
export interface RequestParams {
  pair: string;
  brokerId: string;
  timeframe: string;
}
