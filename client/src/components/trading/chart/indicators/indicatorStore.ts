"use client";

import { create, StateCreator } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { ChartApiWithPanes, IndicatorParameters, indicatorDefaults } from "../core/ChartTypes";
import { BaseIndicator } from "./base/types";
import { createIndicator } from "./indicatorFactory";
import { OscillatorPaneTracker, PaneReferenceTracker, cleanUpUnusedPanes, getNextAvailablePaneIndex } from "../core/ChartUtils";
import { FormattedCandle } from "../core/ChartTypes";
import { ISeriesApi, CandlestickData, Time } from "lightweight-charts";

const OSCILLATOR_INDICATORS = ["RSI", "MACD", "Stochastic", "ATR"];
const OVERLAY_INDICATORS = ["SMA", "EMA", "BollingerBands", "Ichimoku"];

interface IndicatorState {
  indicators: Map<string, BaseIndicator>;
  indicatorOrder: string[];
  chartInstance: ChartApiWithPanes | null;
  oscillatorPanes: OscillatorPaneTracker;
  createdPanes: PaneReferenceTracker;
  paneAssignments: Map<string, number>; // Maps indicator IDs to pane indices
  mainSeries: ISeriesApi<"Candlestick"> | null;
  addIndicator: (indicator: BaseIndicator) => string;
  createAndAddIndicator: (type: string, parameters?: IndicatorParameters, name?: string, color?: string) => string;
  removeIndicator: (id: string) => void;
  updateIndicator: (id: string, parameters: IndicatorParameters) => void;
  setIndicatorVisibility: (id: string, visible: boolean) => void;
  reorderIndicators: (orderedIds: string[]) => void;
  getIndicator: (id: string) => BaseIndicator | undefined;
  getIndicators: () => BaseIndicator[];
  clearAllIndicators: () => void;
  setChartInstance: (chart: ChartApiWithPanes | null, mainSeries?: ISeriesApi<"Candlestick"> | null) => void;
  updateData: (candles: FormattedCandle[]) => void;
  toggleVisibility: (key: string) => void;
  cleanupUnusedPanes: () => void;
  reset: () => void;
  assignPane: (indicatorId: string, paneIndex: number) => void;
  getIndicatorPane: (indicatorId: string) => number | undefined;
}

// Helper function to determine if an indicator should be overlaid on the main chart
function isOverlayIndicator(type: string): boolean {
  return OVERLAY_INDICATORS.includes(type);
}

// Create the base store without persistence
const createBaseStore: StateCreator<IndicatorState> = (set, get) => ({
  indicators: new Map<string, BaseIndicator>(),
  indicatorOrder: [],
  chartInstance: null,
  oscillatorPanes: {},
  createdPanes: {},
  paneAssignments: new Map<string, number>(),
  mainSeries: null,

  assignPane: (indicatorId: string, paneIndex: number) => {
    set((state) => ({
      paneAssignments: new Map(state.paneAssignments).set(indicatorId, paneIndex),
      oscillatorPanes: { ...state.oscillatorPanes, [indicatorId]: paneIndex },
    }));
  },

  getIndicatorPane: (indicatorId: string) => {
    return get().paneAssignments.get(indicatorId);
  },

  addIndicator: (indicator: BaseIndicator) => {
    console.log(`INDICATOR STORE: Adding indicator ${indicator.getType()} with ID ${indicator.getId()}`);

    const state = get();
    const id = indicator.getId();

    // Check if chart instance is available
    if (!state.chartInstance) {
      console.error("INDICATOR STORE: Cannot add indicator - chart instance is not available");
      return id;
    }

    // Check if main series is available
    if (!state.mainSeries) {
      console.error("INDICATOR STORE: Cannot add indicator - main series is not available");
      return id;
    }

    // Add the indicator to the map
    state.indicators.set(id, indicator);
    console.log(`INDICATOR STORE: Added indicator ${indicator.getType()} to the map`);

    // Add to order if not already there
    if (!state.indicatorOrder.includes(id)) {
      state.indicatorOrder.push(id);
      console.log(`INDICATOR STORE: Added indicator ${indicator.getType()} to the order list`);
    }

    // Determine if this is an overlay or oscillator indicator
    const isOverlay = isOverlayIndicator(indicator.getType());
    console.log(`INDICATOR STORE: Indicator ${indicator.getType()} is ${isOverlay ? "an overlay" : "an oscillator"}`);

    // Initialize the indicator with the chart
    try {
      // Get the pane index
      const paneIndex = isOverlay ? 0 : state.getIndicatorPane(id) || getNextAvailablePaneIndex(state.oscillatorPanes);
      console.log(`INDICATOR STORE: Using pane ${paneIndex} for indicator ${indicator.getType()}`);

      indicator.initialize(state.chartInstance, {
        id: indicator.getId(),
        type: indicator.getType(),
        name: indicator.getName(),
        color: indicator.getConfig().color,
        visible: indicator.isVisible(),
        parameters: {
          paneIndex,
          priceScaleId: "left",
        },
      });
      console.log(`INDICATOR STORE: Initialized indicator ${indicator.getType()}`);

      // Create the series in the appropriate pane
      if (paneIndex !== undefined) {
        state.assignPane(id, paneIndex);
        indicator.createSeries(paneIndex);
        console.log(`INDICATOR STORE: Created series for indicator ${indicator.getType()} in pane ${paneIndex}`);

        // Update the indicator with current data if available
        if (state.mainSeries) {
          const data = state.mainSeries.data();
          if (data && data.length > 0) {
            console.log(`INDICATOR STORE: Updating indicator ${indicator.getType()} with current data`);
            const formattedData = data.map((d) => {
              const candleData = d as CandlestickData<Time>;
              return {
                time: candleData.time,
                open: candleData.open,
                high: candleData.high,
                low: candleData.low,
                close: candleData.close,
                value: 0,
              };
            });
            indicator.updateData(formattedData);
            console.log(`INDICATOR STORE: Successfully updated indicator ${indicator.getType()} with current data`);
          }
        }
      } else {
        console.error(`INDICATOR STORE: Failed to assign pane for oscillator indicator ${indicator.getType()}`);
      }
    } catch (error) {
      console.error(`INDICATOR STORE: Failed to initialize indicator ${indicator.getType()}:`, error);
    }

    // Update the state
    set(state);
    console.log(`INDICATOR STORE: Updated state with new indicator ${indicator.getType()}`);

    // Force a chart update to ensure indicators are rendered
    if (state.chartInstance) {
      console.log(`INDICATOR STORE: Forcing chart update to ensure indicators are rendered`);
      // This will trigger a redraw of the chart
      state.chartInstance.timeScale().fitContent();
    }

    return id;
  },

  createAndAddIndicator: (type: string, parameters?: IndicatorParameters, name?: string, color?: string) => {
    console.log(`=== INDICATOR STORE: CREATE AND ADD START ===`);
    const { indicators, chartInstance } = get();

    console.log(`Store state:`, {
      hasChartInstance: !!chartInstance,
      currentIndicators: Array.from(indicators.values()).map((ind) => ({
        type: ind.getType(),
        name: ind.getName(),
        isOscillator: OSCILLATOR_INDICATORS.includes(ind.getType()),
        isOverlay: isOverlayIndicator(ind.getType()),
      })),
      type,
      parameters,
      name,
      color,
    });

    // Check if this is an oscillator type indicator
    const isOscillator = OSCILLATOR_INDICATORS.includes(type);
    const isOverlay = isOverlayIndicator(type);
    console.log(`Indicator type check: ${type}, isOscillator=${isOscillator}, isOverlay=${isOverlay}`);

    if (isOscillator) {
      // Check if we already have ANY oscillator
      const existingOscillators = Array.from(indicators.values()).filter((ind) => {
        const indType = ind.getType();
        const isOsc = OSCILLATOR_INDICATORS.includes(indType);
        console.log(`Checking existing indicator: ${ind.getName()} (${indType}), isOscillator=${isOsc}`);
        return isOsc;
      });

      if (existingOscillators.length > 0) {
        const existingOscillator = existingOscillators[0];
        const error = `Cannot add ${type}: Only one oscillator indicator allowed. Please remove ${existingOscillator.getName()} first.`;
        console.warn(error);
        throw new Error(error);
      }
    }

    const id = uuidv4();
    console.log(`Generated new indicator ID: ${id}`);

    // Get default parameters for this indicator type
    const defaultParams = indicatorDefaults[type]?.defaultParameters || {};

    const params: IndicatorParameters = {
      ...defaultParams,
      ...(parameters || {}),
      id,
      name: name || type,
      color: color || undefined,
    };

    console.log(`Creating indicator with params:`, params);
    const indicator = createIndicator(type, params);
    console.log(`Indicator created:`, {
      type: indicator.getType(),
      name: indicator.getName(),
      id: indicator.getId(),
      config: indicator.getConfig(),
    });

    // Add the indicator to the store
    const addedId = get().addIndicator(indicator);
    console.log(`Indicator added to store with ID: ${addedId}`);

    // Initialize the indicator with the chart if available
    if (chartInstance) {
      console.log(`Chart instance available, initializing indicator`);
      try {
        // Initialize based on indicator type
        if (isOverlay) {
          // Overlay indicators go on the main chart (pane 0)
          console.log(`Initializing overlay indicator ${indicator.getName()} in main pane`);
          indicator.initialize(chartInstance, {
            id: indicator.getId(),
            type: indicator.getType(),
            name: indicator.getName(),
            color: indicator.getConfig().color,
            visible: indicator.isVisible(),
            parameters: {
              paneIndex: 0,
              priceScaleId: "left",
            },
          });
          indicator.createSeries(0);
        } else if (isOscillator) {
          // Oscillators go in pane 1
          console.log(`Creating pane for oscillator ${indicator.getName()}`);

          try {
            // Initialize the indicator with the chart and config options
            indicator.initialize(chartInstance, {
              id: indicator.getId(),
              type: indicator.getType(),
              name: indicator.getName(),
              color: indicator.getConfig().color,
              visible: indicator.isVisible(),
              parameters: {
                paneIndex: 1,
                priceScaleId: "left",
              },
            });

            // Create the indicator series in pane 1
            indicator.createSeries(1);

            console.log(`Successfully initialized oscillator ${indicator.getName()} in pane 1`);
          } catch (error) {
            console.error(`Error initializing oscillator ${indicator.getId()}:`, error);
          }
        }
        console.log(`Successfully initialized indicator ${indicator.getName()}`);

        // Get data from main series if available
        const { mainSeries } = get();
        if (mainSeries) {
          const data = mainSeries.data();
          if (data && data.length > 0) {
            // Convert the data to FormattedCandle format
            const formattedData = data.map((d) => {
              const candleData = d as CandlestickData<Time>;
              return {
                time: candleData.time,
                open: candleData.open,
                high: candleData.high,
                low: candleData.low,
                close: candleData.close,
                value: 0, // Volume data not available in candlestick data
              };
            });
            indicator.updateData(formattedData);
          }
        }
      } catch (error) {
        console.error(`Error initializing indicator:`, error);
        // Clean up on initialization failure
        indicators.delete(addedId);
        throw error;
      }
    } else {
      console.log(`No chart instance available, skipping indicator initialization`);
    }

    console.log(`=== INDICATOR STORE: CREATE AND ADD END ===`);
    return addedId;
  },

  removeIndicator: (id: string) => {
    set((state) => {
      const indicator = state.indicators.get(id);
      console.log(`Removing indicator: ${indicator?.getName()} (${indicator?.getType()})`);

      if (!indicator) return state;

      // Get the pane index before cleanup
      const paneIndex = state.paneAssignments.get(id);

      // Clean up the indicator
      indicator.destroy();

      // Create new maps without the removed indicator
      const newIndicators = new Map(state.indicators);
      newIndicators.delete(id);

      const newPaneAssignments = new Map(state.paneAssignments);
      newPaneAssignments.delete(id);

      // Create new oscillatorPanes without the removed indicator
      const newOscillatorPanes = { ...state.oscillatorPanes };
      delete newOscillatorPanes[id];

      // Remove from the order array
      const newOrder = state.indicatorOrder.filter((orderId) => orderId !== id);

      // Clean up the pane if it was an oscillator
      if (paneIndex !== undefined && paneIndex > 0 && state.chartInstance) {
        try {
          const activePaneIndices = new Set(Array.from(newPaneAssignments.values()));
          cleanUpUnusedPanes(state.chartInstance, activePaneIndices, state.createdPanes);
        } catch (error) {
          console.error("Error cleaning up panes:", error);
        }
      }

      console.log(`Removed indicator ${id}, remaining indicators: ${newIndicators.size}`);

      return {
        indicators: newIndicators,
        indicatorOrder: newOrder,
        paneAssignments: newPaneAssignments,
        oscillatorPanes: newOscillatorPanes,
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

  setChartInstance: (chart: ChartApiWithPanes | null, mainSeries: ISeriesApi<"Candlestick"> | null = null) => {
    const { indicators } = get();

    console.log(`=== INDICATOR STORE: SET CHART INSTANCE START ===`);
    console.log(`Chart instance ${chart ? "provided" : "null"}`);
    console.log(`Main series ${mainSeries ? "provided" : "null"}`);

    // If we're clearing the chart
    if (!chart) {
      // Clean up all indicators
      indicators.forEach((indicator) => {
        try {
          indicator.destroy();
        } catch (error) {
          console.error(`INDICATOR STORE: Error destroying indicator during chart reset:`, error);
        }
      });

      // Reset state
      set({
        chartInstance: null,
        mainSeries: null,
        createdPanes: {},
        oscillatorPanes: {},
      });
      return;
    }

    // We have a new chart instance
    set({ chartInstance: chart, mainSeries });

    // Initialize overlay indicators first (in main pane)
    Array.from(indicators.values()).forEach((indicator) => {
      const type = indicator.getType();
      const isOverlay = isOverlayIndicator(type);

      if (isOverlay) {
        try {
          console.log(`Initializing overlay indicator: ${indicator.getName()} in main pane`);
          indicator.initialize(chart, {
            id: indicator.getId(),
            type: indicator.getType(),
            name: indicator.getName(),
            color: indicator.getConfig().color,
            visible: indicator.isVisible(),
            parameters: {
              paneIndex: 0,
              priceScaleId: "left",
            },
          });
          indicator.createSeries(0);

          // Update data if we have the main series
          if (mainSeries) {
            const data = mainSeries.data();
            if (data && data.length > 0) {
              const formattedData = data.map((d) => {
                const candleData = d as CandlestickData<Time>;
                return {
                  time: candleData.time,
                  open: candleData.open,
                  high: candleData.high,
                  low: candleData.low,
                  close: candleData.close,
                  value: 0,
                };
              });
              indicator.updateData(formattedData);
            }
          }
        } catch (error) {
          console.error(`INDICATOR STORE: Error initializing overlay indicator ${indicator.getId()}:`, error);
        }
      }
    });

    // Then initialize oscillators in separate panes
    Array.from(indicators.values()).forEach((indicator) => {
      const type = indicator.getType();
      const isOscillator = OSCILLATOR_INDICATORS.includes(type);

      if (isOscillator) {
        try {
          console.log(`Initializing oscillator: ${indicator.getName()} in pane 1`);
          indicator.initialize(chart, {
            id: indicator.getId(),
            type: indicator.getType(),
            name: indicator.getName(),
            color: indicator.getConfig().color,
            visible: indicator.isVisible(),
            parameters: { paneIndex: 1 },
          });
          indicator.createSeries(1);

          // Update oscillatorPanes map
          set((state) => ({
            oscillatorPanes: { ...state.oscillatorPanes, [indicator.getId()]: 1 },
          }));

          // Update data if we have the main series
          if (mainSeries) {
            const data = mainSeries.data();
            if (data && data.length > 0) {
              const formattedData = data.map((d) => {
                const candleData = d as CandlestickData<Time>;
                return {
                  time: candleData.time,
                  open: candleData.open,
                  high: candleData.high,
                  low: candleData.low,
                  close: candleData.close,
                  value: 0,
                };
              });
              indicator.updateData(formattedData);
            }
          }
        } catch (error) {
          console.error(`INDICATOR STORE: Error initializing oscillator ${indicator.getId()}:`, error);
        }
      }
    });

    // Update the store with the cleaned up indicators
    set({ indicators: new Map(indicators) });
    console.log(`=== INDICATOR STORE: SET CHART INSTANCE END ===`);
  },

  updateData: (candles: FormattedCandle[]) => {
    const { indicators } = get();

    if (candles.length === 0) {
      console.warn(`INDICATOR STORE: Cannot update indicators with empty candles`);
      return;
    }

    console.log(`INDICATOR STORE: Updating ${indicators.size} indicators with ${candles.length} candles`);

    // Update all indicators with the new data
    indicators.forEach((indicator) => {
      try {
        console.log(`INDICATOR STORE: Updating indicator ${indicator.getType()} (${indicator.getId()})`);
        indicator.updateData(candles);
        console.log(`INDICATOR STORE: Successfully updated indicator ${indicator.getType()}`);
      } catch (error) {
        console.error(`INDICATOR STORE: Error updating indicator data:`, error);
      }
    });

    // Force a chart update to ensure indicators are rendered
    const { chartInstance } = get();
    if (chartInstance) {
      console.log(`INDICATOR STORE: Forcing chart update to ensure indicators are rendered`);
      // This will trigger a redraw of the chart
      chartInstance.timeScale().fitContent();
    }
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
});

type IndicatorPersist = (config: StateCreator<IndicatorState>, options: PersistOptions<IndicatorState>) => StateCreator<IndicatorState>;

// Create the store with persistence
export const useIndicatorStore = create<IndicatorState>(
  (persist as IndicatorPersist)(createBaseStore, {
    name: "indicator-store",
    storage: {
      getItem: (name: string) => {
        try {
          const value = localStorage.getItem(name);
          if (!value) return null;
          return JSON.parse(value);
        } catch (e) {
          console.error(`Error retrieving ${name} from localStorage:`, e);
          return null;
        }
      },
      setItem: (name: string, value: unknown) => {
        try {
          if (typeof window === "undefined") {
            return;
          }

          const state = (value as { state?: IndicatorState }).state;
          if (!state) {
            localStorage.setItem(name, JSON.stringify(value));
            return;
          }

          // Create a serializable version of the state
          const serializableState = {
            state: {
              indicators: Array.from(state.indicators.entries()).map(([id, indicator]) => ({
                id,
                type: indicator.getType(),
                name: indicator.getName(),
                parameters: indicator.getConfig().parameters,
                color: indicator.getConfig().color,
                visible: indicator.isVisible(),
              })),
              indicatorOrder: state.indicatorOrder || [],
              chartInstance: null, // Don't persist chart instance
              oscillatorPanes: state.oscillatorPanes || {},
              createdPanes: state.createdPanes || {},
              paneAssignments: Array.from(state.paneAssignments.entries()),
              mainSeries: null, // Don't persist main series
            },
            version: (value as { version?: number }).version,
          };

          localStorage.setItem(name, JSON.stringify(serializableState));
        } catch (e) {
          console.error(`Error storing ${name} in localStorage:`, e);
        }
      },
      removeItem: (name: string) => {
        if (typeof window === "undefined") {
          return;
        }
        localStorage.removeItem(name);
      },
    },
    skipHydration: true,
  })
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
