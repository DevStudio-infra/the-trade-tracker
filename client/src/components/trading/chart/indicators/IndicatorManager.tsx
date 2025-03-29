"use client";

import { IndicatorDialog } from "./IndicatorDialog";
import { IndicatorType, IndicatorConfig, IndicatorParameters } from "../core/ChartTypes";
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
    // Get color from parameters, making sure it's a string
    const color = type === "MACD" && parameters.macdColor ? String(parameters.macdColor) : parameters.color ? String(parameters.color) : "#4CAF50";

    // Create a new indicator config
    const newIndicator: IndicatorConfig = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      color,
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
