"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IndicatorType, IndicatorParameters, indicatorDefaults } from "../core/ChartTypes";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { XIcon, Info, ArrowRightIcon, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface IndicatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIndicatorType: IndicatorType | null;
  onAddIndicator: (name: string, type: IndicatorType, parameters: IndicatorParameters) => void;
}

// Add proper type definitions for the NumberInput component
interface NumberInputProps {
  id: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

// Add new component for number input with increment/decrement
function NumberInput({ id, value, onChange, min, max, step = 1, className = "" }: NumberInputProps) {
  const increment = () => {
    const currentValue = Number(value) || 0;
    if (max !== undefined && currentValue >= max) return;
    const newValue = currentValue + (step || 1);
    onChange(newValue.toString());
  };

  const decrement = () => {
    const currentValue = Number(value) || 0;
    if (min !== undefined && currentValue <= min) return;
    const newValue = currentValue - (step || 1);
    onChange(newValue.toString());
  };

  return (
    <div className="relative w-full">
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pr-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${className}`}
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
        <button
          type="button"
          onClick={increment}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white focus:outline-none"
          aria-label="Increase value">
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={decrement}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white focus:outline-none"
          aria-label="Decrease value">
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Parameter Configuration Dialog for indicators
 * This dialog allows configuring parameters after an indicator type has been selected
 */
export function IndicatorDialog({ open, onOpenChange, selectedIndicatorType, onAddIndicator }: IndicatorDialogProps) {
  // Track dialog container ref
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Enhanced logging to debug dialog open state
  useEffect(() => {
    console.log("IndicatorDialog rendered with props:", {
      open,
      selectedIndicatorType,
      timestamp: new Date().toISOString(),
    });
  }, [open, selectedIndicatorType]);

  // Set mounted state for client-side rendering
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Focus the first input when dialog opens
  useEffect(() => {
    if (open && mounted) {
      // Focus the first parameter input instead of name
      const firstInput = document.querySelector<HTMLInputElement>(".parameter-input");
      if (firstInput) {
        setTimeout(() => {
          firstInput.focus();
        }, 50);
      }
    }
  }, [open, mounted]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scrolling when dialog is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  // For ESC key to close
  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [open, onOpenChange]);

  // State for indicator parameters
  const [indicatorParams, setIndicatorParams] = useState<IndicatorParameters>({});
  const [selectedColor, setSelectedColor] = useState("#4CAF50");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Reset and initialize parameters when the selected indicator type changes
  useEffect(() => {
    if (selectedIndicatorType) {
      console.log("Setting defaults for indicator type:", selectedIndicatorType);
      const defaults = indicatorDefaults[selectedIndicatorType];
      setIndicatorParams({ ...defaults.defaultParameters });
      setSelectedColor(String(defaults.defaultParameters.color || "#4CAF50"));
    } else {
      // Reset when dialog closes
      setIndicatorParams({});
      setSelectedColor("#4CAF50");
    }
  }, [selectedIndicatorType]);

  // Function to generate indicator name based on type and parameters
  const generateIndicatorName = (): string => {
    if (!selectedIndicatorType) return "";

    switch (selectedIndicatorType) {
      case "SMA":
        return `SMA ${indicatorParams.period || ""}`;
      case "EMA":
        return `EMA ${indicatorParams.period || ""}`;
      case "RSI":
        return `RSI ${indicatorParams.period || ""}`;
      case "MACD":
        return `MACD ${indicatorParams.fastPeriod || ""}, ${indicatorParams.slowPeriod || ""}, ${indicatorParams.signalPeriod || ""}`;
      case "BollingerBands":
        return `BB ${indicatorParams.period || ""}, ${indicatorParams.stdDev || ""}`;
      case "Stochastic":
        return `STOCH ${indicatorParams.kPeriod || ""}, ${indicatorParams.dPeriod || ""}`;
      case "ATR":
        return `ATR ${indicatorParams.period || ""}`;
      case "Ichimoku":
        return `ICHIMOKU`;
      default:
        return String(selectedIndicatorType).toUpperCase();
    }
  };

  // Handle form submission
  const handleAddIndicator = () => {
    if (!selectedIndicatorType) {
      console.warn("Cannot add indicator: selectedIndicatorType is null");
      toast.error("No indicator type selected");
      return;
    }

    // Validate required parameters
    if (indicatorParams.period !== undefined && (isNaN(Number(indicatorParams.period)) || Number(indicatorParams.period) <= 0)) {
      toast.error("Period must be a positive number");
      return;
    }

    // Include the selected color in parameters
    const paramsWithColor = {
      ...indicatorParams,
      color: selectedColor,
      // Use the default pane index from indicatorDefaults if not explicitly set
      paneIndex: indicatorParams.paneIndex !== undefined ? indicatorParams.paneIndex : indicatorDefaults[selectedIndicatorType].defaultPane,
    };

    // Generate indicator name based on type and parameters
    const indicatorName = generateIndicatorName();

    console.log("Adding indicator:", { indicatorName, selectedIndicatorType, parameters: paramsWithColor });
    onAddIndicator(indicatorName, selectedIndicatorType, paramsWithColor);

    // Close dialog
    console.log("Closing dialog after adding indicator");
    onOpenChange(false);
  };

  // Enhanced parameter input handling
  const handleNumericParamChange = (parameter: string, value: string) => {
    // Convert to number if possible
    const numericValue = value === "" ? undefined : Number(value);
    setIndicatorParams((prev) => ({
      ...prev,
      [parameter]: numericValue,
    }));
  };

  // Get parameter configuration with enhanced number inputs
  const getParameterConfig = () => {
    if (!selectedIndicatorType) return null;

    switch (selectedIndicatorType) {
      case "SMA":
      case "EMA":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="period" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="period"
                  min={1}
                  max={200}
                  value={indicatorParams.period || ""}
                  onChange={(value) => handleNumericParamChange("period", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
          </div>
        );
      case "RSI":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="period" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="period"
                  min={2}
                  max={50}
                  value={indicatorParams.period || ""}
                  onChange={(value) => handleNumericParamChange("period", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="overbought" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Overbought
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="overbought"
                  min={50}
                  max={100}
                  value={typeof indicatorParams.overbought === "number" || typeof indicatorParams.overbought === "string" ? indicatorParams.overbought : ""}
                  onChange={(value) => handleNumericParamChange("overbought", value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="oversold" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Oversold
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="oversold"
                  min={0}
                  max={50}
                  value={typeof indicatorParams.oversold === "number" || typeof indicatorParams.oversold === "string" ? indicatorParams.oversold : ""}
                  onChange={(value) => handleNumericParamChange("oversold", value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );
      case "MACD":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="fastPeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Fast Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="fastPeriod"
                  min={1}
                  max={50}
                  value={indicatorParams.fastPeriod || ""}
                  onChange={(value) => handleNumericParamChange("fastPeriod", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="slowPeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Slow Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="slowPeriod"
                  min={1}
                  max={100}
                  value={indicatorParams.slowPeriod || ""}
                  onChange={(value) => handleNumericParamChange("slowPeriod", value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="signalPeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Signal Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="signalPeriod"
                  min={1}
                  max={50}
                  value={indicatorParams.signalPeriod || ""}
                  onChange={(value) => handleNumericParamChange("signalPeriod", value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );
      case "BollingerBands":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="period" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="period"
                  min={1}
                  max={100}
                  value={indicatorParams.period || ""}
                  onChange={(value) => handleNumericParamChange("period", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="stdDev" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Std Deviation
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="stdDev"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={indicatorParams.stdDev || ""}
                  onChange={(value) => handleNumericParamChange("stdDev", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
          </div>
        );
      case "Stochastic":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="kPeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                K Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="kPeriod"
                  min={1}
                  max={50}
                  value={typeof indicatorParams.kPeriod === "number" || typeof indicatorParams.kPeriod === "string" ? indicatorParams.kPeriod : ""}
                  onChange={(value) => handleNumericParamChange("kPeriod", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="dPeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                D Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="dPeriod"
                  min={1}
                  max={50}
                  value={typeof indicatorParams.dPeriod === "number" || typeof indicatorParams.dPeriod === "string" ? indicatorParams.dPeriod : ""}
                  onChange={(value) => handleNumericParamChange("dPeriod", value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );
      case "ATR":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="period" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Period
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="period"
                  min={1}
                  max={100}
                  value={indicatorParams.period || ""}
                  onChange={(value) => handleNumericParamChange("period", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
          </div>
        );
      case "Ichimoku":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="conversionPeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Conversion
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="conversionPeriod"
                  min={1}
                  max={50}
                  value={typeof indicatorParams.conversionPeriod === "number" || typeof indicatorParams.conversionPeriod === "string" ? indicatorParams.conversionPeriod : ""}
                  onChange={(value) => handleNumericParamChange("conversionPeriod", value)}
                  className="parameter-input h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="basePeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Base
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="basePeriod"
                  min={1}
                  max={100}
                  value={typeof indicatorParams.basePeriod === "number" || typeof indicatorParams.basePeriod === "string" ? indicatorParams.basePeriod : ""}
                  onChange={(value) => handleNumericParamChange("basePeriod", value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="spanPeriod" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Span
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="spanPeriod"
                  min={1}
                  max={100}
                  value={typeof indicatorParams.spanPeriod === "number" || typeof indicatorParams.spanPeriod === "string" ? indicatorParams.spanPeriod : ""}
                  onChange={(value) => handleNumericParamChange("spanPeriod", value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-5 items-center gap-3">
              <Label htmlFor="displacement" className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">
                Displacement
              </Label>
              <div className="col-span-4">
                <NumberInput
                  id="displacement"
                  min={1}
                  max={100}
                  value={typeof indicatorParams.displacement === "number" || typeof indicatorParams.displacement === "string" ? indicatorParams.displacement : ""}
                  onChange={(value) => handleNumericParamChange("displacement", value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );
      default:
        return <div className="text-center py-3 text-gray-500 dark:text-slate-400 italic">No configuration needed for this indicator.</div>;
    }
  };

  // Don't render anything if not open or not mounted
  if (!open || !mounted) return null;

  // Custom dialog implementation using React Portal
  return createPortal(
    <div className="fixed inset-0 z-50  dark:bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        ref={dialogRef}
        className="bg-white  dark:dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300 border border-gray-200 dark:border-slate-800">
        {/* Dialog Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configure {selectedIndicatorType?.toUpperCase() || ""} Indicator</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200 hover:rotate-90"
              aria-label="Close dialog">
              <XIcon className="h-5 w-5 text-gray-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Dialog Content - Enhanced layout */}
        {selectedIndicatorType && (
          <div className="space-y-6 p-6">
            {/* Indicator Name Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Preview</Label>
                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-slate-500 mb-1.5">Appears on chart as:</div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full shadow-md" style={{ backgroundColor: selectedColor }}></div>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{generateIndicatorName()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Common Controls */}
            <div className="space-y-4 mt-4">
              {/* Color picker */}
              <div className="grid grid-cols-5 items-center gap-3">
                <Label className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">Color</Label>
                <div className="col-span-4">
                  <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-11 flex items-center justify-start border border-gray-300 dark:border-slate-700 focus:outline-none">
                        <div className="w-6 h-6 rounded-sm mr-3" style={{ backgroundColor: selectedColor }} />
                        <span>{selectedColor}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-3 w-[225px]">
                      <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Pane selection */}
              <div className="grid grid-cols-5 items-center gap-3">
                <Label className="text-right col-span-1 font-medium text-gray-700 dark:text-slate-300">Pane</Label>
                <div className="col-span-4">
                  <select
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={indicatorParams.paneIndex !== undefined ? indicatorParams.paneIndex : indicatorDefaults[selectedIndicatorType!]?.defaultPane || 0}
                    onChange={(e) => {
                      // Update the pane index in parameters
                      setIndicatorParams((prev) => ({
                        ...prev,
                        paneIndex: parseInt(e.target.value),
                      }));
                    }}>
                    <option value={0}>Main Price Chart</option>
                    <option value={1}>Volume</option>
                    <option value={2}>New Oscillator Pane</option>
                    <option value={3}>Additional Pane 3</option>
                    <option value={4}>Additional Pane 4</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Parameters section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Parameters</Label>
                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800"></div>
              </div>
              <div className="mt-1 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-800 p-5">{getParameterConfig()}</div>
            </div>
          </div>
        )}

        {/* Dialog Footer */}
        <div className="p-5 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
          {selectedIndicatorType && (
            <div className="flex items-start mb-4 text-gray-600 dark:text-slate-400 text-xs">
              <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
              <p>Configure parameters for your indicator.</p>
            </div>
          )}
          <div className="flex justify-end items-center gap-3">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 hover:text-gray-900 dark:text-white"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="gap-1 px-5 bg-blue-600 hover:bg-blue-500 text-white" onClick={handleAddIndicator} disabled={!selectedIndicatorType}>
              <span>Add to Chart</span>
              <ArrowRightIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
