export interface ConfirmationRequest {
  signalId: string;
  pair: string;
  userTimeframe: string;
  higherTimeframe: string;
  originalSignal: {
    type: "BUY" | "SELL";
    confidence: number;
    strategy: string;
    stopLoss: number;
    takeProfit: number;
  };
  timestamp: number;
}

export interface ConfirmationResponse {
  confirmed: boolean;
  confidence: number;
  analysis: {
    trend_alignment: string;
    key_levels_validation: string;
    conflicting_signals: string[];
  };
  reasoning: string;
  chart_image_url: string;
}

export interface TimeframeMapping {
  "15M": string;
  "1H": string;
  "4H": string;
  Daily: string;
  [key: string]: string;
}

export const TIMEFRAME_MAP: TimeframeMapping = {
  "15M": "1H",
  "1H": "4H",
  "4H": "Daily",
  Daily: "Weekly",
};
