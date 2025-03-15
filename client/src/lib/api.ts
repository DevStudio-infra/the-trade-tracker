import axios from "axios";
import { useAuth } from "@clerk/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/v1";

// API response types
export interface UserProfile {
  id: string;
  subscriptionPlan: "Free" | "Pro";
  credits: number;
  onboardingCompleted: boolean;
  onboardingStep: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    trades: number;
    signals: number;
    brokerCredentials: number;
  };
}

export interface BrokerConnection {
  id: string;
  broker_name: string;
  description: string;
  is_active: boolean;
  last_used: Date | null;
  user_id: string;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface BrokerConnectionUpdate {
  is_active?: boolean;
  description?: string;
  credentials?: {
    apiKey: string;
    identifier: string;
    password: string;
  };
}

export interface CapitalComCredentials {
  apiKey: string;
  identifier: string;
  password: string;
}

export interface BinanceCredentials {
  apiKey: string;
  secretKey: string;
}

export interface MetaTraderCredentials {
  login: string;
  password: string;
  server: string;
}

export type BrokerCredentialsWithType =
  | ({ type: "capital_com" } & CapitalComCredentials)
  | ({ type: "binance" } & BinanceCredentials)
  | ({ type: "mt4" | "mt5" } & MetaTraderCredentials);

export interface BrokerCredentials {
  broker_name: string;
  description: string;
  is_active?: boolean;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
  };
  last_used?: string | null;
}

// Create authenticated API client
export function useApi() {
  const { getToken } = useAuth();

  const api = axios.create({
    baseURL: BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add auth interceptor
  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // API endpoints
  return {
    // User profile
    getUserProfile: async () => {
      const { data } = await api.get<UserProfile>("/user/profile");
      return data;
    },

    createUser: async () => {
      const { data } = await api.post<UserProfile>("/user/profile");
      return data;
    },

    updateUserProfile: async (updates: { onboardingStep?: number; onboardingCompleted?: boolean }) => {
      const { data } = await api.patch<UserProfile>("/user/profile", updates);
      return data;
    },

    // Settings
    getUserSettings: async () => {
      const { data } = await api.get("/user/settings");
      return data;
    },

    updateUserSettings: async (updates: { subscription_plan?: string; is_active?: boolean }) => {
      const { data } = await api.patch("/user/settings", updates);
      return data;
    },

    // Onboarding
    submitOnboardingStep: async (step: number, data: unknown) => {
      const response = await api.post(`/user/onboarding/${step}`, data);
      return response.data;
    },

    // Broker connections
    connectBroker: async (broker: string, credentials: BrokerCredentials) => {
      const { data } = await api.post<BrokerConnection>("/broker/connect", {
        broker_name: credentials.broker_name,
        description: credentials.description,
        is_active: credentials.is_active ?? true,
        credentials: credentials.credentials,
      });
      return data;
    },

    getBrokerConnections: async () => {
      const { data } = await api.get<BrokerConnection[]>("/broker/connections");
      return data;
    },

    updateBrokerConnection: async (connectionId: string, updates: BrokerConnectionUpdate) => {
      const { data } = await api.patch<BrokerConnection>(`/broker/connections/${connectionId}`, updates);
      return data;
    },

    deleteBrokerConnection: async (connectionId: string) => {
      await api.delete(`/broker/connections/${connectionId}`);
    },

    validateBrokerConnection: async (connectionId: string) => {
      const { data } = await api.post<{ isValid: boolean }>(`/broker/connections/${connectionId}/validate`);
      return data.isValid;
    },

    // Error handler
    handleError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        return {
          message: error.response?.data?.error || "An error occurred",
          status: error.response?.status,
        };
      }
      return {
        message: "An unexpected error occurred",
        status: 500,
      };
    },
  };
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
