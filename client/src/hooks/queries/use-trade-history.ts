import { useInfiniteQuery } from "@tanstack/react-query";
import { type Position } from "@/stores/trading-store";

interface TradeHistoryResponse {
  trades: Position[];
  nextCursor?: string;
  hasMore: boolean;
}

export function useTradeHistory(pageSize: number = 20) {
  return useInfiniteQuery<TradeHistoryResponse>({
    queryKey: ["trades", "history"],
    queryFn: async ({ pageParam = "" }) => {
      const response = await fetch(`/api/v1/trades/history?cursor=${pageParam}&limit=${pageSize}`);
      if (!response.ok) {
        throw new Error("Failed to fetch trade history");
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: "",
    staleTime: 60 * 1000, // 1 minute
    gcTime: 30 * 60 * 1000, // 30 minutes
    select: (data) => ({
      trades: data.pages.flatMap((page) => page.trades),
      hasNextPage: data.pages[data.pages.length - 1].hasMore,
    }),
  });
}
