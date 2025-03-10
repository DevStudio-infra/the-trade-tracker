"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface OnboardingPreferencesProps {
  data: {
    experience: string;
    tradingStyle: string;
    riskTolerance: string;
    preferredMarkets: string[];
    broker: any;
  };
  onChange: (data: Partial<OnboardingPreferencesProps["data"]>) => void;
  onNext: () => void;
  onBack: () => void;
}

const riskTolerances = [
  {
    id: "conservative",
    title: "Conservative",
    description: "Focus on capital preservation with lower risk trades",
    riskRange: "1-2% per trade",
  },
  {
    id: "moderate",
    title: "Moderate",
    description: "Balanced approach with medium risk exposure",
    riskRange: "2-3% per trade",
  },
  {
    id: "aggressive",
    title: "Aggressive",
    description: "Higher risk tolerance for potentially larger returns",
    riskRange: "3-4% per trade",
  },
];

const markets = [
  {
    id: "forex",
    title: "Forex",
    description: "Currency pairs trading",
  },
  {
    id: "stocks",
    title: "Stocks",
    description: "Equities and ETFs",
  },
  {
    id: "crypto",
    title: "Crypto",
    description: "Cryptocurrency trading",
  },
  {
    id: "commodities",
    title: "Commodities",
    description: "Gold, silver, oil, etc.",
  },
];

export function OnboardingPreferences({ data, onChange, onNext, onBack }: OnboardingPreferencesProps) {
  const toggleMarket = (marketId: string) => {
    const currentMarkets = data.preferredMarkets || [];
    const newMarkets = currentMarkets.includes(marketId) ? currentMarkets.filter((id) => id !== marketId) : [...currentMarkets, marketId];
    onChange({ preferredMarkets: newMarkets });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Trading Preferences</h2>
        <p className="text-muted-foreground">Customize your trading experience by setting your preferences.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Risk Tolerance</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {riskTolerances.map((risk) => (
              <Card
                key={risk.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${data.riskTolerance === risk.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => onChange({ riskTolerance: risk.id })}>
                <h4 className="font-medium">{risk.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>
                <div className="mt-2 text-xs font-medium text-primary">{risk.riskRange}</div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Preferred Markets</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {markets.map((market) => (
              <Card
                key={market.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${data.preferredMarkets?.includes(market.id) ? "border-primary bg-primary/5" : ""}`}
                onClick={() => toggleMarket(market.id)}>
                <h4 className="font-medium">{market.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{market.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!data.riskTolerance || !data.preferredMarkets?.length}>
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
