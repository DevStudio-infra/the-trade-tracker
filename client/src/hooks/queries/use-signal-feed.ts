import { useQuery } from "@tanstack/react-query";
import { type Signal } from "@/stores/signals-store";
import { useWebSocketStore } from "@/stores/websocket-store";
import { useEffect } from "react";

interface SignalFeedResponse {
  signals: Signal[];
  timestamp: number;
}

export function useSignalFeed(pair?: string) {
  const { subscribe, unsubscribe } = useWebSocketStore();

  useEffect(() => {
    if (pair) {
      subscribe(pair);
      return () => unsubscribe(pair);
    }
  }, [pair, subscribe, unsubscribe]);

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
  });
}
