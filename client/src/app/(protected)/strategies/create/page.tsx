"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { strategyService, CreateStrategyDto, StrategyRules } from "@/services/strategy";
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
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (formData: { name: string; description: string; timeframes: string[]; isActive: boolean }) => {
    // Clear any previous errors
    setError(null);

    // Create strategy data with default rules and risk parameters
    const strategyData: CreateStrategyDto = {
      name: formData.name,
      description: formData.description,
      timeframes: formData.timeframes,
      rules: defaultRules,
      riskParameters: defaultRiskParameters,
    };

    try {
      setLoading(true);
      console.log("Creating strategy with data:", JSON.stringify(strategyData, null, 2));

      const strategy = await strategyService.createStrategy(strategyData);

      console.log("Strategy created successfully:", strategy);

      toast({
        title: "Success",
        description: "Strategy created successfully!",
      });

      router.push(`/strategies/${strategy.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while creating strategy";

      console.error("Error creating strategy:", error);
      console.error("Strategy data that failed:", strategyData);

      setError(errorMessage);

      toast({
        title: "Error",
        description: "Failed to create strategy. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1200px] mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push("/strategies")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create Trading Strategy</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Define your automated trading strategy parameters</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Error creating strategy</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">Please check your network connection and try again. If the problem persists, contact support.</p>
            </div>
          </div>
        )}

        <StrategyForm
          initialData={{ rules: defaultRules, riskParameters: defaultRiskParameters }}
          onSubmit={handleSubmit}
          isSubmitting={loading}
          submitLabel="Create Strategy"
          isEditMode={false}
        />
      </div>
    </div>
  );
}
