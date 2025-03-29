"use client";

import { ReactNode } from "react";
import { createIndicator } from "./indicatorFactory";
import { IndicatorType, IndicatorConfig } from "../core/ChartTypes";

/**
 * IndicatorRenderer
 *
 * This is an adapter component that provides compatibility with the old indicator system.
 * It forwards indicator creation to the new indicator factory system.
 *
 * @deprecated Use the new indicator system with createIndicator instead
 */
export function IndicatorRenderer(): ReactNode {
  console.warn("IndicatorRenderer is deprecated. Use the new indicator system with createIndicator instead.");
  return null;
}

// Export the createIndicator function for backward compatibility
export { createIndicator };

// Export types
export type { IndicatorType, IndicatorConfig };
