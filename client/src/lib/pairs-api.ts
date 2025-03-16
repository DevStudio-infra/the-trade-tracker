/**
 * Trading Pairs API Client
 *
 * This module provides a dedicated client for working with trading pairs in the UI.
 * It handles caching, prefetching, and optimized loading of trading pairs data.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, TradingPair } from "./api";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

// Get the base URL from environment
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/v1";

// Cache durations
const CATEGORY_CACHE_TIME = 1000 * 60 * 60; // 1 hour
const PAIRS_CACHE_TIME = 1000 * 60 * 15; // 15 minutes
const SEARCH_CACHE_TIME = 1000 * 60 * 5; // 5 minutes

// Popular categories to prefetch
const POPULAR_CATEGORIES = ["FOREX", "CRYPTOCURRENCIES", "INDICES", "COMMODITIES"];

export interface ValidationResponse {
  success: boolean;
  message: string;
  error?: {
    message: string;
    code?: string;
  };
  estimatedTimeMs?: number;
}

/**
 * Custom hook for working with trading pairs
 */
export function usePairsApi() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  /**
   * Fetch all available categories
   */
  const useCategories = () => {
    return useQuery({
      queryKey: ["pairs-categories"],
      queryFn: api.getPairsCategories,
      staleTime: CATEGORY_CACHE_TIME,
    });
  };

  /**
   * Fetch pairs for a specific category
   */
  const usePairsByCategory = (category: string, enabled = true) => {
    return useQuery({
      queryKey: ["pairs-by-category", category],
      queryFn: () => api.getPairsByCategory(category),
      staleTime: PAIRS_CACHE_TIME,
      enabled,
    });
  };

  /**
   * Search for pairs with a query
   */
  const useSearchPairs = (query: string, enabled = true) => {
    return useQuery({
      queryKey: ["pairs-search", query],
      queryFn: () => (query.length < 2 ? Promise.resolve([]) : api.searchPairsDirect(query)),
      staleTime: SEARCH_CACHE_TIME,
      enabled: enabled && query.length >= 2,
    });
  };

  /**
   * Get a single pair by symbol
   */
  const usePairBySymbol = (symbol: string | null, category?: string) => {
    return useQuery({
      queryKey: ["pair", symbol],
      queryFn: async () => {
        if (!symbol) return null;

        // Try to find in cache first
        const pairsInCache = queryClient.getQueryData<TradingPair[]>(["pairs-by-category", category || "FOREX"]);
        const pairInCache = pairsInCache?.find((p) => p.symbol === symbol);
        if (pairInCache) return pairInCache;

        // If not in cache, search for it
        const results = await api.searchPairsDirect(symbol);
        const pair = results.find((p) => p.symbol === symbol);
        return pair || null;
      },
      staleTime: PAIRS_CACHE_TIME,
      enabled: !!symbol,
    });
  };

  /**
   * Prefetch popular categories to improve user experience
   */
  const prefetchPopularCategories = useCallback(async () => {
    // First fetch the list of available categories
    const categories = await queryClient.fetchQuery({
      queryKey: ["pairs-categories"],
      queryFn: api.getPairsCategories,
      staleTime: CATEGORY_CACHE_TIME,
    });

    // Then prefetch data for popular categories
    for (const category of POPULAR_CATEGORIES) {
      if (categories.includes(category)) {
        queryClient.prefetchQuery({
          queryKey: ["pairs-by-category", category],
          queryFn: () => api.getPairsByCategory(category),
          staleTime: PAIRS_CACHE_TIME,
        });
      }
    }
  }, [api, queryClient]);

  /**
   * Manually trigger a cache invalidation and refresh
   */
  const invalidatePairsCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pairs-categories"] });
    queryClient.invalidateQueries({ queryKey: ["pairs-by-category"] });
    queryClient.invalidateQueries({ queryKey: ["pairs-search"] });
  }, [queryClient]);

  /**
   * Triggers a manual validation of trading pairs against the Capital.com API
   * This is an admin-only endpoint
   */
  const triggerManualValidation = useCallback(async (): Promise<ValidationResponse> => {
    try {
      const token = await getToken();

      if (!token) {
        return {
          success: false,
          message: "Unauthorized",
          error: { message: "Authentication required" },
        };
      }

      const response = await fetch(`${BASE_URL}/pairs/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || "Validation initiated",
          estimatedTimeMs: data.estimatedTimeMs,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Validation error:", errorData);

        return {
          success: false,
          message: "Validation failed",
          error: {
            message: errorData.message || "Failed to validate pairs",
            code: errorData.code,
          },
        };
      }
    } catch (error) {
      console.error("Error triggering validation:", error);
      return {
        success: false,
        message: "Request failed",
        error: {
          message: error instanceof Error ? error.message : "Unknown error occurred",
        },
      };
    }
  }, [getToken]);

  return {
    useCategories,
    usePairsByCategory,
    useSearchPairs,
    usePairBySymbol,
    prefetchPopularCategories,
    invalidatePairsCache,
    triggerManualValidation,
  };
}
