"use client";

import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { ChartApiWithPanes, IndicatorConfig, IndicatorParameters, IndicatorType } from "../core/ChartTypes";
import { BaseIndicator } from "./base/types";
import { createIndicator, getIndicatorConfig } from "./indicatorFactory";
import { OscillatorPaneTracker, PaneReferenceTracker, cleanUpUnusedPanes, ensurePaneExists, generateIndicatorKey, getNextAvailablePaneIndex } from "../core/ChartUtils";

interface IndicatorState {
  // Map of indicator ID to indicator instance
  indicators: Map<string, BaseIndicator>;
  // Ordered list of indicator IDs to maintain display order
  indicatorOrder: string[];

  // Chart instance reference (if any)
  chartInstance: ChartApiWithPanes | null;

  // Map of indicator keys to pane indices for oscillators
  oscillatorPanes: OscillatorPaneTracker;

  // Track which panes have been created
  createdPanes: PaneReferenceTracker;

  // Methods for managing indicators
  addIndicator: (indicator: BaseIndicator) => string;
  createAndAddIndicator: (type: string, parameters?: IndicatorParameters, name?: string, color?: string) => string;
  removeIndicator: (id: string) => void;
  updateIndicator: (id: string, parameters: IndicatorParameters) => void;
  setIndicatorVisibility: (id: string, visible: boolean) => void;
  reorderIndicators: (orderedIds: string[]) => void;
  getIndicator: (id: string) => BaseIndicator | undefined;
  getIndicators: () => BaseIndicator[];
  clearAllIndicators: () => void;
  setChartInstance: (chart: ChartApiWithPanes | null) => void;
  updateData: (candles: any[]) => void;
  toggleVisibility: (key: string) => void;
  cleanupUnusedPanes: () => void;
  reset: () => void;
}

// Interface for serializable indicator data
interface SerializedIndicator {
  id: string;
  config: IndicatorConfig;
}

// Custom serialization type
interface SerializedState extends Omit<IndicatorState, "indicators"> {
  indicators: SerializedIndicator[];
}

export const useIndicatorStore = create<IndicatorState>()(
  persist(
    (set, get) => ({
      indicators: new Map<string, BaseIndicator>(),
      indicatorOrder: [],
      chartInstance: null,
      oscillatorPanes: {},
      createdPanes: {},

      addIndicator: (indicator: BaseIndicator) => {
        const id = indicator.getId();
        set((state) => {
          // Create a new Map with the indicator added
          const newIndicators = new Map(state.indicators);
          newIndicators.set(id, indicator);

          // Add to the order if not already present
          const newOrder = state.indicatorOrder.includes(id) ? [...state.indicatorOrder] : [...state.indicatorOrder, id];

          return {
            indicators: newIndicators,
            indicatorOrder: newOrder,
          };
        });
        return id;
      },

      createAndAddIndicator: (type, parameters, name, color) => {
        // Generate a unique ID
        const id = uuidv4();

        // Prepare parameters with id, name, color if provided
        const params: IndicatorParameters = {
          ...(parameters || {}),
          id,
          name: name || type,
          color: color || undefined,
        };

        // Create the indicator
        const indicator = createIndicator(type, params);

        // Add to store
        set((state) => {
          const newIndicators = new Map(state.indicators);
          newIndicators.set(id, indicator);
          return {
            indicators: newIndicators,
            indicatorOrder: [...state.indicatorOrder, id],
          };
        });

        return id;
      },

      removeIndicator: (id: string) => {
        set((state) => {
          // Create new indicators map without the removed indicator
          const newIndicators = new Map(state.indicators);

          // Clean up the indicator before removing
          const indicator = newIndicators.get(id);
          if (indicator) {
            indicator.destroy();
            newIndicators.delete(id);
          }

          // Remove from the order array
          const newOrder = state.indicatorOrder.filter((orderId) => orderId !== id);

          return {
            indicators: newIndicators,
            indicatorOrder: newOrder,
          };
        });
      },

      updateIndicator: (id: string, parameters: IndicatorParameters) => {
        const { indicators } = get();
        const indicator = indicators.get(id);

        if (indicator) {
          indicator.setParameters(parameters);

          // Update the store to trigger a re-render
          set((state) => ({
            indicators: new Map(state.indicators),
          }));
        }
      },

      setIndicatorVisibility: (id: string, visible: boolean) => {
        const { indicators } = get();
        const indicator = indicators.get(id);

        if (indicator) {
          indicator.setVisible(visible);

          // Update the store to trigger a re-render
          set((state) => ({
            indicators: new Map(state.indicators),
          }));
        }
      },

      reorderIndicators: (orderedIds: string[]) => {
        set({ indicatorOrder: orderedIds });
      },

      getIndicator: (id: string) => {
        return get().indicators.get(id);
      },

      getIndicators: () => {
        const { indicators, indicatorOrder } = get();
        return indicatorOrder.map((id) => indicators.get(id)).filter((indicator): indicator is BaseIndicator => !!indicator);
      },

      clearAllIndicators: () => {
        const { indicators } = get();

        // Clean up all indicators
        indicators.forEach((indicator) => {
          indicator.destroy();
        });

        // Reset the store
        set({
          indicators: new Map(),
          indicatorOrder: [],
        });
      },

      setChartInstance: (chart: ChartApiWithPanes | null) => {
        const { indicators, oscillatorPanes, createdPanes } = get();

        console.log(`INDICATOR STORE: Setting chart instance ${chart ? "provided" : "null"}`);

        // If we're clearing the chart
        if (!chart) {
          // Clean up all indicators
          Object.values(indicators).forEach((indicator) => {
            try {
              indicator.destroy();
            } catch (error) {
              console.error(`INDICATOR STORE: Error destroying indicator during chart reset:`, error);
            }
          });

          // Reset state
          set({
            chartInstance: null,
            createdPanes: {},
          });
          return;
        }

        // We have a new chart instance
        set({ chartInstance: chart });

        // Initialize all indicators with the new chart
        Object.entries(indicators).forEach(([key, indicator]) => {
          try {
            console.log(`INDICATOR STORE: Initializing indicator ${key} with new chart instance`);

            // Get the preferred pane index
            const preferredPaneIndex = indicator.getPreferredPaneIndex();
            let paneIndex = preferredPaneIndex;

            // If indicator needs a separate pane
            if (preferredPaneIndex === -1) {
              // Get the next available pane index or use an existing one
              paneIndex = oscillatorPanes[key] || getNextAvailablePaneIndex(oscillatorPanes);

              // Ensure the pane exists
              if (!ensurePaneExists(chart, paneIndex, createdPanes)) {
                console.error(`INDICATOR STORE: Failed to create pane ${paneIndex} for indicator ${key}`);
                return;
              }

              // Store the pane index for this indicator
              oscillatorPanes[key] = paneIndex;
            }

            // Initialize the indicator with the chart and pane index
            indicator.initialize(chart, { paneIndex });
          } catch (error) {
            console.error(`INDICATOR STORE: Error initializing indicator ${key} with new chart:`, error);
          }
        });
      },

      updateData: (candles: any[]) => {
        const { indicators } = get();

        if (candles.length === 0) {
          console.warn(`INDICATOR STORE: Cannot update indicators with empty candles`);
          return;
        }

        // Update all indicators with the new data
        Object.values(indicators).forEach((indicator) => {
          try {
            indicator.updateData(candles);
          } catch (error) {
            console.error(`INDICATOR STORE: Error updating indicator data:`, error);
          }
        });
      },

      toggleVisibility: (key: string) => {
        const { indicators } = get();
        const indicator = indicators.get(key);

        if (!indicator) {
          console.warn(`INDICATOR STORE: Cannot toggle visibility for indicator ${key}, not found`);
          return;
        }

        // Toggle visibility
        const isVisible = indicator.isVisible();
        indicator.setVisible(!isVisible);

        // Update in our collection
        set((state) => ({
          indicators: new Map(state.indicators),
        }));
      },

      cleanupUnusedPanes: () => {
        const { chartInstance, oscillatorPanes, createdPanes } = get();

        if (!chartInstance) {
          return;
        }

        // Get all active pane indices
        const activePaneIndices = new Set<number>(Object.values(oscillatorPanes));

        // Always keep panes 0 and 1 (main chart and volume)
        activePaneIndices.add(0);
        activePaneIndices.add(1);

        // Clean up unused panes
        cleanUpUnusedPanes(chartInstance, activePaneIndices, createdPanes);
      },

      reset: () => {
        const { chartInstance, indicators } = get();

        // Clean up all indicators
        Object.values(indicators).forEach((indicator) => {
          try {
            indicator.destroy();
          } catch (error) {
            console.error(`INDICATOR STORE: Error destroying indicator during reset:`, error);
          }
        });

        // Reset state
        set({
          indicators: new Map(),
          chartInstance: chartInstance, // Keep the chart instance
          oscillatorPanes: {},
          createdPanes: {},
        });
      },
    }),
    {
      name: "trading-chart-indicators",
      serialize: (state): string => {
        // Convert indicators Map to array for serialization
        const serializableState: SerializedState = {
          ...state,
          indicators: Array.from(state.indicators.entries()).map(([id, indicator]: [string, BaseIndicator]) => {
            // Serialize each indicator (just store config, not the full instance)
            return {
              id,
              config: indicator.getConfig(),
            };
          }),
        };
        return JSON.stringify(serializableState);
      },
      deserialize: (str): IndicatorState => {
        const deserializedState = JSON.parse(str) as SerializedState;

        // Reconstruct the state with empty collections first
        const state: IndicatorState = {
          ...deserializedState,
          indicators: new Map(),
          indicatorOrder: deserializedState.indicatorOrder || [],
          // Add all methods from the store definition
          addIndicator: () => "", // Will be overwritten by the store
          createAndAddIndicator: () => "", // Will be overwritten by the store
          removeIndicator: () => {}, // Will be overwritten by the store
          updateIndicator: () => {}, // Will be overwritten by the store
          setIndicatorVisibility: () => {}, // Will be overwritten by the store
          reorderIndicators: () => {}, // Will be overwritten by the store
          getIndicator: () => undefined, // Will be overwritten by the store
          getIndicators: () => [], // Will be overwritten by the store
          clearAllIndicators: () => {}, // Will be overwritten by the store
          setChartInstance: () => {}, // Will be overwritten by the store
          updateData: () => {}, // Will be overwritten by the store
          toggleVisibility: () => {}, // Will be overwritten by the store
          cleanupUnusedPanes: () => {}, // Will be overwritten by the store
          reset: () => {}, // Will be overwritten by the store
        };

        // Recreate indicator instances from configs
        if (Array.isArray(deserializedState.indicators)) {
          deserializedState.indicators.forEach(({ id, config }) => {
            try {
              // Recreate the indicator using the factory
              const indicator = createIndicator(config.type as string, config.parameters);

              // Add to the map
              state.indicators.set(id, indicator);
            } catch (error) {
              console.error(`Failed to deserialize indicator ${id}:`, error);
            }
          });
        }

        return state;
      },
    }
  )
);

// Helper function to create and add multiple indicators at once
export function createAndAddMultipleIndicators(
  indicatorConfigs: Array<{
    type: string;
    parameters?: IndicatorParameters;
    name?: string;
    color?: string;
  }>
): string[] {
  const ids: string[] = [];
  const { createAndAddIndicator } = useIndicatorStore.getState();

  indicatorConfigs.forEach((config) => {
    const id = createAndAddIndicator(config.type, config.parameters, config.name, config.color);
    ids.push(id);
  });

  return ids;
}
