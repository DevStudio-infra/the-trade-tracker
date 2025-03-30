"use client";

/**
 * Chart Indicators Module
 *
 * This module exports all indicators and related functionality.
 */

// Export base indicator types
export * from "./base";

// Export individual indicator renderers
export * from "./renderers";

// Export calculation utilities
export * from "./calculations";

// Export state management
export * from "./state";

// Export indicator utilities
export * from "./utils";

// Export UI components
export { IndicatorManager } from "./IndicatorManager";
export { IndicatorDialog } from "./IndicatorDialog";
export { IndicatorBadge } from "./IndicatorBadge";
export { IndicatorControls } from "./IndicatorControls";
export { IndicatorParameterEditor } from "./IndicatorParameterEditor";

// Export indicator base
export * from "./base/types";
export * from "./base/IndicatorBase";

// Export indicator factory and store
export * from "./indicatorFactory";
export * from "./indicatorStore";

// No longer export deprecated components
// export * from './IndicatorRenderer';
