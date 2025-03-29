"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { IndicatorParameters } from "../core/ChartTypes";

// Simple inline color picker component since we don't have access to the UI library's version
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-md border border-input" style={{ backgroundColor: value }} />
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-28" />
      <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" />
    </div>
  );
};

// Parameter metadata for different indicator types
const PARAMETER_METADATA: Record<
  string,
  Record<
    string,
    {
      label: string;
      type: "number" | "color" | "slider";
      min?: number;
      max?: number;
      step?: number;
    }
  >
> = {
  SMA: {
    period: { label: "Period", type: "number", min: 1, max: 200 },
    color: { label: "Color", type: "color" },
  },
  EMA: {
    period: { label: "Period", type: "number", min: 1, max: 200 },
    color: { label: "Color", type: "color" },
  },
  RSI: {
    period: { label: "Period", type: "number", min: 1, max: 200 },
    color: { label: "Color", type: "color" },
  },
  MACD: {
    fastPeriod: { label: "Fast Period", type: "number", min: 1, max: 200 },
    slowPeriod: { label: "Slow Period", type: "number", min: 1, max: 200 },
    signalPeriod: { label: "Signal Period", type: "number", min: 1, max: 200 },
    color: { label: "Color", type: "color" },
  },
  BollingerBands: {
    period: { label: "Period", type: "number", min: 1, max: 200 },
    stdDev: { label: "Standard Deviation", type: "number", min: 0.1, max: 10, step: 0.1 },
    color: { label: "Color", type: "color" },
  },
  ATR: {
    period: { label: "Period", type: "number", min: 1, max: 200 },
    color: { label: "Color", type: "color" },
  },
  Stochastic: {
    kPeriod: { label: "K Period", type: "number", min: 1, max: 200 },
    dPeriod: { label: "D Period", type: "number", min: 1, max: 200 },
    overbought: { label: "Overbought Level", type: "slider", min: 50, max: 100, step: 1 },
    oversold: { label: "Oversold Level", type: "slider", min: 0, max: 50, step: 1 },
    color: { label: "Color", type: "color" },
  },
};

interface IndicatorParameterEditorProps {
  parameters: IndicatorParameters;
  onChange: (parameters: IndicatorParameters) => void;
  type: string;
}

export const IndicatorParameterEditor: React.FC<IndicatorParameterEditorProps> = ({ parameters, onChange, type }) => {
  // Get the metadata for this indicator type or use an empty object if none exists
  const metadata = PARAMETER_METADATA[type] || {};

  const handleParameterChange = (key: string, value: string | number) => {
    // Convert to number if it's a number field
    const parsedValue = metadata[key]?.type === "number" ? (isNaN(parseFloat(String(value))) ? 0 : parseFloat(String(value))) : value;

    onChange({
      ...parameters,
      [key]: parsedValue,
    });
  };

  return (
    <div className="space-y-4">
      {Object.entries(metadata).map(([key, meta]) => {
        // Extract the value from parameters, defaulting to empty string or appropriate defaults
        let value: string | number = "";

        if (parameters[key] !== undefined) {
          value = parameters[key] as string | number;
        } else if (meta.type === "number" || meta.type === "slider") {
          value = meta.min || 0;
        } else if (meta.type === "color") {
          value = "#888888";
        }

        // Skip rendering internal parameters (like id)
        if (key === "id") return null;

        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{meta.label}</Label>

            {meta.type === "color" ? (
              <ColorPicker value={String(value)} onChange={(color) => handleParameterChange(key, color)} />
            ) : meta.type === "slider" ? (
              <div className="flex flex-col space-y-2">
                <Slider
                  id={key}
                  min={meta.min || 0}
                  max={meta.max || 100}
                  step={meta.step || 1}
                  value={[Number(value)]}
                  onValueChange={(values) => handleParameterChange(key, values[0])}
                />
                <div className="text-right text-sm text-muted-foreground">{value.toString()}</div>
              </div>
            ) : (
              <Input id={key} type="number" value={value.toString()} onChange={(e) => handleParameterChange(key, e.target.value)} min={meta.min} max={meta.max} step={meta.step} />
            )}
          </div>
        );
      })}
    </div>
  );
};
