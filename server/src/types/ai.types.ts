import { SignalType } from "./signal.types";

export interface SignalRequest {
  pair: string;
  timeframe: string;
  chartImage: Buffer;
  candles: any[];
  strategies: string[];
}

export interface SignalResponse {
  pair: string;
  signal: SignalType;
  confidence: number;
  strategy: string;
  stop_loss: number;
  take_profit: number;
  risk_percent_score: number;
  analysis: {
    market_condition: string;
    strategy_rules_met: boolean;
    filters_passed: string[];
  };
}

export interface SignalConfirmationRequest {
  originalSignal: SignalResponse;
  higherTimeframeChart: Buffer;
  higherTimeframeCandles: any[];
}

export interface SignalConfirmationResponse {
  isConfirmed: boolean;
  confidence: number;
  analysis: {
    higher_timeframe_trend: string;
    confirmation_factors: string[];
    risk_assessment: {
      adjusted_stop_loss?: number;
      adjusted_take_profit?: number;
      risk_reward_ratio: number;
    };
  };
}
