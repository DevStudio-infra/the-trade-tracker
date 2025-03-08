export enum SignalType {
  BUY = "BUY",
  SELL = "SELL",
  NO_SIGNAL = "NO_SIGNAL",
}

export interface SignalBase {
  pair: string;
  timeframe: string;
  signal: SignalType;
  confidence: number;
  strategy: string;
  stop_loss: number;
  take_profit: number;
  risk_percent_score: number;
}

export interface SignalAnalysis {
  market_condition: string;
  strategy_rules_met: boolean;
  filters_passed: string[];
}

export interface SignalConfirmationAnalysis {
  higher_timeframe_trend: string;
  confirmation_factors: string[];
  risk_assessment: {
    adjusted_stop_loss?: number;
    adjusted_take_profit?: number;
    risk_reward_ratio: number;
  };
}
