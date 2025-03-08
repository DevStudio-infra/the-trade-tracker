"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { CreditBalance } from "@/components/subscription/credit-balance";
import { PaymentHistory } from "@/components/subscription/payment-history";
import { CreditPurchase } from "@/components/subscription/credit-purchase";
import { useUser } from "@clerk/nextjs";

const plans = [
  {
    name: "Free",
    price: "€0",
    credits: 6,
    features: ["6 AI Credits Monthly", "Basic Signal Detection", "Standard Support", "1 Connected Broker", "Basic Analytics"],
    extraCreditPrice: "€0.22",
  },
  {
    name: "Pro",
    price: "€19.99",
    credits: 100,
    popular: true,
    features: ["100 AI Credits Monthly", "Advanced Signal Detection", "Priority Support", "Multiple Connected Brokers", "Advanced Analytics", "Custom Strategies", "API Access"],
    extraCreditPrice: "€0.11",
  },
];

export default function SubscriptionPage() {
  const { user } = useUser();
  const [subscriptionPlan] = useState({
    isPaid: false, // This should come from your backend
    isCanceled: false,
    stripeCustomerId: undefined,
    stripeSubscriptionId: undefined,
    stripePriceId: undefined,
    stripeCurrentPeriodEnd: undefined,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 dark:bg-gradient-to-br dark:from-[#050E1A] dark:via-black dark:to-black light:bg-gradient-to-br light:from-slate-100 light:to-white pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and AI credits</p>
        </div>

        {/* Credit Balance and Purchase */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CreditBalance />
          </div>
          <div className="lg:col-span-1">
            <CreditPurchase userId={user?.id || ""} subscriptionPlan={subscriptionPlan} />
          </div>
        </div>

        {/* Payment History */}
        <PaymentHistory />

        {/* Pricing Plans */}
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-2 mt-8">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative overflow-hidden backdrop-blur-sm ${plan.popular ? "border-primary" : "border-border/50"}`}>
              {plan.popular && <div className="absolute top-0 right-0 bg-primary px-3 py-1 text-sm font-medium text-primary-foreground rounded-bl-lg">Popular</div>}
              <div className="p-6">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline text-3xl font-bold">
                  {plan.price}
                  <span className="ml-1 text-base font-medium text-muted-foreground">/month</span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-primary mr-2" />
                    <span className="font-medium">{plan.credits} AI Credits Monthly</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Extra credits at {plan.extraCreditPrice}/credit</p>
                </div>

                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex">
                      <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full mt-8" variant={plan.popular ? "default" : "outline"}>
                  {plan.name === "Free" ? "Current Plan" : "Upgrade to Pro"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
