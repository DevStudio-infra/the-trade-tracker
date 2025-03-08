import { useQuery } from "@tanstack/react-query";
import { type Signal } from "@/stores/signals-store";
import { useWebSocketStore } from "@/stores/websocket-store";

interface SignalFeedResponse {
  signals: Signal[];
  timestamp: number;
}

export function useSignalFeed(pair?: string) {
  const { subscribe, unsubscribe } = useWebSocketStore();

  return useQuery<SignalFeedResponse>({
    queryKey: ["signals", "feed", pair],
    queryFn: async () => {
      const url = pair ? `/api/v1/signals/feed?pair=${pair}` : "/api/v1/signals/feed";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch signals");
      }
      return response.json();
    },
    enabled: true,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 15 * 1000,
    retry: 3,
    onSettled: () => {
      if (pair) {
        // Subscribe to pair-specific signal updates
        subscribe(pair);
      }
    },
    onError: () => {
      if (pair) {
        unsubscribe(pair);
      }
    },
  });
}
