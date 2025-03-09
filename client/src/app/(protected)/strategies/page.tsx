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
    gradient: "from-blue-500/5 to-blue-500/10",
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    description: "Capitalizes on price deviations from historical averages.",
    performance: "+8.2%",
    signals: 186,
    winRate: "64%",
    icon: ArrowRightLeft,
    gradient: "from-blue-600/5 to-blue-600/10",
  },
  {
    id: "breakout",
    name: "Breakout Trading",
    description: "Identifies and trades significant price level breakouts.",
    performance: "+15.8%",
    signals: 156,
    winRate: "72%",
    icon: Zap,
    gradient: "from-blue-700/5 to-blue-700/10",
  },
];

export default function StrategiesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Trading Strategies</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage your automated trading strategies</p>
          </div>
          <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
            <Lightbulb className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <Input
              className="pl-9 bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              placeholder="Search strategies..."
            />
          </div>
        </div>

        {/* Strategy cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <Card key={strategy.id} className="relative overflow-hidden backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                {/* Gradient background */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 dark:opacity-40", strategy.gradient)} />

                {/* Content */}
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                    </div>
                    <Badge variant="outline" className="font-medium text-sm border-slate-200 dark:border-slate-800 text-blue-500 dark:text-blue-400">
                      {strategy.performance}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{strategy.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{strategy.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Signals Generated</div>
                      <div className="text-2xl font-semibold text-slate-900 dark:text-white">{strategy.signals}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Win Rate</div>
                      <div className="text-2xl font-semibold text-blue-500 dark:text-blue-400">{strategy.winRate}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700">View Details</Button>
                    <Button variant="outline" className="flex-1 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
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
