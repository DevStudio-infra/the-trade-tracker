import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/stores/user-store";
import type { Credits } from "@/stores/user-store";

interface PurchaseCreditsRequest {
  amount: number;
  paymentMethod: string;
}

export function useCreditBalance() {
  const queryClient = useQueryClient();
  const { updateCredits } = useUserStore();

  const query = useQuery<Credits>({
    queryKey: ["credits", "balance"],
    queryFn: async () => {
      const response = await fetch("/api/v1/credits/balance");
      if (!response.ok) {
        throw new Error("Failed to fetch credit balance");
      }
      const data = await response.json();
      updateCredits(data); // Sync with Zustand store
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (query) => {
      // Fix: react-query's query object does not have a 'state' property here
      // Instead, use query?.data?.available
      const credits = (query && (query as any).data && typeof (query as any).data.available === "number")
        ? (query as any).data.available
        : Infinity;
      return credits < 10 ? 10 * 1000 : 30 * 1000;
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (request: PurchaseCreditsRequest) => {
      const response = await fetch("/api/v1/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw new Error("Failed to purchase credits");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update cache and Zustand store
      queryClient.setQueryData(["credits", "balance"], data);
      updateCredits(data);
    },
  });

  return {
    ...query,
    purchaseCredits: purchaseMutation.mutate,
    isPurchasing: purchaseMutation.isPending,
  };
}
