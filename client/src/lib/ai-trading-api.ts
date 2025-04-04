import axios from "axios";
import { toast } from "sonner";
import { api } from "@/lib/api";

// API response types
interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// Types
export interface AIAnalysisRequest {
  pair: string;
  timeframe: string;
  credentialId: string;
  strategyId?: string;
  customPrompt?: string;
}

export interface AIAnalysisResponse {
  signal: "BUY" | "SELL" | "NO_SIGNAL";
  confidence: number;
  strategy: string;
  stopLoss: number;
  takeProfit: number;
  riskPercentScore: number;
  analysis: {
    marketCondition: string;
    strategyRulesMet: boolean;
    filtersPassed: string[];
  };
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
  rules: {
    entry: Record<string, unknown>;
    exit: Record<string, unknown>;
    indicators: Record<string, number | string>;
    type?: string;
    market_conditions?: string[];
  };
  timeframes: string[];
  riskParameters: Record<string, unknown>;
  isActive: boolean;
  isPublic: boolean;
  userId: string | null;
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

export interface BotInstance {
  id: string;
  userId: string;
  strategyId: string;
  pair: string;
  timeframe: string;
  isActive: boolean;
  riskSettings: {
    maxRiskPercent: number;
    maxPositions: number;
    requireConfirmation: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyRequest {
  name: string;
  description: string;
  timeframes: string[];
  rules: {
    entry: Record<string, unknown>;
    exit: Record<string, unknown>;
    indicators: Record<string, number | string>;
    type?: string;
    market_conditions?: string[];
  };
  riskParameters: Record<string, unknown>;
  isPublic?: boolean;
}

// API Client class
export class AITradingAPI {
  // AI Analysis endpoints
  async analyzeChart(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const response = await api.post<APIResponse<AIAnalysisResponse>>("/api/ai/analyze", request);
      return response.data.data;
    } catch (error) {
      console.error("Failed to analyze chart:", error);
      toast.error("Failed to analyze chart");
      throw error;
    }
  }

  async confirmSignal(request: AISignalConfirmationRequest): Promise<AISignalConfirmationResponse> {
    try {
      const response = await api.post<APIResponse<AISignalConfirmationResponse>>("/api/ai/confirm-signal", request);
      return response.data.data;
    } catch (error) {
      console.error("Failed to confirm signal:", error);
      toast.error("Failed to confirm signal");
      throw error;
    }
  }

  async executeTrade(request: TradeExecutionRequest): Promise<TradeExecutionResponse> {
    try {
      const response = await api.post<APIResponse<TradeExecutionResponse>>("/api/trading/execute", request);
      return response.data.data;
    } catch (error) {
      console.error("Failed to execute trade:", error);
      toast.error("Failed to execute trade");
      throw error;
    }
  }

  // Strategy management
  async getStrategies(): Promise<Strategy[]> {
    try {
      console.log("Fetching strategies...");
      const response = await api.get<APIResponse<Strategy[]>>("/strategies");
      console.log("Strategies API response:", response);
      if (!response.data.success) {
        throw new Error(response.data.error?.message || "Failed to fetch strategies");
      }
      return response.data.data;
    } catch (error) {
      console.error("Error fetching strategies:", error);
      toast.error("Failed to fetch strategies");
      throw error;
    }
  }

  async createStrategy(request: CreateStrategyRequest): Promise<Strategy> {
    try {
      const response = await api.post<APIResponse<Strategy>>("/strategies", request);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || "Failed to create strategy");
      }

      return response.data.data;
    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400) {
          const message = error.response.data.error?.message || "Invalid strategy data";
          console.error("Validation error:", message);
          toast.error(message);
          throw new Error(message);
        } else if (error.response.status === 409) {
          const message = "A strategy with this name already exists";
          console.error(message);
          toast.error(message);
          throw new Error(message);
        }
      }
      console.error("Failed to create strategy:", error);
      toast.error("Failed to create strategy");
      throw error;
    }
  }

  // Bot instance management
  async createBotInstance(config: BotInstanceConfig): Promise<BotInstance> {
    try {
      const response = await api.post<APIResponse<BotInstance>>("/api/bot-instances", config);
      if (!response.data.success) {
        throw new Error(response.data.error?.message || "Failed to create bot instance");
      }
      return response.data.data;
    } catch (error) {
      console.error("Failed to create bot instance:", error);
      toast.error("Failed to create bot instance");
      throw error;
    }
  }

  async getBotInstances(): Promise<BotInstance[]> {
    try {
      const response = await api.get<APIResponse<BotInstance[]>>("/api/bot-instances");
      if (!response.data.success) {
        throw new Error(response.data.error?.message || "Failed to fetch bot instances");
      }
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch bot instances:", error);
      toast.error("Failed to fetch bot instances");
      throw error;
    }
  }

  async toggleBotInstance(id: string, isActive: boolean): Promise<BotInstance> {
    try {
      const response = await api.patch<APIResponse<BotInstance>>(`/api/bot-instances/${id}`, { isActive });
      if (!response.data.success) {
        throw new Error(response.data.error?.message || "Failed to toggle bot instance");
      }
      return response.data.data;
    } catch (error) {
      console.error("Failed to toggle bot instance:", error);
      toast.error("Failed to toggle bot instance");
      throw error;
    }
  }

  async deleteBotInstance(id: string): Promise<void> {
    try {
      await api.delete<APIResponse<void>>(`/api/bot-instances/${id}`);
    } catch (error) {
      console.error("Failed to delete bot instance:", error);
      toast.error("Failed to delete bot instance");
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
