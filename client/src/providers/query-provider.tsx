"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AxiosError } from "axios";
import React from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
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
      // Default staleTime for most queries
      staleTime: 30 * 1000,
      // Price specific settings will be set in the useQuery hook
      // Signal specific settings will be set in the useQuery hook
      // Trade specific settings will be set in the useQuery hook
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
