"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IndicatorType } from "./core/ChartTypes";
import { BarChart4 } from "lucide-react";

interface ChartHeaderProps {
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  openIndicatorDialog?: (type: IndicatorType) => void;
  activeIndicators?: { id: string; name: string; type: IndicatorType }[];
  onRemoveIndicator?: (id: string) => void;
}

/**
 * Component that displays the chart header with trading pair info and controls
 */
export function ChartHeader({ selectedTimeframe, onTimeframeChange, openIndicatorDialog, activeIndicators = [], onRemoveIndicator }: ChartHeaderProps) {
  // All available timeframes
  const timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"];

  // Indicator dropdown state
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle indicator selection
  const handleSelectIndicator = (type: string) => {
    console.log("ChartHeader - Selecting indicator type:", type);
    if (openIndicatorDialog) {
      openIndicatorDialog(type as IndicatorType);
    }
    setIndicatorMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIndicatorMenuOpen(false);
      }
    };

    if (indicatorMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [indicatorMenuOpen]);

  return (
    <div className="flex items-center justify-between p-2 border-b border-border bg-card">
      {/* Left side: Timeframe selector */}
      <div className="flex space-x-1">
        {timeframes.map((tf) => (
          <Button key={tf} variant={selectedTimeframe === tf ? "default" : "outline"} size="sm" onClick={() => onTimeframeChange(tf)} className="text-xs px-2 py-1 h-7">
            {tf}
          </Button>
        ))}
      </div>

      {/* Right side: Indicators */}
      <div className="flex items-center space-x-2">
        {/* Indicators dropdown */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-3 py-1 h-8 flex items-center"
            onClick={() => {
              console.log("Indicator button clicked in ChartHeader");
              setIndicatorMenuOpen(!indicatorMenuOpen);
            }}>
            <BarChart4 className="h-3.5 w-3.5 mr-1" />
            Indicators
          </Button>

          {indicatorMenuOpen && (
            <div className="absolute right-0 mt-1 w-52 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1 max-h-80 overflow-auto">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Moving Averages</div>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("SMA")}>
                  Simple Moving Average (SMA)
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("EMA")}>
                  Exponential Moving Average (EMA)
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Oscillators</div>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("RSI")}>
                  Relative Strength Index (RSI)
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("MACD")}>
                  MACD
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("Stochastic")}>
                  Stochastic Oscillator
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Bands & Channels</div>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("BollingerBands")}>
                  Bollinger Bands
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Others</div>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("ATR")}>
                  Average True Range (ATR)
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectIndicator("Ichimoku")}>
                  Ichimoku Cloud
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active indicators badges */}
        {activeIndicators.length > 0 && (
          <div className="flex space-x-1">
            {activeIndicators.map((indicator) => (
              <div key={indicator.id} className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-md flex items-center">
                <span>{indicator.name}</span>
                {onRemoveIndicator && (
                  <button onClick={() => onRemoveIndicator(indicator.id)} className="ml-1.5 text-muted-foreground hover:text-destructive">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
