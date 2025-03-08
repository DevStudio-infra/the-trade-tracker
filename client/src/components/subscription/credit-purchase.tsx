"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import type { UserSubscriptionPlan } from "@/types";
import { creditConfig } from "@/config/credits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useCreditBalance } from "@/hooks/queries/use-credit-balance";

interface CreditPurchaseProps {
  userId: string;
  subscriptionPlan: UserSubscriptionPlan;
}

export function CreditPurchase({ userId, subscriptionPlan }: CreditPurchaseProps) {
  const [amount, setAmount] = useState<number>(creditConfig.minPurchaseAmount);
  const { toast } = useToast();
  const { refetch } = useCreditBalance();

  // Calculate credits based on amount and subscription status
  const pricePerCredit = subscriptionPlan.isPaid ? creditConfig.rates.pro : creditConfig.rates.free;
  const creditUnits = Math.floor(amount / pricePerCredit);

  const { mutate: purchaseCredits, isPending } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/credits/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          creditUnits,
          amount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to purchase credits");
      }

      return response.json();
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Purchase Credits</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Amount to Pay</span>
            <span className="font-mono font-medium">{amount.toFixed(2)}€</span>
          </div>
          <Slider
            value={[amount]}
            onValueChange={([value]) => setAmount(value)}
            min={creditConfig.minPurchaseAmount}
            max={creditConfig.maxPurchaseAmount}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Credits to Receive</span>
            <span className="font-mono">{creditUnits} credits</span>
          </div>
        </div>

        <div className="space-y-2 rounded-md bg-muted p-2">
          <div className="flex justify-between text-sm">
            <span>Plan Type</span>
            <span>{subscriptionPlan.isPaid ? "Pro Rate" : "Standard Rate"}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Price per Credit</span>
            <span className="font-mono">{pricePerCredit.toFixed(3)}€</span>
          </div>
          {subscriptionPlan.isPaid && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Pro Discount Applied</span>
              <span>✓</span>
            </div>
          )}
        </div>

        <Button className="w-full" onClick={() => purchaseCredits()} disabled={isPending}>
          {isPending && (
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          Pay {amount.toFixed(2)}€ for {creditUnits} Credits
        </Button>
      </CardContent>
    </Card>
  );
}
