"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

interface TradingChartProps {
  pair: string;
}

export function TradingChart({ pair }: TradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chart</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{pair}</p>
        </div>
        <div className="flex gap-2">
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe}
              variant="ghost"
              size="sm"
              className={cn(
                "font-medium",
                selectedTimeframe === timeframe
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              onClick={() => setSelectedTimeframe(timeframe)}>
              {timeframe}
            </Button>
          ))}
        </div>
      </div>
      <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Chart placeholder</div>
      </div>
    </div>
  );
}
