import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

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
  is_demo: boolean;
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
  is_demo?: boolean;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
  };
  last_used?: string | null;
}

export interface TradingPair {
  symbol: string;
  name: string;
  displayName: string;
  type: string;
  minQuantity: number;
  maxQuantity: number;
  precision: number;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  broker_id: string | null;
  added_at: string;
  notes: string | null;
  price_alerts:
    | {
        price: number;
        condition: "above" | "below";
        triggered: boolean;
        id: string;
      }[]
    | null;
}

export interface MarketNode {
  id: string;
  name: string;
}

export interface MarketNavigationResponse {
  nodes: MarketNode[];
}

// Define proper interface for API errors
interface ApiErrorResponse {
  message: string;
  status: number;
}

// Error handler function independent of useApi
function handleApiError(error: unknown): ApiErrorResponse {
  console.error("API Error:", error);
  let message = "An error occurred";
  let status = 500;

  if (axios.isAxiosError(error)) {
    status = error.response?.status || 500;
    message = error.response?.data?.message || error.message || "An error occurred";
  }

  return { message, status };
}

// Add Capital.com API configuration
const CAPITAL_API_CONFIG = {
  BASE_URL: "https://api-capital.backend-capital.com/",
  DEMO_URL: "https://demo-api-capital.backend-capital.com/",
  TIMEOUT: 10000,
};

// Define interfaces for our data types
interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CapitalCandle {
  snapshotTime: string;
  openPrice: { bid: number; ask: number };
  closePrice: { bid: number; ask: number };
  highPrice: { bid: number; ask: number };
  lowPrice: { bid: number; ask: number };
  lastTradedVolume?: number;
}

// Define a more specific type for the API client
interface APIClient {
  getBrokerCredential: (credentialId: string) => Promise<BrokerConnection>;
  // Add other methods as needed
}

// Modify the getCandles function to use the is_demo field
async function getCandles(api: APIClient, brokerCredentialId: string, pair: string, timeframe: string = "1h"): Promise<CandleData[]> {
  try {
    // Get the broker credential details
    const credential = await api.getBrokerCredential(brokerCredentialId);

    // Use the is_demo field directly from the credential
    const isDemo = credential?.is_demo || false;

    // Choose appropriate base URL based on account type
    const baseUrl = isDemo ? CAPITAL_API_CONFIG.DEMO_URL : CAPITAL_API_CONFIG.BASE_URL;

    console.log(`Fetching candles for ${pair} using ${isDemo ? "demo" : "live"} Capital.com API`);

    // Map timeframe to Capital.com's format
    const capitalTimeframe = mapTimeframeToCapital(timeframe);

    // Extract API key and credentials from the broker credential
    const { apiKey } = credential.credentials;

    // Format the request to Capital.com
    const url = `${baseUrl}prices/${pair}?resolution=${capitalTimeframe}&max=200&includeUnfinished=true`;
    const headers = {
      "X-CAP-API-KEY": apiKey,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Error fetching candles: ${response.statusText}`);
    }

    const data = await response.json();

    // Format the response to match our expected format
    return formatCapitalCandles(data.prices || []);
  } catch (error) {
    console.error("Error fetching candles:", error);
    // Return mock data while in development
    return generateMockCandles(pair, timeframe);
  }
}

// Helper function to map our timeframes to Capital.com's format
function mapTimeframeToCapital(timeframe: string): string {
  const map: Record<string, string> = {
    "1m": "MINUTE",
    "5m": "MINUTE_5",
    "15m": "MINUTE_15",
    "30m": "MINUTE_30",
    "1h": "HOUR",
    "4h": "HOUR_4",
    "1d": "DAY",
  };

  return map[timeframe] || "HOUR";
}

// Helper function to format Capital.com candles to our format
function formatCapitalCandles(capitalCandles: CapitalCandle[]): CandleData[] {
  return capitalCandles.map((candle) => ({
    time: new Date(candle.snapshotTime).getTime() / 1000,
    open: candle.openPrice.bid,
    high: candle.highPrice.bid,
    low: candle.lowPrice.bid,
    close: candle.closePrice.bid,
    volume: candle.lastTradedVolume || 0,
  }));
}

// Generate mock candles for development and testing
function generateMockCandles(pair: string, timeframe: string): CandleData[] {
  console.log(`Generating mock candles for ${pair} (${timeframe})`);

  const candles: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const basePrice = getBasePriceForPair(pair);

  for (let i = 0; i < 200; i++) {
    const time = now - timeframeSeconds * (200 - i);
    const volatility = basePrice * 0.01; // 1% volatility

    // Generate random price movement
    const open = basePrice + (Math.random() * volatility * 2 - volatility);
    const close = open + (Math.random() * volatility * 2 - volatility);
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 100) + 50;

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}

// Helper function to convert timeframe to seconds
function getTimeframeSeconds(timeframe: string): number {
  const map: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
  };

  return map[timeframe] || 3600;
}

// Helper to get a base price for each pair to make mock data more realistic
function getBasePriceForPair(pair: string): number {
  const pairPrices: Record<string, number> = {
    EURUSD: 1.09,
    GBPUSD: 1.27,
    USDJPY: 108.5,
    USDCHF: 0.92,
    AUDUSD: 0.67,
    NZDUSD: 0.63,
    USDCAD: 1.34,
    CADCHF: 0.68,
    EURGBP: 0.86,
    EURJPY: 118.5,
  };

  return pairPrices[pair] || 1.0; // Default to 1.0 if pair not found
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

    // Trading pairs direct methods (not requiring broker connection)
    getPairsCategories: async (): Promise<string[]> => {
      const { data } = await api.get<{ categories: string[]; count: number }>("/pairs/categories");
      return data.categories;
    },

    getPairsByCategory: async (category: string): Promise<TradingPair[]> => {
      const { data } = await api.get<{ pairs: TradingPair[]; count: number }>(`/pairs/${category}`);
      return data.pairs;
    },

    searchPairsDirect: async (query: string): Promise<TradingPair[]> => {
      const { data } = await api.get<{ pairs: TradingPair[]; count: number }>(`/pairs/search?q=${encodeURIComponent(query)}`);
      return data.pairs;
    },

    // Broker connections
    connectBroker: async (broker: string, credentials: BrokerCredentials) => {
      const { data } = await api.post<BrokerConnection>("/broker/connect", {
        broker_name: credentials.broker_name,
        description: credentials.description,
        is_active: credentials.is_active ?? true,
        is_demo: credentials.is_demo ?? false,
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

    getTradingPairs: async (connectionId: string, search?: string, limit?: number, category?: string, offset?: number): Promise<TradingPair[]> => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (limit) params.append("limit", limit.toString());
      if (category) params.append("category", category);
      if (offset) params.append("offset", offset.toString());

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const response = await api.get<TradingPair[]>(`/broker/connections/${connectionId}/pairs${queryString}`);
      return response.data;
    },

    // Watchlist methods
    getWatchlist: async (): Promise<WatchlistItem[]> => {
      const { data } = await api.get<WatchlistItem[]>("/user/watchlist");
      return data;
    },

    addToWatchlist: async (symbol: string, brokerId?: string): Promise<WatchlistItem> => {
      const { data } = await api.post<WatchlistItem>("/user/watchlist", {
        symbol,
        broker_id: brokerId,
      });
      return data;
    },

    removeFromWatchlist: async (symbol: string): Promise<{ success: boolean }> => {
      const { data } = await api.delete<{ success: boolean }>(`/user/watchlist/${symbol}`);
      return data;
    },

    // Market navigation methods
    getMarketNavigation: async (nodeId: string, limit?: number) => {
      const { data } = await api.get<MarketNavigationResponse>(`/market/navigation/${nodeId}`, {
        params: {
          limit: limit,
        },
      });
      return data;
    },

    getMarketDetails: async (epics: string) => {
      const { data } = await api.get<TradingPair[]>(`/market/details/${epics}`);
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

    /**
     * Get open positions
     */
    getPositions: async () => {
      try {
        const response = await api.get("/trading/positions");
        return response.data;
      } catch (error) {
        const errorInfo = handleApiError(error);
        toast.error(errorInfo.message);
        throw error;
      }
    },

    /**
     * Close a position
     */
    closePosition: async (tradeId: string) => {
      try {
        const response = await api.post("/trading/close-position", { tradeId });
        return response.data;
      } catch (error) {
        const errorInfo = handleApiError(error);
        toast.error(errorInfo.message);
        throw error;
      }
    },

    /**
     * Execute a trade
     */
    executeTrade: async (signalId: string, credentialId: string, riskPercent: number = 1) => {
      try {
        const response = await api.post("/trading/execute", {
          signalId,
          credentialId,
          riskPercent,
        });
        return response.data;
      } catch (error) {
        const errorInfo = handleApiError(error);
        toast.error(errorInfo.message);
        throw error;
      }
    },

    /**
     * Get trade history
     */
    getTradeHistory: async (limit: number = 10, offset: number = 0) => {
      try {
        const response = await api.get("/trading/history", {
          params: { limit, offset },
        });
        return response.data;
      } catch (error) {
        const errorInfo = handleApiError(error);
        toast.error(errorInfo.message);
        throw error;
      }
    },

    // Broker credentials
    getBrokerCredential: async (credentialId: string): Promise<BrokerConnection> => {
      try {
        const { data } = await api.get<BrokerConnection>(`/broker/connections/${credentialId}`);
        return data;
      } catch (error) {
        const errorInfo = handleApiError(error);
        toast.error(errorInfo.message);
        throw error;
      }
    },

    getCandles,
  };
}

// Create an Axios instance with default configuration
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies/sessions
});

// Add a request interceptor to include authentication headers
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    // const token = localStorage.getItem("token");
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    console.error("API request error:", error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log details about the error for debugging
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx range
      console.error("API error response:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("API error request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("API error message:", error.message);
    }

    return Promise.reject(error);
  }
);

// Export default API instance
export default api;
