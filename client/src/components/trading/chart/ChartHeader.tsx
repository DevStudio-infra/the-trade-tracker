"use client";

import { TimeframeSelector } from "./TimeframeSelector";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BarChart4, ChevronDown } from "lucide-react";
import { IndicatorType } from "./utils/chartTypes";

interface ChartHeaderProps {
  pair: string | null;
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onAddIndicator: (type: IndicatorType) => void;
  isLoading: boolean;
  indicatorCount: number;
}

/**
 * Component that displays the chart header with trading pair info and controls
 */
export function ChartHeader({ pair, selectedTimeframe, onTimeframeChange, onAddIndicator, isLoading, indicatorCount }: ChartHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chart</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{pair}</p>
      </div>
      <div className="flex gap-2 items-center">
        {/* Indicators Management Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1 font-medium" disabled={isLoading}>
              <BarChart4 className="h-4 w-4" />
              <span>Indicators {indicatorCount > 0 && `(${indicatorCount})`}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onAddIndicator("sma")}>Simple Moving Average (SMA)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddIndicator("ema")}>Exponential Moving Average (EMA)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddIndicator("rsi")}>Relative Strength Index (RSI)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddIndicator("macd")}>MACD</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddIndicator("bollinger")}>Bollinger Bands</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAddIndicator("stochastic")}>Stochastic Oscillator</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddIndicator("atr")}>Average True Range (ATR)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddIndicator("ichimoku")}>Ichimoku Cloud</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddIndicator("fibonacci")}>Fibonacci Retracement</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Timeframe selection */}
        <TimeframeSelector selectedTimeframe={selectedTimeframe} onTimeframeChange={onTimeframeChange} disabled={isLoading} />
      </div>
    </div>
  );
}
