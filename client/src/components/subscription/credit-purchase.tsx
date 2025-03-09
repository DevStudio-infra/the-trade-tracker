"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { UserSubscriptionPlan } from "@/types";
import { creditConfig } from "@/config/credits";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useCreditBalance } from "@/hooks/queries/use-credit-balance";

interface CreditPurchaseProps {
  userId: string;
  subscriptionPlan: UserSubscriptionPlan;
}

export function CreditPurchase({ userId, subscriptionPlan }: CreditPurchaseProps) {
  const [creditAmount, setCreditAmount] = useState("100");
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { refetch } = useCreditBalance();

  // Calculate credits based on amount and subscription status
  const pricePerCredit = subscriptionPlan.isPaid ? creditConfig.rates.pro : creditConfig.rates.free;
  const totalPrice = Number(creditAmount) * pricePerCredit;

  const { mutate: purchaseCredits } = useMutation({
    mutationFn: async () => {
      setIsPending(true);
      try {
        const response = await fetch(`/api/v1/credits/purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            creditUnits: Number(creditAmount),
            amount: totalPrice,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to purchase credits");
        }

        return response.json();
      } finally {
        setIsPending(false);
      }
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.url;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initiate credit purchase. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      refetch();
    },
  });

  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Purchase Credits</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Buy additional AI credits</p>
          </div>
          <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-white mb-1.5 block">Amount of Credits</label>
            <Input
              type="number"
              min="10"
              step="10"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Price per credit:</span>
            <span className="font-medium text-slate-900 dark:text-white">€{pricePerCredit.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between font-medium">
            <span className="text-slate-900 dark:text-white">Total Price:</span>
            <span className="text-lg text-blue-500 dark:text-blue-400">€{totalPrice.toFixed(2)}</span>
          </div>

          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            disabled={!userId || Number(creditAmount) < 10 || isPending}
            onClick={() => purchaseCredits()}>
            {isPending ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              "Purchase Credits"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
