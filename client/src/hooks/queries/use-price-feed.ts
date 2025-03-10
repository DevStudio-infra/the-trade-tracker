import { useQuery } from "@tanstack/react-query";
import { useWebSocketStore } from "@/stores/websocket-store";
import { useEffect } from "react";

export function usePriceFeed(pair: string) {
  const { subscribe, unsubscribe, prices } = useWebSocketStore();

  useEffect(() => {
    subscribe(pair);
    return () => unsubscribe(pair);
  }, [pair, subscribe, unsubscribe]);

  return useQuery({
    queryKey: ["price", pair],
    queryFn: async () => {
      // Initial price fetch from REST API
      const response = await fetch(`/api/v1/prices/${pair}`);
      if (!response.ok) {
        throw new Error("Failed to fetch price");
      }
      return response.json();
    },
    staleTime: 1000,
    refetchInterval: 1000,
    select: () => prices[pair],
  });
}
