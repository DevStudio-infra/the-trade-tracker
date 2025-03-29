"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Settings } from "lucide-react";
import { useIndicatorStore } from "./indicatorStore";
import { IndicatorParameters } from "../core/ChartTypes";
import { IndicatorParameterEditor } from "./IndicatorParameterEditor";

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

// Default parameters for each indicator type
const DEFAULT_PARAMETERS: Record<string, IndicatorParameters> = {
  SMA: { period: 14 },
  EMA: { period: 20 },
  RSI: { period: 14 },
  MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  BollingerBands: { period: 20, stdDev: 2 },
  ATR: { period: 14 },
  Stochastic: { kPeriod: 14, dPeriod: 3, overbought: 80, oversold: 20 },
};

interface AddIndicatorDialogProps {
  onIndicatorAdded: () => void;
}

const AddIndicatorDialog: React.FC<AddIndicatorDialogProps> = ({ onIndicatorAdded }) => {
  const [open, setOpen] = useState(false);
  const { createAndAddIndicator } = useIndicatorStore();

  const handleAddIndicator = (indicatorType: string) => {
    createAndAddIndicator(indicatorType, DEFAULT_PARAMETERS[indicatorType], AVAILABLE_INDICATORS[indicatorType as keyof typeof AVAILABLE_INDICATORS]);
    setOpen(false);
    onIndicatorAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Indicator
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Indicator</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(AVAILABLE_INDICATORS).map(([type, name]) => (
            <Button key={type} variant="outline" onClick={() => handleAddIndicator(type)}>
              {name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface EditIndicatorDialogProps {
  indicatorId: string;
  onClose: () => void;
  open: boolean;
}

const EditIndicatorDialog: React.FC<EditIndicatorDialogProps> = ({ indicatorId, onClose, open }) => {
  const { getIndicator, updateIndicator } = useIndicatorStore();
  const indicator = getIndicator(indicatorId);

  // Initialize with empty parameters, will be updated if indicator exists
  const [parameters, setParameters] = useState<IndicatorParameters>({});

  // Return null early if indicator doesn't exist
  if (!indicator) {
    return null;
  }

  // Get the configuration from the indicator
  const config = indicator.getConfig();

  // Update parameters from config (this won't trigger a re-render since it's outside useEffect)
  if (Object.keys(parameters).length === 0 && config.parameters) {
    setParameters(config.parameters);
  }

  const handleSave = () => {
    updateIndicator(indicatorId, parameters);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {config.name}</DialogTitle>
        </DialogHeader>
        <IndicatorParameterEditor parameters={parameters} onChange={setParameters} type={config.type} />
        <div className="flex justify-end mt-4">
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const IndicatorControls: React.FC = () => {
  const { getIndicators, removeIndicator, setIndicatorVisibility } = useIndicatorStore();
  const indicators = getIndicators();
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  const handleRemoveIndicator = (id: string) => {
    removeIndicator(id);
  };

  const handleToggleVisibility = (id: string) => {
    const indicator = getIndicators().find((ind) => ind.getId() === id);
    if (indicator) {
      setIndicatorVisibility(id, !indicator.isVisible());
    }
  };

  const handleIndicatorAdded = () => {
    // Force re-render
  };

  return (
    <div className="p-2 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Active Indicators</h3>
        <AddIndicatorDialog onIndicatorAdded={handleIndicatorAdded} />
      </div>

      {indicators.length > 0 ? (
        <div className="mt-2 space-y-1">
          {indicators.map((indicator) => {
            const config = indicator.getConfig();
            const isVisible = indicator.isVisible();

            return (
              <div
                key={indicator.getId()}
                className={`flex items-center justify-between p-2 rounded ${isVisible ? "bg-gray-100 dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900 opacity-50"}`}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: config.color || "#888" }} />
                  <span className="text-sm">{config.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleVisibility(indicator.getId())} className={`h-7 w-7 p-0 ${!isVisible ? "text-gray-400" : ""}`}>
                    <span className="sr-only">{isVisible ? "Hide" : "Show"}</span>
                    {isVisible ? "👁️" : "👁️‍🗨️"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Settings</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingIndicatorId(indicator.getId())}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRemoveIndicator(indicator.getId())} className="text-red-600 dark:text-red-400">
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center py-4">No indicators added</div>
      )}

      {editingIndicatorId && <EditIndicatorDialog indicatorId={editingIndicatorId} open={!!editingIndicatorId} onClose={() => setEditingIndicatorId(null)} />}
    </div>
  );
};
