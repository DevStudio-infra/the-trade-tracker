"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { CreditBalance } from "@/components/subscription/credit-balance";
import { PaymentHistory } from "@/components/subscription/payment-history";
import { CreditPurchase } from "@/components/subscription/credit-purchase";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "€0",
    credits: 6,
    features: ["6 AI Credits Monthly", "Basic Signal Detection", "Standard Support", "1 Connected Broker", "Basic Analytics"],
    extraCreditPrice: "€0.22",
    gradient: "from-blue-500/5 to-blue-500/10",
  },
  {
    name: "Pro",
    price: "€19.99",
    credits: 100,
    popular: true,
    features: ["100 AI Credits Monthly", "Advanced Signal Detection", "Priority Support", "Multiple Connected Brokers", "Advanced Analytics", "Custom Strategies", "API Access"],
    extraCreditPrice: "€0.11",
    gradient: "from-blue-600/5 to-blue-600/10",
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
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Subscription</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your subscription and AI credits</p>
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
            <Card
              key={plan.name}
              className={cn(
                "relative overflow-hidden backdrop-blur-sm bg-white/40 dark:bg-slate-900/40",
                plan.popular ? "border-blue-500 dark:border-blue-400" : "border-slate-200 dark:border-slate-800"
              )}>
              {/* Gradient background */}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 dark:opacity-40", plan.gradient)} />

              {plan.popular && <div className="absolute top-0 right-0 bg-blue-500 dark:bg-blue-600 px-3 py-1 text-sm font-medium text-white rounded-bl-lg">Popular</div>}

              <div className="relative p-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="ml-1 text-base font-medium text-slate-500 dark:text-slate-400">/month</span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                    <span className="font-medium text-slate-900 dark:text-white">{plan.credits} AI Credits Monthly</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Extra credits at {plan.extraCreditPrice}/credit</p>
                </div>

                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex">
                      <Check className="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0 mr-2" />
                      <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "w-full mt-8",
                    plan.popular
                      ? "bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                      : "border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  variant={plan.popular ? "default" : "outline"}>
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
