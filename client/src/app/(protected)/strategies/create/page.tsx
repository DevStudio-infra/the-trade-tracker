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
      { condition: "take_profit", parameters: { rrr: 2 } },
      { condition: "stop_loss", parameters: { percentage: 1 } },
    ],
    operator: "AND",
  },
  indicators: {
    moving_average: 20, // Keep as a number to match the StrategyRules interface
  },
  type: "trend-following",
  market_conditions: ["bullish"],
};

// Default risk parameters
const defaultRiskParameters = {
  maxRiskPerTrade: 1, // Percentage of account
  riskRewardRatio: 2,
  trailingStopEnabled: false,
  trailingStopPercentage: 1,
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
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create Strategy</h1>
      </div>

      <StrategyForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitLabel="Create Strategy" />
    </div>
  );
}
