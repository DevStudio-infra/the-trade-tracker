"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IndicatorType, IndicatorParameters, indicatorDefaults } from "../utils/chartTypes";

interface IndicatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIndicatorType: IndicatorType | null;
  onAddIndicator: (name: string, type: IndicatorType, parameters: IndicatorParameters) => void;
}

/**
 * Dialog component for configuring indicator parameters
 */
export function IndicatorDialog({ open, onOpenChange, selectedIndicatorType, onAddIndicator }: IndicatorDialogProps) {
  const [indicatorName, setIndicatorName] = useState("");
  const [indicatorParams, setIndicatorParams] = useState<IndicatorParameters>({});

  // Reset and initialize parameters when the selected indicator type changes
  useEffect(() => {
    if (selectedIndicatorType) {
      const defaults = indicatorDefaults[selectedIndicatorType];
      setIndicatorName(defaults.name);
      setIndicatorParams({ ...defaults.parameters });
    } else {
      // Reset when dialog closes
      setIndicatorName("");
      setIndicatorParams({});
    }
  }, [selectedIndicatorType]);

  // Handle form submission
  const handleAddIndicator = () => {
    if (!selectedIndicatorType) return;

    onAddIndicator(indicatorName, selectedIndicatorType, indicatorParams);

    // Close dialog
    onOpenChange(false);
  };

  // Handle parameter changes
  const handleParameterChange = (parameter: string, value: string | number) => {
    setIndicatorParams((prev) => ({
      ...prev,
      [parameter]: typeof value === "string" && !isNaN(Number(value)) ? Number(value) : value,
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Log to debug dialog open state changes
        console.log("Dialog open state changed:", newOpen);
        onOpenChange(newOpen);
      }}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Add Indicator</DialogTitle>
        </DialogHeader>

        {selectedIndicatorType && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="indicator-name">Name</Label>
              <Input id="indicator-name" value={indicatorName} onChange={(e) => setIndicatorName(e.target.value)} />
            </div>

            {/* Parameter fields based on indicator type */}
            {(selectedIndicatorType === "sma" || selectedIndicatorType === "ema") && (
              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Input id="period" type="number" min={1} max={200} value={indicatorParams.period || 20} onChange={(e) => handleParameterChange("period", e.target.value)} />

                <div className="pt-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="color"
                      type="color"
                      value={indicatorParams.color || "#2962FF"}
                      className="w-16 h-8 p-1"
                      onChange={(e) => handleParameterChange("color", e.target.value)}
                    />
                    <Input value={indicatorParams.color || "#2962FF"} onChange={(e) => handleParameterChange("color", e.target.value)} className="flex-1" />
                  </div>
                </div>
              </div>
            )}

            {/* RSI Parameters */}
            {selectedIndicatorType === "rsi" && (
              <div className="space-y-2">
                <Label htmlFor="rsi-period">Period</Label>
                <Input id="rsi-period" type="number" min={1} max={100} value={indicatorParams.period || 14} onChange={(e) => handleParameterChange("period", e.target.value)} />

                <div className="pt-2">
                  <Label htmlFor="rsi-color">Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="rsi-color"
                      type="color"
                      value={indicatorParams.color || "#F44336"}
                      className="w-16 h-8 p-1"
                      onChange={(e) => handleParameterChange("color", e.target.value)}
                    />
                    <Input value={indicatorParams.color || "#F44336"} onChange={(e) => handleParameterChange("color", e.target.value)} className="flex-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label htmlFor="overbought">Overbought</Label>
                    <Input
                      id="overbought"
                      type="number"
                      min={50}
                      max={100}
                      value={indicatorParams.overbought || 70}
                      onChange={(e) => handleParameterChange("overbought", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oversold">Oversold</Label>
                    <Input
                      id="oversold"
                      type="number"
                      min={0}
                      max={50}
                      value={indicatorParams.oversold || 30}
                      onChange={(e) => handleParameterChange("oversold", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MACD Parameters */}
            {selectedIndicatorType === "macd" && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="fast-period">Fast</Label>
                    <Input
                      id="fast-period"
                      type="number"
                      min={1}
                      max={50}
                      value={indicatorParams.fastPeriod || 12}
                      onChange={(e) => handleParameterChange("fastPeriod", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slow-period">Slow</Label>
                    <Input
                      id="slow-period"
                      type="number"
                      min={1}
                      max={100}
                      value={indicatorParams.slowPeriod || 26}
                      onChange={(e) => handleParameterChange("slowPeriod", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signal-period">Signal</Label>
                    <Input
                      id="signal-period"
                      type="number"
                      min={1}
                      max={50}
                      value={indicatorParams.signalPeriod || 9}
                      onChange={(e) => handleParameterChange("signalPeriod", e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Label htmlFor="macd-color">MACD Line Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="macd-color"
                      type="color"
                      value={indicatorParams.macdColor || "#2962FF"}
                      className="w-16 h-8 p-1"
                      onChange={(e) => handleParameterChange("macdColor", e.target.value)}
                    />
                    <Input value={indicatorParams.macdColor || "#2962FF"} onChange={(e) => handleParameterChange("macdColor", e.target.value)} className="flex-1" />
                  </div>
                </div>

                <div className="pt-2">
                  <Label htmlFor="signal-color">Signal Line Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="signal-color"
                      type="color"
                      value={indicatorParams.signalColor || "#FF6D00"}
                      className="w-16 h-8 p-1"
                      onChange={(e) => handleParameterChange("signalColor", e.target.value)}
                    />
                    <Input value={indicatorParams.signalColor || "#FF6D00"} onChange={(e) => handleParameterChange("signalColor", e.target.value)} className="flex-1" />
                  </div>
                </div>
              </div>
            )}

            {/* Additional indicator parameters can be added here */}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddIndicator}>Add Indicator</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
