"use client";

import React, { useState, forwardRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Settings } from "lucide-react";
import { useIndicatorStore } from "./indicatorStore";

const OSCILLATOR_INDICATORS = ["RSI", "MACD", "ATR", "Stochastic"];

// Map of indicator types to display names
const AVAILABLE_INDICATORS = {
  SMA: "Simple Moving Average",
  EMA: "Exponential Moving Average",
  RSI: "Relative Strength Index",
  MACD: "Moving Average Convergence Divergence",
  BollingerBands: "Bollinger Bands",
  ATR: "Average True Range",
  Stochastic: "Stochastic Oscillator",
};

// Add these components before the IndicatorControls component
const AddIndicatorButton = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>((props, ref) => (
  <Button ref={ref} variant="outline" size="sm" className="h-8" {...props}>
    <Plus className="h-4 w-4 mr-1" />
    Add Indicator
  </Button>
));
AddIndicatorButton.displayName = "AddIndicatorButton";

const SettingsButton = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>((props, ref) => (
  <Button ref={ref} variant="ghost" size="sm" className="h-7 w-7 p-0" {...props}>
    <Settings className="h-4 w-4" />
    <span className="sr-only">Settings</span>
  </Button>
));
SettingsButton.displayName = "SettingsButton";

export const IndicatorControls: React.FC = React.memo(() => {
  const { getIndicators, removeIndicator, setIndicatorVisibility } = useIndicatorStore();
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  // Get indicators once and memoize the result
  const indicators = useMemo(() => getIndicators(), [getIndicators]);

  // Memoize the indicators data
  const indicatorsData = useMemo(() => {
    return indicators.map((ind) => ({
      id: ind.getId(),
      type: ind.getType(),
      name: ind.getName(),
      isOscillator: OSCILLATOR_INDICATORS.includes(ind.getType()),
      config: ind.getConfig(),
      isVisible: ind.isVisible(),
    }));
  }, [indicators]);

  // Memoize the active oscillator check
  const activeOscillator = useMemo(() => {
    return indicators.find((indicator) => OSCILLATOR_INDICATORS.includes(indicator.getType()));
  }, [indicators]);

  // Memoize handlers
  const handleRemoveIndicator = useCallback(
    (id: string) => {
      removeIndicator(id);
    },
    [removeIndicator]
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const indicator = indicators.find((ind) => ind.getId() === id);
      if (indicator) {
        setIndicatorVisibility(id, !indicator.isVisible());
      }
    },
    [indicators, setIndicatorVisibility]
  );

  const handleAddIndicator = useCallback((type: string) => {
    try {
      useIndicatorStore.getState().createAndAddIndicator(type);
    } catch (error) {
      console.error(`Error adding indicator ${type}:`, error);
    }
  }, []);

  // Memoize the available indicators list
  const availableIndicatorsList = useMemo(() => {
    return Object.entries(AVAILABLE_INDICATORS).map(([type, name]) => {
      const isOscillator = OSCILLATOR_INDICATORS.includes(type);
      const isDisabled = isOscillator && activeOscillator !== undefined;
      return { type, name, isOscillator, isDisabled };
    });
  }, [activeOscillator]);

  return (
    <div className="p-2 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Active Indicators</h3>
        <Dialog>
          <DialogTrigger asChild>
            <AddIndicatorButton />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Indicator</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2">
              {availableIndicatorsList.map(({ type, name, isDisabled }) => (
                <Button
                  key={type}
                  variant="outline"
                  className={`justify-start ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={isDisabled}
                  onClick={() => handleAddIndicator(type)}>
                  {name}
                  {isDisabled && activeOscillator && <span className="ml-2 text-xs text-muted-foreground">(Remove {activeOscillator.getName()} first)</span>}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-2 space-y-1">
        {indicatorsData.map(({ id, name, config, isVisible }) => (
          <div key={id} className={`flex items-center justify-between p-2 rounded ${isVisible ? "bg-gray-100 dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900 opacity-50"}`}>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: config.color || "#888" }} />
              <span className="text-sm">{name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" onClick={() => handleToggleVisibility(id)} className={`h-7 w-7 p-0 ${!isVisible ? "text-gray-400" : ""}`}>
                <span className="sr-only">{isVisible ? "Hide" : "Show"}</span>
                {isVisible ? "👁️" : "👁️‍🗨️"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SettingsButton />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingIndicatorId(id)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRemoveIndicator(id)} className="text-red-600 dark:text-red-400">
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {editingIndicatorId && (
        <Dialog open={true} onOpenChange={() => setEditingIndicatorId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Indicator</DialogTitle>
            </DialogHeader>
            {/* Add your indicator editing form here */}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

IndicatorControls.displayName = "IndicatorControls";
