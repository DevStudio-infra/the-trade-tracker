"use client";

import { IndicatorDialog } from "./IndicatorDialog";
import { IndicatorBadge } from "./IndicatorBadge";
import { IndicatorType, IndicatorConfig, IndicatorParameters } from "../utils/chartTypes";
import { toast } from "sonner";

interface IndicatorManagerProps {
  indicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  onAddIndicator?: (type: IndicatorType) => void; // Make optional since not used directly
  selectedIndicatorType: IndicatorType | null;
  isDialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

/**
 * Component for managing chart indicators
 */
export function IndicatorManager({ indicators, onIndicatorsChange, selectedIndicatorType, isDialogOpen, onDialogOpenChange }: IndicatorManagerProps) {
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

    // Add to indicators list
    onIndicatorsChange([...indicators, newIndicator]);

    // Show success message
    toast.success(`${name} added to chart`);
  };

  // Handle removing an indicator
  const handleRemoveIndicator = (id: string) => {
    onIndicatorsChange(indicators.filter((indicator) => indicator.id !== id));
    toast.success("Indicator removed");
  };

  return (
    <>
      {/* Active indicators list */}
      {indicators.length > 0 && (
        <div className="flex gap-1 items-center overflow-x-auto py-0.5 px-1 max-w-xs">
          {indicators.map((indicator) => (
            <IndicatorBadge key={indicator.id} indicator={indicator} onRemove={handleRemoveIndicator} />
          ))}
        </div>
      )}

      {/* Indicator configuration dialog */}
      <IndicatorDialog open={isDialogOpen} onOpenChange={onDialogOpenChange} selectedIndicatorType={selectedIndicatorType} onAddIndicator={handleAddIndicator} />
    </>
  );
}
