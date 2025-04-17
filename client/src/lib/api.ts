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
  description?: string;
  is_active: boolean;
  last_used: string | null;
  created_at: string;
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

// Trading data response interface
export interface CandleDataResponse {
  success: boolean;
  message: string;
  data: {
    tradingPair: string;
    timeframe: string;
    candles: Candle[];
    source: "cache" | "api";
    precision: number;
  };
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  tradeId: string;
  pair: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  openTime: string;
}

// Helper for implementing retry with exponential backoff
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Add a helper function to determine appropriate decimal precision for a trading pair
const getSymbolPrecision = (symbol: string): number => {
  // Common precision rules for different asset classes
  if (symbol.includes("JPY")) return 3; // JPY pairs typically have 3 decimals
  if (symbol.includes("BTC") || symbol.startsWith("BTC")) return 8; // Bitcoin pairs need 8 decimals
  if (symbol.includes("ETH") || symbol.startsWith("ETH")) return 6; // Ethereum pairs
  if (symbol.includes("USD") || symbol.includes("EUR") || symbol.includes("GBP") || symbol.includes("AUD")) {
    return 5; // Major forex pairs typically have 5 decimals
  }
  // Default precision for other instruments
  return 4;
};

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
        credentials: credentials.credentials,
      });
      return data;
    },

    getBrokerConnections: async () => {
      try {
        console.log("API Client: Sending request to /broker/connections");
        const { data } = await api.get<BrokerConnection[]>("/broker/connections");
        console.log(`API Client: Received ${Array.isArray(data) ? data.length : 0} broker connections`);

        // Validate the response structure
        if (!Array.isArray(data)) {
          console.error("API Client: Unexpected response format for broker connections:", data);
          throw new Error("Unexpected response format for broker connections");
        }

        return data;
      } catch (error) {
        console.error("API Client: Error fetching broker connections", error);
        throw error;
      }
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
      try {
        console.log(`API Client: Fetching trading pairs for connection ${connectionId}`, { search, limit, category, offset });

        if (!connectionId) {
          console.error("API Client: Cannot fetch trading pairs - connectionId is required");
          throw new Error("Connection ID is required to fetch trading pairs");
        }

        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (limit) params.append("limit", limit.toString());
        if (category) params.append("category", category);
        if (offset) params.append("offset", offset.toString());

        const queryString = params.toString() ? `?${params.toString()}` : "";
        const response = await api.get<TradingPair[]>(`/broker/connections/${connectionId}/pairs${queryString}`);

        console.log(`API Client: Received ${Array.isArray(response.data) ? response.data.length : 0} trading pairs`);

        // Validate the response structure
        if (!Array.isArray(response.data)) {
          console.error("API Client: Unexpected response format for trading pairs:", response.data);
          throw new Error("Unexpected response format for trading pairs");
        }

        return response.data;
      } catch (error) {
        console.error(`API Client: Error fetching trading pairs for connection ${connectionId}:`, error);
        throw error;
      }
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

    // Trading data methods with retry logic
    sendTradingData: async (credentialsId: string, tradingPair: string | { symbol: string }, timeframe: string, maxRetries = 3): Promise<CandleDataResponse> => {
      // Always send tradingPair as a string symbol
      const tradingPairSymbol = typeof tradingPair === "string" ? tradingPair : tradingPair.symbol;
      // Create a cache key for this specific request to prevent duplicate in-flight requests
      const requestKey = `${credentialsId}:${tradingPairSymbol}:${timeframe}`;

      // Define a type for the extended API instance with the inflightRequests property
      interface ExtendedApi extends ReturnType<typeof axios.create> {
        _inflightRequests?: Map<string, Promise<CandleDataResponse>>;
      }

      // Ensure the static map exists but don't modify the global api object directly
      // This approach isolates the _inflightRequests to just this method
      const apiWithRequests = api as ExtendedApi;
      if (!apiWithRequests._inflightRequests) {
        apiWithRequests._inflightRequests = new Map<string, Promise<CandleDataResponse>>();
      }

      const inflightRequests = apiWithRequests._inflightRequests;

      // If there's already an identical request in flight, return that promise
      if (inflightRequests.has(requestKey)) {
        console.log(`Using in-flight request for ${requestKey}`);
        return inflightRequests.get(requestKey)!;
      }

      // Create a new request and track it
      let retries = 0;
      let backoffDelay = 1000; // Start with 1 second

      const requestPromise = (async () => {
        try {
          while (retries <= maxRetries) {
            try {
              const { data } = await api.post<CandleDataResponse>("/candles", {
                credentialsId,
                tradingPair: tradingPairSymbol, // ensure symbol only
                timeframe,
              });

              // Add precision info to the response if it's successful
              if (data.success && data.data && data.data.candles) {
                data.data.precision = getSymbolPrecision(tradingPairSymbol);
              }

              return data;
            } catch (error) {
              retries++;
              if (axios.isAxiosError(error)) {
                // If it's a rate limit error (429), retry with exponential backoff
                if (error.response?.status === 429) {
                  // If server provides a retry-after header, use that instead
                  const retryAfter = error.response.headers["retry-after"];
                  const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoffDelay;

                  console.log(`Rate limit exceeded (429). Retrying in ${waitTime}ms. Attempt ${retries} of ${maxRetries}`);

                  if (retries <= maxRetries) {
                    await sleep(waitTime);
                    backoffDelay *= 2; // Exponential backoff
                    continue;
                  }
                }

                // Handle other errors or if we've exhausted retries for rate limits
                const errorMsg = error.response?.data?.message || error.message || "An error occurred while fetching trading data";
                throw new Error(errorMsg);
              }

              // For non-Axios errors, just throw
              throw error;
            }
          }

          // Should never reach here due to throw in catch block
          throw new Error(`Failed to fetch trading data after ${maxRetries} attempts`);
        } finally {
          // Always clean up the in-flight request when done
          inflightRequests.delete(requestKey);
        }
      })();

      // Store the request
      inflightRequests.set(requestKey, requestPromise);

      return requestPromise;
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

    getCandles: (pair: string) => {
      // Implementation of getCandles method
    },

    // Trading positions
    getPositions: async () => {
      try {
        const { data } = await api.get<Position[]>("/broker/positions");
        return data;
      } catch (error) {
        console.error("Error fetching positions:", error);
        throw error;
      }
    },

    closePosition: async (tradeId: string) => {
      try {
        const { data } = await api.post(`/broker/positions/${tradeId}/close`);
        return data;
      } catch (error) {
        console.error("Error closing position:", error);
        throw error;
      }
    },
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
