"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeframes } from "./utils/chartTypes";

interface TimeframeSelectorProps {
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  disabled?: boolean;
}

/**
 * Component for selecting chart timeframes
 */
export function TimeframeSelector({ selectedTimeframe, onTimeframeChange, disabled = false }: TimeframeSelectorProps) {
  return (
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
          onClick={() => onTimeframeChange(timeframe)}
          disabled={disabled}>
          {timeframe}
        </Button>
      ))}
    </div>
  );
}
