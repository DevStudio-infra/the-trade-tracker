import { useQuery } from "@tanstack/react-query";
import { useWebSocketStore } from "@/stores/websocket-store";

export function usePriceFeed(pair: string) {
  const { subscribe, unsubscribe, prices } = useWebSocketStore();

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
    onSuccess: () => {
      // Subscribe to WebSocket updates
      subscribe(pair);
    },
    select: () => prices[pair], // Use WebSocket data from store
    onError: (error) => {
      console.error("Price feed error:", error);
      unsubscribe(pair);
    },
  });
}
