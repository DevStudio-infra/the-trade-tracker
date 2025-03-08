export interface ChartOptions {
  width?: number;
  height?: number;
  layout?: {
    background?: { color: string };
    textColor?: string;
  };
  grid?: {
    vertLines?: { color: string };
    horzLines?: { color: string };
  };
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartIndicator {
  type: "EMA" | "RSI" | "MACD";
  period?: number;
  color?: string;
  lineWidth?: number;
}
