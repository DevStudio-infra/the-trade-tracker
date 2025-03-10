"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AxiosError } from "axios";
import React from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: 30 * 1000, // Data becomes stale after 30 seconds
      gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        if (error instanceof AxiosError) {
          if (error.response?.status === 404 || error.response?.status === 401) {
            return false;
          }
        }
        return failureCount < 3;
      },
      // Trading specific defaults
      queries: {
        price: {
          // Price data updates frequently
          staleTime: 1000, // 1 second
          refetchInterval: 1000, // Poll every second as WebSocket backup
        },
        trades: {
          // Trade history doesn't need frequent updates
          staleTime: 60 * 1000, // 1 minute
          gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
        },
        signals: {
          // Signal data is moderately dynamic
          staleTime: 15 * 1000, // 15 seconds
          refetchInterval: 15 * 1000,
        },
        credits: {
          // Credit balance needs moderate freshness
          staleTime: 30 * 1000, // 30 seconds
        },
      },
    },
    mutations: {
      // Global mutation defaults
      retry: 2,
      onError: (error) => {
        console.error("Mutation error:", error);
        // You can add global error handling here
      },
    },
  },
});

// Add global cache update handlers
queryClient.setMutationDefaults(["trade"], {
  onSuccess: () => {
    // Invalidate relevant queries after trade execution
    queryClient.invalidateQueries({ queryKey: ["positions"] });
    queryClient.invalidateQueries({ queryKey: ["credits"] });
  },
});

queryClient.setMutationDefaults(["credits"], {
  onSuccess: () => {
    // Invalidate credits-related queries
    queryClient.invalidateQueries({ queryKey: ["credits"] });
  },
});

type QueryProviderProps = {
  children: React.ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
