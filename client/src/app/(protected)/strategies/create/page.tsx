"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { strategyService, StrategyRules } from "@/services/strategy";
import { StrategyForm } from "@/components/strategies/StrategyForm";

// Default strategy rules
const defaultRules: StrategyRules = {
  entry: {
    conditions: [{ condition: "price_above_ma", parameters: { period: 20 } }],
    operator: "AND",
  },
  exit: {
    conditions: [
      { condition: "take_profit", parameters: { percentage: 2 } },
      { condition: "stop_loss", parameters: { percentage: 1 } },
    ],
    operator: "AND",
  },
  indicators: {
    EMA: { period: 20 },
  },
  type: "trend-following",
  market_conditions: ["bullish", "bearish"],
};

// Default risk parameters
const defaultRiskParameters = {
  maxRiskPerTrade: 1, // Percentage of account
};

export default function CreateStrategyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (formData: {
    name: string;
    description: string;
    timeframes: string[];
    isActive: boolean;
    isPublic: boolean;
    rules?: StrategyRules;
    riskParameters?: Record<string, unknown>;
  }) => {
    try {
      setIsSubmitting(true);

      const strategy = await strategyService.createStrategy({
        name: formData.name,
        description: formData.description,
        timeframes: formData.timeframes,
        rules: formData.rules || defaultRules,
        riskParameters: formData.riskParameters || defaultRiskParameters,
        isPublic: formData.isPublic,
      });

      toast({
        title: "Strategy created",
        description: "Your strategy has been created successfully.",
      });

      router.push(`/strategies/${strategy.id}`);
    } catch (error) {
      console.error("Error creating strategy:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create strategy",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1200px] mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create AI Trading Strategy</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Define your trading strategy for automated execution</p>
          </div>
        </div>

        <StrategyForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitLabel="Create Strategy" />
      </div>
    </div>
  );
}
