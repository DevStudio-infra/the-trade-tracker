import { useQuery } from "@tanstack/react-query";
import { useAITradingApi } from "@/lib/ai-trading-api";

export function useActiveTradingBots() {
  const aiTradingApi = useAITradingApi();

  return useQuery({
    queryKey: ["all-trading-bots"],
    queryFn: async () => {
      // Fetch all bot instances from the API
      const bots = await aiTradingApi.getBotInstances();
      // Only return active bots (isActive === true), if needed
      return bots.filter((bot: any) => bot.isActive);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Only fetch on mount if cache is stale
    refetchOnWindowFocus: false, // Do not refetch on window focus
  });
}
