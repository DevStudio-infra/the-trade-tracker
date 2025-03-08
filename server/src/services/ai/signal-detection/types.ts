export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalRequest {
  userId: string;
  pair: string;
  timeframe: string;
  strategies: string[];
  timestamp: number;
}

export interface SignalResponse {
  signal_id: string;
  pair: string;
  signal_type: "BUY" | "SELL" | "NO_SIGNAL";
  confidence: number;
  strategy: string;
  stop_loss: number;
  take_profit: number;
  risk_percent_score: number;
  chart_image_url: string;
  analysis: {
    market_condition: string;
    key_levels: number[];
    indicators: Record<string, any>;
  };
}

export interface SignalAnalysis {
  signal: "BUY" | "SELL" | "NO_SIGNAL";
  confidence: number;
  strategy: string;
  analysis: {
    market_condition: string;
    key_levels: number[];
    indicators: Record<string, any>;
  };
  risk_assessment: {
    stop_loss: number;
    take_profit: number;
    risk_reward_ratio: number;
  };
}
