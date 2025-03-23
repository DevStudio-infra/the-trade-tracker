"use client";

import { IndicatorDialog } from "./IndicatorDialog";
import { IndicatorType, IndicatorConfig, IndicatorParameters } from "../utils/chartTypes";
import { toast } from "sonner";
import { useEffect } from "react";

interface IndicatorManagerProps {
  indicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  selectedIndicatorType: IndicatorType | null;
  isDialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

/**
 * Component for managing chart indicators
 * This version focuses only on the dialog functionality,
 * with the active indicators managed by the ChartHeader dropdown
 */
export function IndicatorManager({ indicators, onIndicatorsChange, selectedIndicatorType, isDialogOpen, onDialogOpenChange }: IndicatorManagerProps) {
  // Log props for debugging
  useEffect(() => {
    console.log("IndicatorManager props:", { isDialogOpen, selectedIndicatorType });
  }, [isDialogOpen, selectedIndicatorType]);

  // Handle adding a new indicator
  const handleAddIndicator = (name: string, type: IndicatorType, parameters: IndicatorParameters) => {
    // Create a new indicator config
    const newIndicator: IndicatorConfig = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      color: type === "macd" ? parameters.macdColor || "#2962FF" : parameters.color || "#4CAF50",
      visible: true,
      parameters,
    };

    console.log("Creating new indicator:", newIndicator);

    // Add to indicators list
    onIndicatorsChange([...indicators, newIndicator]);

    // Show success message
    toast.success(`${name} added to chart`);
  };

  return (
    <>
      {/* Indicator configuration dialog - only shows when a type is selected */}
      <IndicatorDialog open={isDialogOpen} onOpenChange={onDialogOpenChange} selectedIndicatorType={selectedIndicatorType} onAddIndicator={handleAddIndicator} />
    </>
  );
}
