"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Lightbulb, Zap, TrendingUp, ArrowRightLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const strategies = [
  {
    id: "trend-following",
    name: "Trend Following",
    description: "Follows market momentum using moving averages and trend indicators.",
    performance: "+12.5%",
    signals: 245,
    winRate: "68%",
    icon: TrendingUp,
    gradient: "from-blue-500/5 to-blue-600/10",
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    description: "Capitalizes on price deviations from historical averages.",
    performance: "+8.2%",
    signals: 186,
    winRate: "64%",
    icon: ArrowRightLeft,
    gradient: "from-blue-400/5 to-blue-500/10",
  },
  {
    id: "breakout",
    name: "Breakout Trading",
    description: "Identifies and trades significant price level breakouts.",
    performance: "+15.8%",
    signals: 156,
    winRate: "72%",
    icon: Zap,
    gradient: "from-blue-500/5 to-blue-400/10",
  },
];

export default function StrategiesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Subtle blue gradient background */}
      <div className="fixed inset-0 dark:bg-gradient-to-br dark:from-[#050E1A] dark:via-black dark:to-black light:bg-gradient-to-br light:from-slate-100 light:to-white pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Strategies</h1>
            <p className="text-muted-foreground mt-1">Create and manage your automated trading strategies</p>
          </div>
          <Button size="lg" className="shrink-0">
            <Lightbulb className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search strategies..." />
          </div>
        </div>

        {/* Strategy cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <Card key={strategy.id} className="relative overflow-hidden backdrop-blur-sm">
                {/* Gradient background */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", strategy.gradient, "dark:opacity-40")} />

                {/* Content */}
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="font-medium text-sm">
                      {strategy.performance}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{strategy.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{strategy.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Signals Generated</div>
                      <div className="text-2xl font-semibold">{strategy.signals}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                      <div className="text-2xl font-semibold">{strategy.winRate}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button className="flex-1">View Details</Button>
                    <Button variant="outline" className="flex-1">
                      Backtest
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
