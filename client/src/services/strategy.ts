import { api } from "@/lib/api";

export interface StrategyRule {
  condition: string;
  parameters: Record<string, unknown>;
}

export interface RuleSet {
  conditions: StrategyRule[];
  operator: "AND" | "OR";
}

export interface StrategyRules {
  entry: RuleSet;
  exit: RuleSet;
  indicators: Record<string, number | string>;
  type?: string;
  market_conditions?: string[];
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  rules: StrategyRules;
  timeframes: string[];
  riskParameters: Record<string, unknown>;
  isActive: boolean;
  isPublic: boolean;
  userId: string | null;
  createdAt: string;
  performance?: string;
  signals?: number;
  winRate?: string;
}

export interface CreateStrategyDto {
  name: string;
  description: string;
  rules: StrategyRules;
  timeframes: string[];
  riskParameters: Record<string, unknown>;
  isPublic?: boolean;
}

export interface UpdateStrategyDto {
  name?: string;
  description?: string;
  rules?: StrategyRules;
  timeframes?: string[];
  riskParameters?: Record<string, unknown>;
  isActive?: boolean;
  isPublic?: boolean;
}

export interface StrategyResponse {
  success: boolean;
  data: Strategy;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface StrategiesResponse {
  success: boolean;
  data: Strategy[];
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export const strategyService = {
  // Get all strategies
  async getStrategies(): Promise<Strategy[]> {
    try {
      console.log("Strategy service: Fetching strategies...");
      const response = await api.get<StrategiesResponse>("/strategies");
      console.log("Strategy service: API response:", response);
      console.log("Strategy service: Strategies data:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("Strategy service: Error in getStrategies:", error);
      throw error;
    }
  },

  // Get strategy by ID
  async getStrategy(id: string): Promise<Strategy> {
    try {
      const response = await api.get<StrategyResponse>(`/strategies/${id}`);
      console.log("API response for getStrategy:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("Error in getStrategy:", error);
      throw error;
    }
  },

  // Create a new strategy
  async createStrategy(strategyData: CreateStrategyDto): Promise<Strategy> {
    try {
      console.log("Creating strategy with data:", strategyData);
      const response = await api.post<StrategyResponse>("/strategies", strategyData);
      console.log("API response for createStrategy:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("Error in createStrategy:", error);
      throw error;
    }
  },

  // Update a strategy
  async updateStrategy(id: string, strategyData: UpdateStrategyDto): Promise<Strategy> {
    try {
      const response = await api.patch<StrategyResponse>(`/strategies/${id}`, strategyData);
      console.log("API response for updateStrategy:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("Error in updateStrategy:", error);
      throw error;
    }
  },

  // Delete a strategy
  async deleteStrategy(id: string): Promise<void> {
    try {
      await api.delete(`/strategies/${id}`);
      console.log("Strategy deleted successfully");
    } catch (error) {
      console.error("Error in deleteStrategy:", error);
      throw error;
    }
  },
};
