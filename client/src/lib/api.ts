import axios from "axios";
import { useAuth } from "@clerk/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  is_active: boolean;
  is_demo: boolean;
  last_used: Date | null;
  metadata: Record<string, unknown>;
  user_id: string;
  credentials: {
    apiKey: string;
    apiSecret: string;
    isDemo?: boolean;
  };
  created_at: Date;
  updated_at: Date;
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
      const { data } = await api.get<UserProfile>("/v1/user/profile");
      return data;
    },

    updateUserProfile: async (updates: { onboardingStep?: number; onboardingCompleted?: boolean }) => {
      const { data } = await api.patch<UserProfile>("/v1/user/profile", updates);
      return data;
    },

    // Onboarding
    submitOnboardingStep: async (step: number, data: unknown) => {
      const response = await api.post(`/v1/user/onboarding/${step}`, data);
      return response.data;
    },

    // Broker connections
    connectBroker: async (
      brokerName: string,
      credentials: {
        apiKey: string;
        apiSecret: string;
        demo?: boolean;
      }
    ) => {
      const { data } = await api.post<BrokerConnection>("/v1/broker/connect", {
        brokerName,
        credentials,
      });
      return data;
    },

    getBrokerConnections: async () => {
      const { data } = await api.get<BrokerConnection[]>("/v1/broker/connections");
      return data;
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
