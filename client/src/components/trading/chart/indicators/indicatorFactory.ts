"use client";

import { IndicatorConfig, IndicatorParameters, IndicatorParameterValue, IndicatorType, indicatorDefaults } from "../core/ChartTypes";
import { MACDRenderer } from "./renderers/MACDRenderer";
import { SMARenderer } from "./renderers/SMARenderer";
import { EMARenderer } from "./renderers/EMARenderer";
import { RSIRenderer } from "./renderers/RSIRenderer";
import { BollingerBandsRenderer } from "./renderers/BollingerBandsRenderer";
import { ATRRenderer } from "./renderers/ATRRenderer";
import { StochasticRenderer } from "./renderers/StochasticRenderer";
import { IchimokuRenderer } from "./renderers/IchimokuRenderer";
import { BaseIndicator } from "./base/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Create an indicator instance based on the provided type and parameters
 *
 * @param type The type of indicator to create
 * @param params Optional parameters for the indicator
 * @returns A new indicator instance
 */
export function createIndicator(type: string, params?: IndicatorParameters): BaseIndicator {
  // Generate a unique ID for this indicator instance
  const id = uuidv4();

  // Get default parameters for this indicator type
  const defaultParams = indicatorDefaults[type as keyof typeof indicatorDefaults] || {};

  // Merge default parameters with provided parameters
  const mergedParams = { ...defaultParams.defaultParameters, ...params };

  // Create instance based on type
  let indicator: BaseIndicator;

  // Log indicator creation
  console.log(`INDICATOR FACTORY: Creating ${type} indicator with ID ${id}`);
  console.log(`INDICATOR FACTORY: Parameters:`, mergedParams);

  switch (type) {
    case "MACD":
      indicator = new MACDRenderer({
        type: type as IndicatorType,
        id,
        parameters: mergedParams,
        name: `MACD (${mergedParams.fastPeriod || 12}, ${mergedParams.slowPeriod || 26}, ${mergedParams.signalPeriod || 9})`,
        color: (mergedParams.color as string) || "#4CAF50",
      });
      break;

    case "SMA":
      indicator = new SMARenderer({
        type: type as IndicatorType,
        id,
        parameters: mergedParams,
        name: `SMA (${mergedParams.period || 20})`,
        color: (mergedParams.color as string) || "#2196F3",
      });
      break;

    case "EMA":
      indicator = new EMARenderer({
        type: type as IndicatorType,
        id,
        parameters: mergedParams,
        name: `EMA (${mergedParams.period || 20})`,
        color: (mergedParams.color as string) || "#FF9800",
      });
      break;

    case "RSI":
      indicator = new RSIRenderer({
        type: type as IndicatorType,
        id,
        parameters: mergedParams,
        name: `RSI (${mergedParams.period || 14})`,
        color: (mergedParams.color as string) || "#9C27B0",
      });
      break;

    case "BollingerBands":
      indicator = new BollingerBandsRenderer({
        type: type as IndicatorType,
        id,
        parameters: mergedParams,
        name: `Bollinger Bands (${mergedParams.period || 20}, ${mergedParams.stdDev || 2})`,
        color: (mergedParams.color as string) || "#E91E63",
      });
      break;

    case "ATR":
      indicator = new ATRRenderer({
        type: type as IndicatorType,
        id,
        parameters: mergedParams,
        name: `ATR (${mergedParams.period || 14})`,
        color: (mergedParams.color as string) || "#795548",
      });
      break;

    case "Stochastic":
      indicator = new StochasticRenderer({
        type: type as IndicatorType,
        id,
        parameters: mergedParams,
        name: `Stochastic (${mergedParams.kPeriod || 14}, ${mergedParams.dPeriod || 3})`,
        color: (mergedParams.color as string) || "#607D8B",
      });
      break;

    case "Ichimoku":
      indicator = new IchimokuRenderer({
        id: id,
        type: type as IndicatorType,
        name: `Ichimoku Cloud`,
        color: (mergedParams.color as string) || "#607D8B",
        parameters: mergedParams,
        visible: true,
      });
      break;

    default:
      throw new Error(`Unsupported indicator type: ${type}`);
  }

  // Return the new indicator
  return indicator;
}

/**
 * Get the configuration for an indicator based on its parameters
 *
 * @param type The type of indicator
 * @param parameters The parameters for the indicator
 * @returns The indicator configuration
 */
export function getIndicatorConfig(type: string, parameters: IndicatorParameters): IndicatorConfig {
  const id = uuidv4();

  return {
    id,
    type: type as IndicatorType,
    name: type,
    parameters,
    visible: true,
    color: (parameters.color as string) || getDefaultColor(type),
    paneIndex: getPreferredPaneIndex(type),
  };
}

/**
 * Get the default color for an indicator type
 *
 * @param type The indicator type
 * @returns The default color for the indicator
 */
function getDefaultColor(type: string): string {
  switch (type) {
    case "SMA":
      return "#2196F3"; // Blue
    case "EMA":
      return "#FF9800"; // Orange
    case "RSI":
      return "#9C27B0"; // Purple
    case "MACD":
      return "#4CAF50"; // Green
    case "BollingerBands":
      return "#E91E63"; // Pink
    case "ATR":
      return "#795548"; // Brown
    case "Stochastic":
      return "#607D8B"; // Blue Gray
    default:
      return "#2196F3"; // Default to blue
  }
}

/**
 * Get the preferred pane index for an indicator type
 *
 * @param type The indicator type
 * @returns The preferred pane index for the indicator
 */
function getPreferredPaneIndex(type: string): number {
  switch (type) {
    case "SMA":
    case "EMA":
    case "BollingerBands":
      // These go in the main price chart
      return 0;

    case "MACD":
    case "RSI":
    case "Stochastic":
    case "ATR":
      // These go in separate oscillator panes
      return -1; // -1 means "needs a separate pane"

    default:
      // Default to main chart
      return 0;
  }
}

/**
 * Migrate an old indicator configuration to the new system
 *
 * @param oldConfig The old indicator configuration object
 * @returns A new indicator instance configured from the old settings
 */
export function migrateOldConfig(oldConfig: Record<string, unknown>): BaseIndicator {
  try {
    // Extract type and parameters from old config
    const type = oldConfig.type as string;
    const params: IndicatorParameters = {};

    // Convert parameters safely
    if (oldConfig.parameters && typeof oldConfig.parameters === "object") {
      const paramObj = oldConfig.parameters as Record<string, unknown>;

      // Add each known parameter
      for (const key in paramObj) {
        if (paramObj.hasOwnProperty(key)) {
          // Only add parameters with valid types
          const val = paramObj[key];
          if (typeof val === "string" || typeof val === "number" || typeof val === "boolean" || (typeof val === "object" && val !== null)) {
            params[key] = val as IndicatorParameterValue;
          }
        }
      }
    }

    // Preserve ID if available
    if (oldConfig.id) {
      params.id = oldConfig.id as string;
    }

    // Preserve color if available
    if (oldConfig.color) {
      params.color = oldConfig.color as string;
    }

    // Create new indicator with these parameters
    return createIndicator(type, params);
  } catch (error) {
    console.error("INDICATOR FACTORY: Error migrating old config:", error);
    throw new Error("Failed to migrate indicator configuration");
  }
}
