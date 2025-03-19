import axios from "axios";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Types
export interface AIAnalysisRequest {
  pair: string;
  timeframe: string;
  credentialId: string;
  strategyId?: string;
  customPrompt?: string;
}

export interface AIAnalysisResponse {
  id: string;
  signalType: "BUY" | "SELL" | "NO_SIGNAL";
  confidence: number;
  analysis: {
    marketCondition: string;
    keyLevels: number[];
    indicators: Record<string, any>;
  };
  riskAssessment: {
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
  };
  chartImageUrl: string;
  createdAt: string;
}

export interface AISignalConfirmationRequest {
  signalId: string;
  higherTimeframe: string;
}

export interface AISignalConfirmationResponse {
  confirmed: boolean;
  confidence: number;
  analysis: {
    trendAlignment: boolean;
    keyLevelsValidation: boolean;
    conflictingSignals: string[];
  };
  reasoning: string;
  chartImageUrl: string;
}

export interface TradeExecutionRequest {
  signalId: string;
  credentialId: string;
  riskPercent: number;
}

export interface TradeExecutionResponse {
  tradeId: string;
  pair: string;
  entryPrice: number;
  quantity: number;
  side: "BUY" | "SELL";
  stopLoss: number;
  takeProfit: number;
  status: string;
  createdAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  rules: any;
  timeframes: string[];
  riskParameters: any;
  isActive: boolean;
}

export interface BotInstanceConfig {
  userId: string;
  strategyId: string;
  pair: string;
  timeframe: string;
  riskSettings: {
    maxRiskPercent: number;
    maxPositions: number;
    requireConfirmation: boolean;
  };
}

// API Client class
export class AITradingAPI {
  private token: string | null = null;

  constructor() {
    // Check for token in localStorage when in browser environment
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private handleError(error: any, customMessage: string) {
    console.error(`${customMessage}:`, error);
    const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
    toast.error(errorMessage);
    throw error;
  }

  // AI Analysis endpoints
  async analyzeChart(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const response = await axios.post(`${API_URL}/api/ai/analyze`, request, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to analyze chart");
      throw error;
    }
  }

  async confirmSignal(request: AISignalConfirmationRequest): Promise<AISignalConfirmationResponse> {
    try {
      const response = await axios.post(`${API_URL}/api/ai/confirm-signal`, request, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to confirm signal");
      throw error;
    }
  }

  async executeTrade(request: TradeExecutionRequest): Promise<TradeExecutionResponse> {
    try {
      const response = await axios.post(`${API_URL}/api/trading/execute`, request, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to execute trade");
      throw error;
    }
  }

  // Strategy management
  async getStrategies(): Promise<Strategy[]> {
    try {
      const response = await axios.get(`${API_URL}/api/strategies`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to fetch strategies");
      throw error;
    }
  }

  // Bot instance management
  async createBotInstance(config: BotInstanceConfig): Promise<any> {
    try {
      const response = await axios.post(`${API_URL}/api/bot-instances`, config, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to create bot instance");
      throw error;
    }
  }

  async getBotInstances(): Promise<any[]> {
    try {
      const response = await axios.get(`${API_URL}/api/bot-instances`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to fetch bot instances");
      throw error;
    }
  }

  async toggleBotInstance(id: string, isActive: boolean): Promise<any> {
    try {
      const response = await axios.patch(`${API_URL}/api/bot-instances/${id}`, { isActive }, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to toggle bot instance");
      throw error;
    }
  }

  async deleteBotInstance(id: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}/api/bot-instances/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      this.handleError(error, "Failed to delete bot instance");
      throw error;
    }
  }
}

// Create a singleton instance
export const aiTradingApi = new AITradingAPI();

// Custom hook for easy use in components
export function useAITradingApi() {
  return aiTradingApi;
}
