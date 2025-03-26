// Type definitions for the Trading Chart components
import type { IChartApi, ISeriesApi, Time, SeriesType } from "lightweight-charts";

// Re-export Time type from lightweight-charts
export type { Time } from "lightweight-charts";

// Define a type for candle data to address 'any' type warnings
export interface FormattedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number; // Usually volume
}

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
  paneIndex?: number; // Add pane index for indicators in separate panes
  // Additional series for complex indicators that require multiple series
  additionalSeries?: {
    signalSeries?: ISeriesApi<SeriesType> | null; // Reference to signal line series for MACD
    histogramSeries?: ISeriesApi<SeriesType> | null; // Reference to histogram series for MACD
    upperSeries?: ISeriesApi<SeriesType> | null; // Reference to upper band series for Bollinger Bands
    lowerSeries?: ISeriesApi<SeriesType> | null; // Reference to lower band series for Bollinger Bands
  };
}

// Define top indicators
export type IndicatorType = "sma" | "ema" | "rsi" | "macd" | "bollinger" | "volume" | "stochastic" | "atr" | "ichimoku";

// Indicator configuration type
export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  color: string;
  visible: boolean;
  parameters: IndicatorParameters;
  series?: ISeriesApi<SeriesType> | null;
  paneIndex?: number; // Add pane index for indicator placement
}

// Updated indicator defaults interface with description
interface IndicatorDefault {
  name: string;
  parameters: IndicatorParameters;
  description: string;
  defaultPane?: number; // Default pane index for the indicator
}

// Common indicator default parameters
export const indicatorDefaults: Record<IndicatorType, IndicatorDefault> = {
  sma: {
    name: "Simple Moving Average",
    parameters: { period: 20, color: "#2962FF" },
    description: "Simple average of prices over a period",
    defaultPane: 0, // Main price pane
  },
  ema: {
    name: "Exponential Moving Average",
    parameters: { period: 20, color: "#FF6D00" },
    description: "Weighted average giving more importance to recent prices",
    defaultPane: 0, // Main price pane
  },
  rsi: {
    name: "Relative Strength Index",
    parameters: { period: 14, color: "#F44336", overbought: 70, oversold: 30 },
    description: "Momentum oscillator measuring speed of price movements",
    defaultPane: 2, // Separate pane for oscillators
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
      paneIndex: 2, // Force MACD to always use pane 2
    },
    description: "Trend-following momentum indicator showing relationship between two moving averages",
    defaultPane: 2, // Separate pane for oscillators (same as RSI)
  },
  bollinger: {
    name: "Bollinger Bands",
    parameters: { period: 20, stdDev: 2, color: "#7B1FA2" },
    description: "Volatility bands placed above and below a moving average",
    defaultPane: 0, // Main price pane
  },
  stochastic: {
    name: "Stochastic Oscillator",
    parameters: { kPeriod: 14, dPeriod: 3, color: "#43A047" },
    description: "Momentum indicator comparing closing price to price range over time",
    defaultPane: 2, // Separate pane for oscillators
  },
  volume: {
    name: "Volume",
    parameters: {
      upColor: "rgba(76, 175, 80, 0.5)",
      downColor: "rgba(255, 82, 82, 0.5)",
    },
    description: "Trading volume indicator showing market activity",
    defaultPane: 1, // Volume pane
  },
  atr: {
    name: "Average True Range",
    parameters: { period: 14, color: "#9C27B0" },
    description: "Indicator measuring market volatility",
    defaultPane: 2, // Separate pane
  },
  ichimoku: {
    name: "Ichimoku Cloud",
    parameters: {
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
      color: "#5D69B1",
    },
    description: "Japanese charting method showing support and resistance levels",
    defaultPane: 0, // Main price pane
  },
};

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
