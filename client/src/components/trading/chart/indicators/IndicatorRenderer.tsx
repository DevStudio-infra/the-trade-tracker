"use client";

import { useEffect, useRef, useCallback } from "react";
import { LineSeries, SeriesType, IPaneApi, HistogramSeries } from "lightweight-charts";
import { ChartInstanceRef, IndicatorConfig, FormattedCandle, indicatorDefaults } from "../utils/chartTypes";
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateATR } from "../utils/indicatorCalculations";

// For type safety, import IChartApi
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";

// Define extended indicator type with additional series properties
interface ExtendedBollingerBandsIndicator extends IndicatorConfig {
  upperSeries?: ISeriesApi<SeriesType> | null;
  lowerSeries?: ISeriesApi<SeriesType> | null;
}

// Define v5-specific methods as a separate interface
interface V5Methods {
  panes: () => IPaneApi<Time>[];
  createPane: (options: { height: number }) => IPaneApi<Time>;
  removePane: (index: number) => void;
}

// Define v4-specific methods
interface V4Methods {
  addLineSeries: (options: Record<string, unknown>) => ISeriesApi<SeriesType>;
}

// Combined chart API type for handling both versions
type ChartApi = IChartApi & Partial<V5Methods> & Partial<V4Methods>;

interface IndicatorRendererProps {
  chartInstance: ChartInstanceRef | null;
  indicators: IndicatorConfig[];
  formattedCandles: FormattedCandle[];
  onIndicatorUpdated: (updatedIndicator: IndicatorConfig) => void;
}

/**
 * Component responsible for calculating and rendering indicators on the chart
 */
export function IndicatorRenderer({ chartInstance, indicators, formattedCandles, onIndicatorUpdated }: IndicatorRendererProps) {
  // Reference to track indicators for cleanup
  const prevIndicatorsRef = useRef<Record<string, IndicatorConfig>>({});
  // Reference to track created panes
  const panesRef = useRef<Record<number, boolean>>({ 0: true, 1: true }); // 0: main pane, 1: volume pane (already created)
  // Track oscillator type indicators to ensure they don't overlap
  const oscillatorPanesRef = useRef<Record<string, number>>({});

  // Helper function to get the next available pane index for oscillators
  const getNextAvailablePaneIndex = useCallback(() => {
    // Start from pane 2 (after main and volume panes)
    let nextPaneIndex = 2;

    // Find all used pane indices (including those for current indicators)
    const usedPanes = new Set<number>();

    // Add all currently tracked oscillator panes
    Object.values(oscillatorPanesRef.current).forEach((paneIndex) => {
      usedPanes.add(paneIndex);
    });

    // Find the next unused pane index
    while (usedPanes.has(nextPaneIndex)) {
      nextPaneIndex++;
    }

    console.log(
      `INDICATOR DEBUG: getNextAvailablePaneIndex: returning ${nextPaneIndex}, current oscillator panes:`,
      JSON.stringify(oscillatorPanesRef.current),
      "used panes:",
      Array.from(usedPanes).sort().join(", ")
    );

    return nextPaneIndex;
  }, []);

  // Add function to create a pane if it doesn't exist
  const ensurePaneExists = useCallback((paneIndex: number, chart: ChartApi): boolean => {
    // If pane already exists in our tracking, we're good
    if (panesRef.current[paneIndex]) {
      return true;
    }

    console.log(`INDICATOR DEBUG: Ensuring pane ${paneIndex} exists`);

    try {
      // Check if we have a v5 chart with panes support
      if (chart.panes && typeof chart.panes === "function") {
        const currentPanes = chart.panes();
        console.log(`INDICATOR DEBUG: Current panes count: ${currentPanes.length}`);

        // If the pane index is beyond current panes length
        if (paneIndex >= currentPanes.length && chart.createPane) {
          // Create new panes until we reach the desired index
          for (let i = currentPanes.length; i <= paneIndex; i++) {
            console.log(`INDICATOR DEBUG: Creating pane ${i}`);

            // Create pane with appropriate height
            // RSI and MACD panes should be taller
            const paneHeight = i === 1 ? 100 : 200; // Volume pane is smaller

            chart.createPane({
              height: paneHeight,
            });
            panesRef.current[i] = true;
          }
          console.log(`INDICATOR DEBUG: Created panes up to index ${paneIndex}`);
          return true;
        } else if (paneIndex < currentPanes.length) {
          // Pane exists in the chart but not in our tracking
          panesRef.current[paneIndex] = true;

          // Ensure the pane has appropriate height
          if (paneIndex > 1) {
            // Not for main or volume panes
            const pane = currentPanes[paneIndex];
            // Update height if it's too small
            if (pane && typeof pane.setHeight === "function") {
              pane.setHeight(200);
              console.log(`INDICATOR DEBUG: Updated height for pane ${paneIndex}`);
            }
          }

          return true;
        }
      } else {
        console.warn("INDICATOR DEBUG: Panes API not available - using v4 compatibility mode");
        return false;
      }
    } catch (error) {
      console.error(`INDICATOR DEBUG: Error ensuring pane ${paneIndex} exists:`, error);
      console.debug(`INDICATOR DEBUG: Error details: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    }

    return false;
  }, []);

  // Apply indicators to chart when they change
  useEffect(() => {
    if (!chartInstance?.chart || formattedCandles.length === 0) return;

    try {
      const chart = chartInstance.chart; // Create local reference to avoid null checks
      // Cast to API type that can handle both v4 and v5 methods
      const chartApi = chart as ChartApi;

      console.log("INDICATOR DEBUG: Starting indicator rendering with:", {
        indicatorCount: indicators.length,
        oscillatorPanes: oscillatorPanesRef.current,
        existingPanes: panesRef.current,
      });

      // First pass: determine panes for all indicators
      indicators.forEach((indicator) => {
        console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Processing indicator`, {
          id: indicator.id,
          type: indicator.type,
          name: indicator.name,
          hasSeries: !!indicator.series,
          existingPaneIndex: indicator.paneIndex,
          paramPaneIndex: indicator.parameters.paneIndex,
        });

        // Skip if indicator already has a series/pane assigned
        if (indicator.series) {
          console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Skipping first pass as series exists`);
          return;
        }

        const defaultPane = indicatorDefaults[indicator.type].defaultPane || 0;
        console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Default pane from configuration: ${defaultPane}`);

        // For oscillator indicators that need their own pane (RSI, MACD, Stochastic)
        if ((indicator.type === "rsi" || indicator.type === "macd" || indicator.type === "stochastic") && defaultPane > 1) {
          // Generate a unique key for this indicator instance
          const indicatorKey = `${indicator.type}-${indicator.id}`;

          // If this specific indicator instance doesn't have a pane assigned yet
          if (!oscillatorPanesRef.current[indicatorKey]) {
            // Get the next available pane index
            const nextPaneIndex = getNextAvailablePaneIndex();
            // Assign this pane to this indicator
            oscillatorPanesRef.current[indicatorKey] = nextPaneIndex;
            // Store the selected pane in the indicator parameters
            indicator.parameters.paneIndex = nextPaneIndex;

            // Always make sure to mark this pane as existing
            panesRef.current[nextPaneIndex] = true;

            // Make sure the chart actually has this pane
            ensurePaneExists(nextPaneIndex, chartApi);

            console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Assigned new pane ${nextPaneIndex} to ${indicatorKey}`);
          } else {
            console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using existing pane ${oscillatorPanesRef.current[indicatorKey]} for ${indicatorKey}`);
            indicator.parameters.paneIndex = oscillatorPanesRef.current[indicatorKey];

            // Ensure this pane is marked as existing
            panesRef.current[oscillatorPanesRef.current[indicatorKey]] = true;

            // Make sure the chart actually has this pane
            ensurePaneExists(oscillatorPanesRef.current[indicatorKey], chartApi);
          }
        } else {
          console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using standard pane ${defaultPane} (not an oscillator or using main pane)`);
          indicator.parameters.paneIndex = defaultPane;
        }
      });

      // Debug dump of all pane assignments
      const paneAssignments = indicators.map((ind) => ({
        id: ind.id,
        type: ind.type,
        name: ind.name,
        paneIndex: ind.parameters.paneIndex,
      }));
      console.log("INDICATOR DEBUG: All indicator pane assignments:", paneAssignments);

      // Now ensure all required panes exist
      const maxPaneIndex = Math.max(
        2, // At minimum we need 2 (main and volume)
        ...Object.values(oscillatorPanesRef.current),
        ...indicators.map((ind) => (ind.parameters.paneIndex as number) || 0)
      );
      console.log(`INDICATOR DEBUG: Max pane index needed: ${maxPaneIndex}`);

      // Create any missing panes
      for (let i = 2; i <= maxPaneIndex; i++) {
        if (!panesRef.current[i]) {
          console.log(`INDICATOR DEBUG: Pane ${i} doesn't exist yet, creating it`);
          try {
            // Check if we have a v5 chart with panes support
            if (chartApi.panes && typeof chartApi.panes === "function") {
              const currentPanes = chartApi.panes();
              console.log(`INDICATOR DEBUG: Current panes count: ${currentPanes.length}`);

              if (i >= currentPanes.length && chartApi.createPane) {
                // Create a new pane
                console.log(`INDICATOR DEBUG: About to create pane ${i}`);
                chartApi.createPane({
                  height: 150, // Default height for indicator panes
                });
                console.log(`INDICATOR DEBUG: Created new pane at index ${i}`);
                panesRef.current[i] = true;
              } else {
                console.log(`INDICATOR DEBUG: Pane ${i} either already exists or createPane is not available`);
              }
            } else {
              console.warn("INDICATOR DEBUG: Panes API not available - using v4 compatibility mode");
            }
          } catch (error) {
            console.error("INDICATOR DEBUG: Error creating pane:", error);
          }
        } else {
          console.log(`INDICATOR DEBUG: Pane ${i} already exists, skipping creation`);
        }
      }

      // Process indicators one by one to create series
      indicators.forEach((indicator) => {
        // Skip if the chart is no longer available
        if (!chart) {
          console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Chart is no longer available, skipping`);
          return;
        }

        // Get the correct pane index for this indicator
        let paneIndex: number;

        if (indicator.type === "rsi" || indicator.type === "macd" || indicator.type === "stochastic") {
          // For oscillators, get the assigned pane from our tracking
          const indicatorKey = `${indicator.type}-${indicator.id}`;
          paneIndex = oscillatorPanesRef.current[indicatorKey] || (indicator.parameters.paneIndex as number) || indicatorDefaults[indicator.type].defaultPane || 0;
          console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using oscillator pane ${paneIndex} for ${indicatorKey}`);
        } else {
          // For other indicators, use the default or previously assigned pane
          paneIndex = indicator.parameters.paneIndex !== undefined ? (indicator.parameters.paneIndex as number) : indicatorDefaults[indicator.type].defaultPane || 0;
          console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using standard pane ${paneIndex}`);
        }

        // If this indicator already has a series attached, use it
        // Otherwise create a new one
        if (!indicator.series) {
          console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: No series exists yet, creating in pane ${paneIndex}`);

          // Create different types of series based on indicator type
          switch (indicator.type) {
            case "sma":
            case "ema":
              let lineSeries;
              try {
                // Try using v5 API first
                if (typeof chart.addSeries === "function") {
                  // Create a line series for moving averages with v5 API
                  lineSeries = chart.addSeries(
                    LineSeries,
                    {
                      color: indicator.color,
                      lineWidth: 2,
                      priceLineVisible: false,
                      lastValueVisible: true,
                      crosshairMarkerVisible: true,
                      title: `${indicator.type.toUpperCase()} (${indicator.parameters.period})`,
                    },
                    paneIndex
                  );
                } else {
                  // For v4 API compatibility, check if the v4 method exists
                  if (chartApi.addLineSeries) {
                    lineSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: 2,
                      priceLineVisible: false,
                      lastValueVisible: true,
                      crosshairMarkerVisible: true,
                      title: `${indicator.type.toUpperCase()} (${indicator.parameters.period})`,
                    });
                  } else {
                    throw new Error("Neither addSeries nor addLineSeries methods are available");
                  }
                }
              } catch (error) {
                console.error("Error adding line series:", error);
                // Fall back to v4 API with explicit cast
                try {
                  if (chartApi.addLineSeries) {
                    lineSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: 2,
                      priceLineVisible: false,
                      lastValueVisible: true,
                      crosshairMarkerVisible: true,
                      title: `${indicator.type.toUpperCase()} (${indicator.parameters.period})`,
                    });
                  } else {
                    throw new Error("Could not add series after fallback");
                  }
                } catch (fallbackError) {
                  console.error("Failed to add series with fallback method:", fallbackError);
                  return; // Skip this indicator if we can't add a series
                }
              }

              // Add to the indicator object for future reference
              indicator.series = lineSeries;
              indicator.paneIndex = paneIndex;
              // Store the pane index in parameters for persistence
              indicator.parameters.paneIndex = paneIndex;
              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: lineSeries, paneIndex });
              break;

            case "rsi":
              console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Creating RSI series in pane ${paneIndex}`);
              // RSI appears in its own pane
              let rsiSeries;
              try {
                // Try using v5 API first
                if (typeof chart.addSeries === "function") {
                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using chart.addSeries (v5) for RSI`);

                  // Double-check pane exists
                  if (!ensurePaneExists(paneIndex, chartApi)) {
                    console.error(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Could not create or verify pane ${paneIndex}`);
                  }

                  rsiSeries = chart.addSeries(
                    LineSeries,
                    {
                      color: indicator.color,
                      lineWidth: 2,
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 2,
                        minMove: 0.01,
                      },
                      title: `RSI (${indicator.parameters.period})`,
                    },
                    paneIndex // Use the dynamically assigned pane
                  );

                  // Apply explicit scale options to RSI series for better visualization
                  if (rsiSeries && typeof rsiSeries.priceScale === "function") {
                    rsiSeries.priceScale().applyOptions({
                      autoScale: true,
                      scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                      },
                      mode: 0, // Normal mode
                      entireTextOnly: true,
                      // Use autoscaleInfoProvider instead of fixed min/max values
                      // This is the recommended way to set fixed scale bounds in v5
                    });

                    // Set a fixed scale range for RSI (0-100)
                    rsiSeries.applyOptions({
                      autoscaleInfoProvider: () => ({
                        priceRange: {
                          minValue: 0,
                          maxValue: 100,
                        },
                        margins: {
                          above: 10,
                          below: 10,
                        },
                      }),
                    });
                  }

                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: RSI series created successfully with v5 API`);
                } else {
                  // For v4 API compatibility
                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using chartApi.addLineSeries (v4) for RSI`);
                  if (chartApi.addLineSeries) {
                    rsiSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: 2,
                      priceScaleId: "rsi",
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 2,
                        minMove: 0.01,
                      },
                      title: `RSI (${indicator.parameters.period})`,
                    });

                    // Configure the panel for RSI in v4
                    rsiSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                      },
                      borderVisible: true,
                      borderColor: "#2B2B43",
                      visible: true,
                      // Set mode instead of using minValue/maxValue
                      autoScale: false,
                      // Using fixed range (0-100) by setting mode
                      mode: 0, // Normal mode
                    });

                    // For v4, we can't use autoscaleInfoProvider, but we can apply fixed scale
                    try {
                      // @ts-expect-error - Some v4 versions support this
                      rsiSeries.priceScale().setRange({
                        from: 0,
                        to: 100,
                      });
                    } catch (error) {
                      console.log(`INDICATOR DEBUG [${indicator.type}-${(indicator.id, error)}]: Could not set fixed range for RSI in v4`);
                    }
                  } else {
                    throw new Error("Neither addSeries nor addLineSeries methods are available");
                  }
                }
              } catch (error) {
                console.error(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Error creating RSI series:`, error);
                // Fallback to v4 API with specific cast
                try {
                  if (chartApi.addLineSeries) {
                    rsiSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: 2,
                      priceScaleId: "rsi",
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 2,
                        minMove: 0.01,
                      },
                      title: `RSI (${indicator.parameters.period})`,
                    });

                    // Configure the panel for RSI in v4
                    rsiSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                      },
                      borderVisible: true,
                      borderColor: "#2B2B43",
                      visible: true,
                      // Set mode instead of using minValue/maxValue
                      autoScale: false,
                      // Using fixed range (0-100) by setting mode
                      mode: 0, // Normal mode
                    });

                    // For v4, we can't use autoscaleInfoProvider, but we can apply fixed scale
                    try {
                      // @ts-expect-error - Some v4 versions support this
                      rsiSeries.priceScale().setRange({
                        from: 0,
                        to: 100,
                      });
                    } catch (error) {
                      console.log(`INDICATOR DEBUG [${indicator.type}-${(indicator.id, error)}]: Could not set fixed range for RSI in v4`);
                    }
                  } else {
                    throw new Error("Could not add RSI series after fallback");
                  }
                } catch (fallbackError) {
                  console.error("Failed to add RSI series with fallback method:", fallbackError);
                  return; // Skip this indicator if we can't add a series
                }
              }

              indicator.series = rsiSeries;
              indicator.paneIndex = paneIndex;
              // Store the pane index in parameters for persistence
              indicator.parameters.paneIndex = paneIndex;
              console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Final RSI setup:`, {
                seriesCreated: !!indicator.series,
                assignedPane: indicator.paneIndex,
                storedInParams: indicator.parameters.paneIndex,
              });

              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: rsiSeries, paneIndex });
              break;

            case "macd":
              console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Special case handling for MACD`);
              // MACD appears in its own separate pane with just the histogram
              let histogramSeries;

              try {
                // Get colors from parameters or use defaults
                const histogramPositiveColor = indicator.parameters.histogramColorPositive || "#26A69A";
                const histogramNegativeColor = indicator.parameters.histogramColorNegative || "#EF5350";

                // Use a fixed pane for MACD histogram
                const macdPaneIndex = 2; // Fixed to pane 2

                // Store this fixed index for tracking
                const indicatorKey = `macd-${indicator.id}`;
                oscillatorPanesRef.current[indicatorKey] = macdPaneIndex;

                console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using fixed pane ${macdPaneIndex} for MACD histogram ${indicator.id}`);

                // Double-check pane exists
                if (!panesRef.current[macdPaneIndex]) {
                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: MACD pane ${macdPaneIndex} doesn't exist yet, creating it`);

                  // Use the ensurePaneExists helper which handles type casting properly
                  ensurePaneExists(macdPaneIndex, chartApi);
                  panesRef.current[macdPaneIndex] = true;
                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Created MACD pane ${macdPaneIndex}`);
                }

                if (typeof chart.addSeries === "function") {
                  // Use v5 API for histogram only
                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Creating Histogram series with v5 API in pane ${macdPaneIndex}`);
                  histogramSeries = chart.addSeries(
                    HistogramSeries,
                    {
                      color: histogramPositiveColor,
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 4,
                        minMove: 0.0001,
                      },
                      title: `MACD (${indicator.parameters.fastPeriod || 12},${indicator.parameters.slowPeriod || 26},${indicator.parameters.signalPeriod || 9})`,
                    },
                    macdPaneIndex
                  );

                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Created Histogram series successfully`);
                } else {
                  // For v4 API compatibility
                  console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Using v4 API for MACD histogram`);
                  if (chartApi.addLineSeries) {
                    // @ts-expect-error - using v4 method
                    histogramSeries = chartApi.addHistogramSeries({
                      color: histogramPositiveColor,
                      priceScaleId: "macd",
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 4,
                        minMove: 0.0001,
                      },
                      title: `MACD (${indicator.parameters.fastPeriod || 12},${indicator.parameters.slowPeriod || 26},${indicator.parameters.signalPeriod || 9})`,
                    });

                    // Configure the panel for MACD in v4
                    histogramSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                      },
                      borderVisible: true,
                      borderColor: "#2B2B43",
                      visible: true,
                      autoScale: true,
                    });
                  } else {
                    throw new Error("Neither addSeries nor addLineSeries methods are available");
                  }
                }

                // Store histogram series as the main series for this indicator
                indicator.series = histogramSeries;
                indicator.paneIndex = macdPaneIndex;
                // Store the pane index in parameters for persistence
                indicator.parameters.paneIndex = macdPaneIndex;

                console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Final MACD setup:`, {
                  histogramSeriesCreated: !!histogramSeries,
                  assignedPane: indicator.paneIndex,
                  storedInParams: indicator.parameters.paneIndex,
                });

                // Set custom scale for MACD histogram
                if (histogramSeries && typeof histogramSeries.priceScale === "function") {
                  try {
                    histogramSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.2, // Give more space at the top
                        bottom: 0.2, // Give more space at the bottom
                      },
                      autoScale: true,
                      visible: true,
                      entireTextOnly: true,
                    });
                    console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Applied price scale options to MACD histogram`);
                  } catch (error) {
                    console.error(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Error applying price scale options:`, error);
                  }
                }

                // Immediately calculate and set data
                if (formattedCandles.length > 0) {
                  try {
                    console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Setting initial data for MACD histogram`);
                    // Calculate MACD data
                    const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = indicator.parameters;
                    const macdData = calculateMACD(formattedCandles, fastPeriod, slowPeriod, signalPeriod);

                    // Set data for Histogram with colors
                    if (histogramSeries && macdData.histogram.length > 0) {
                      const coloredHistogram = macdData.histogram.map((item) => ({
                        time: item.time,
                        value: item.value,
                        color: item.value >= 0 ? histogramPositiveColor : histogramNegativeColor,
                      }));

                      histogramSeries.setData(coloredHistogram);
                    }
                  } catch (error) {
                    console.error(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Error setting initial MACD data:`, error);
                  }
                }

                // Log success message
                console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: MACD histogram initialized with pane index: ${macdPaneIndex}`);

                // Notify parent about the updated indicator
                onIndicatorUpdated({
                  ...indicator,
                  series: histogramSeries,
                  paneIndex: macdPaneIndex,
                });
              } catch (error) {
                console.error(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Error adding MACD series:`, error);
              }
              break;

            case "bollinger":
              // Cast to extended type for bollinger bands
              const bollingerIndicator = indicator as ExtendedBollingerBandsIndicator;

              // Bollinger Bands calculation
              const bbResult = calculateBollingerBands(formattedCandles, indicator.parameters.period || 20, indicator.parameters.stdDev || 2);

              // Set data for all three bands
              const middleBand = bbResult.map((band) => ({
                time: band.time,
                value: band.middle,
              }));

              const upperBand = bbResult.map((band) => ({
                time: band.time,
                value: band.upper,
              }));

              const lowerBand = bbResult.map((band) => ({
                time: band.time,
                value: band.lower,
              }));

              // Make sure series exists before setting data
              if (indicator.series) {
                // Use proper type assertion for the series
                (indicator.series as unknown as ISeriesApi<SeriesType>).setData(middleBand);
              }

              // Set data for upper and lower bands if they exist
              if (bollingerIndicator.upperSeries) {
                bollingerIndicator.upperSeries.setData(upperBand);
              }

              if (bollingerIndicator.lowerSeries) {
                bollingerIndicator.lowerSeries.setData(lowerBand);
              }
              break;

            case "atr":
              try {
                // Average True Range calculation
                const atrPeriod = Number(indicator.parameters.period) || 14;
                const atrData = calculateATR(formattedCandles, atrPeriod);

                // Make sure we have a valid series
                if (indicator.series) {
                  // Use proper type assertion for the series
                  (indicator.series as unknown as ISeriesApi<SeriesType>).setData(atrData);
                }
              } catch (error) {
                console.error("Error updating ATR data:", error);
              }
              break;

            // Additional indicator types would be handled here
          }
        } else {
          console.log(`INDICATOR DEBUG [${indicator.type}-${indicator.id}]: Series already exists, skipping creation`);
        }

        // If we have a series attached to this indicator, update its data
        if (indicator.series && formattedCandles.length > 0) {
          // Calculate the indicator values based on type
          switch (indicator.type) {
            case "sma":
              // Simple Moving Average calculation
              const period = Number(indicator.parameters.period) || 20;
              const smaData = calculateSMA(formattedCandles, period);
              indicator.series.setData(smaData);
              break;

            case "ema":
              // Exponential Moving Average calculation
              const emaPeriod = Number(indicator.parameters.period) || 20;
              const emaData = calculateEMA(formattedCandles, emaPeriod);
              indicator.series.setData(emaData);
              break;

            case "rsi":
              // Relative Strength Index calculation
              const rsiPeriod = Number(indicator.parameters.period) || 14;
              const rsiData = calculateRSI(formattedCandles, rsiPeriod);
              indicator.series.setData(rsiData);
              break;

            case "macd":
              // MACD calculation - now only using histogram
              try {
                const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = indicator.parameters;
                const macdData = calculateMACD(formattedCandles, fastPeriod, slowPeriod, signalPeriod);
                const histogramPositiveColor = indicator.parameters.histogramColorPositive || "#26A69A";
                const histogramNegativeColor = indicator.parameters.histogramColorNegative || "#EF5350";

                // Only update histogram data since we're only displaying histogram now
                if (indicator.series && macdData.histogram.length > 0) {
                  // Set histogram data with colors
                  const coloredHistogram = macdData.histogram.map((item) => ({
                    time: item.time,
                    value: item.value,
                    color: item.value >= 0 ? histogramPositiveColor : histogramNegativeColor,
                  }));

                  // Use proper type assertion for the series
                  (indicator.series as unknown as ISeriesApi<SeriesType>).setData(coloredHistogram);
                }
              } catch (error) {
                console.error("Error updating MACD data:", error);
              }
              break;

            case "bollinger":
              // Cast to extended type for bollinger bands
              const bollingerIndicator = indicator as ExtendedBollingerBandsIndicator;

              // Bollinger Bands calculation
              const bbResult = calculateBollingerBands(formattedCandles, indicator.parameters.period || 20, indicator.parameters.stdDev || 2);

              // Set data for all three bands
              const middleBand = bbResult.map((band) => ({
                time: band.time,
                value: band.middle,
              }));

              const upperBand = bbResult.map((band) => ({
                time: band.time,
                value: band.upper,
              }));

              const lowerBand = bbResult.map((band) => ({
                time: band.time,
                value: band.lower,
              }));

              indicator.series.setData(middleBand);

              // Set data for upper and lower bands if they exist
              if (bollingerIndicator.upperSeries) {
                bollingerIndicator.upperSeries.setData(upperBand);
              }

              if (bollingerIndicator.lowerSeries) {
                bollingerIndicator.lowerSeries.setData(lowerBand);
              }
              break;

            case "atr":
              try {
                // Average True Range calculation
                const atrPeriod = Number(indicator.parameters.period) || 14;
                const atrData = calculateATR(formattedCandles, atrPeriod);

                // Make sure we have a valid series
                if (indicator.series) {
                  // Use proper type assertion for the series
                  (indicator.series as unknown as ISeriesApi<SeriesType>).setData(atrData);
                }
              } catch (error) {
                console.error("Error updating ATR data:", error);
              }
              break;

            // Additional indicators would be calculated and rendered here
          }
        }
      });

      // Log final state
      console.log("INDICATOR DEBUG: Final state after processing all indicators:", {
        oscillatorPanes: { ...oscillatorPanesRef.current },
        existingPanes: { ...panesRef.current },
      });

      // Store current indicators in ref for cleanup
      indicators.forEach((indicator) => {
        prevIndicatorsRef.current[indicator.id] = indicator;
      });
    } catch (error) {
      console.error("Error applying indicators:", error);
    }
  }, [chartInstance, indicators, formattedCandles, onIndicatorUpdated, getNextAvailablePaneIndex, ensurePaneExists]);

  // Clean up indicators when they are removed
  useEffect(() => {
    if (!chartInstance?.chart) return;
    const chart = chartInstance.chart; // Create a local reference to avoid null checks
    // Cast to combined API type
    const chartApi = chart as ChartApi;

    // Clean up any removed indicators
    const indicatorIds = indicators.map((i) => i.id);
    const storedIds = Object.keys(prevIndicatorsRef.current);

    // Track which panes are still in use after cleanup
    const activePaneIndices = new Set<number>();
    // Add default panes (0 and 1)
    activePaneIndices.add(0);
    activePaneIndices.add(1);

    // First, build a map of which panes are used by active indicators
    indicators.forEach((indicator) => {
      const paneIndex = indicator.paneIndex || (indicator.parameters.paneIndex as number) || 0;
      if (paneIndex !== undefined) {
        activePaneIndices.add(paneIndex);
        console.log(`CLEANUP DEBUG: Active indicator ${indicator.type}-${indicator.id} is using pane ${paneIndex}`);
      }

      // If it's an oscillator type, make sure to maintain its tracking
      if (indicator.type === "rsi" || indicator.type === "macd" || indicator.type === "stochastic") {
        const indicatorKey = `${indicator.type}-${indicator.id}`;
        if (indicator.paneIndex || indicator.parameters.paneIndex) {
          oscillatorPanesRef.current[indicatorKey] = paneIndex;
        }
      }
    });

    // First, let's clean up any stray MACD lines or signals that might be in separate panes
    try {
      // Only do this if we have the panes API available
      if (chartApi.panes && typeof chartApi.panes === "function") {
        const panes = chartApi.panes();
        // Check each pane for MACD-related series
        for (let i = 2; i < panes.length; i++) {
          // Start from pane 2 (after main and volume)
          if (typeof panes[i].getSeries === "function") {
            const series = panes[i].getSeries();
            for (let j = 0; j < series.length; j++) {
              const s = series[j];
              // Check if this is an MACD-related series based on title
              if (s && typeof s.options === "function") {
                const opts = s.options();
                const title = opts.title;
                if (title && (title.includes("MACD") || title === "Signal")) {
                  const stillInUse = indicators.some((ind) => ind.type === "macd" && ind.series === s);

                  if (!stillInUse) {
                    console.log(`CLEANUP DEBUG: Removing stray MACD series with title "${title}" from pane ${i}`);
                    chart.removeSeries(s);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("CLEANUP DEBUG: Error cleaning up stray MACD series:", error);
    }

    // Now proceed with the normal cleanup process
    storedIds.forEach((id) => {
      // If an indicator is no longer in the list, remove its series from the chart
      if (!indicatorIds.includes(id)) {
        const indicator = prevIndicatorsRef.current[id];

        console.log(`CLEANUP DEBUG: Removing indicator ${id} of type ${indicator.type}`);

        try {
          // Remove main series
          if (indicator.series) {
            console.log(`CLEANUP DEBUG: Removing main series for ${indicator.type}-${indicator.id}`);
            // chart.removeSeries() will handle removal properly
            chart.removeSeries(indicator.series);
          } else {
            console.log(`CLEANUP DEBUG: No main series found for ${indicator.type}-${indicator.id}`);
          }

          // Remove additional series if any (like for Bollinger Bands)
          if (indicator.type === "bollinger") {
            const bollingerIndicator = indicator as ExtendedBollingerBandsIndicator;
            if (bollingerIndicator.upperSeries) {
              console.log(`CLEANUP DEBUG: Removing upper band series for Bollinger`);
              chart.removeSeries(bollingerIndicator.upperSeries);
            }

            if (bollingerIndicator.lowerSeries) {
              console.log(`CLEANUP DEBUG: Removing lower band series for Bollinger`);
              chart.removeSeries(bollingerIndicator.lowerSeries);
            }
          }

          // For MACD, be more aggressive about cleaning up ALL related series
          if (indicator.type === "macd") {
            console.log(`CLEANUP DEBUG: Performing deep cleanup for MACD indicator ${indicator.id}`);

            try {
              // First remove all series that were explicitly stored
              if (indicator.series) {
                chart.removeSeries(indicator.series);
              }

              // Check for any additional series in params
              if (indicator.parameters.additionalSeries) {
                const { signalSeries, histogramSeries } = indicator.parameters.additionalSeries;
                if (signalSeries) chart.removeSeries(signalSeries);
                if (histogramSeries) chart.removeSeries(histogramSeries);
              }

              // Check all panes for any series with MACD or Signal in the title
              if (chartApi.panes && typeof chartApi.panes === "function") {
                const panes = chartApi.panes();

                // Track which panes to remove afterward
                const panesToRemove = new Set<number>();

                // First pass: find and remove MACD-related series and track their panes
                for (let i = 2; i < panes.length; i++) {
                  if (typeof panes[i].getSeries === "function") {
                    const seriesInPane = panes[i].getSeries();
                    let foundMACDInThisPane = false;

                    for (let j = 0; j < seriesInPane.length; j++) {
                      const s = seriesInPane[j];
                      if (s && typeof s.options === "function") {
                        const opts = s.options();
                        const title = opts.title;
                        if (title && (title.includes("MACD") || title === "Signal")) {
                          // This might be part of our MACD indicator, remove it
                          chart.removeSeries(s);
                          foundMACDInThisPane = true;
                        }
                      }
                    }

                    // If we found and removed MACD series from this pane,
                    // mark the pane for possible removal
                    if (foundMACDInThisPane) {
                      panesToRemove.add(i);
                    }
                  }
                }

                // Second pass: remove empty panes that contained MACD series
                // Go backwards to avoid index issues when removing panes
                for (const paneIndex of Array.from(panesToRemove).sort((a, b) => b - a)) {
                  if (paneIndex > 1 && chartApi.panes) {
                    const panes = chartApi.panes();
                    if (paneIndex < panes.length && typeof panes[paneIndex].getSeries === "function" && panes[paneIndex].getSeries().length === 0 && chartApi.removePane) {
                      console.log(`CLEANUP DEBUG: Removing empty MACD pane at index ${paneIndex}`);
                      chartApi.removePane(paneIndex);
                      delete panesRef.current[paneIndex];
                    }
                  }
                }
              }

              // Cleanup the oscillator tracking
              const indicatorKey = `macd-${indicator.id}`;
              if (oscillatorPanesRef.current[indicatorKey]) {
                delete oscillatorPanesRef.current[indicatorKey];
              }
            } catch (error) {
              console.error("CLEANUP DEBUG: Error during deep MACD cleanup:", error);
            }
          } else {
            // Continue with normal cleanup for other indicator types
            // Clean up MACD additional series if present
            if (indicator.parameters.additionalSeries) {
              console.log(`CLEANUP DEBUG: Cleaning up additional series`);

              if (indicator.parameters.additionalSeries.signalSeries) {
                console.log(`CLEANUP DEBUG: Removing signal series for MACD`);
                chart.removeSeries(indicator.parameters.additionalSeries.signalSeries);
              }

              if (indicator.parameters.additionalSeries.histogramSeries) {
                console.log(`CLEANUP DEBUG: Removing histogram series for MACD`);
                chart.removeSeries(indicator.parameters.additionalSeries.histogramSeries);
              }
            }

            // Clean up oscillator pane tracking
            if (indicator.type === "rsi" || indicator.type === "stochastic") {
              const indicatorKey = `${indicator.type}-${indicator.id}`;
              // Remove from oscillator panes tracking
              if (oscillatorPanesRef.current[indicatorKey]) {
                const removedPane = oscillatorPanesRef.current[indicatorKey];
                console.log(`CLEANUP DEBUG: Removing pane tracking for ${indicatorKey}, was using pane ${removedPane}`);

                // Check if any other indicators are using this pane
                let otherIndicatorsUsingThisPane = false;
                Object.entries(oscillatorPanesRef.current).forEach(([key, pane]) => {
                  if (key !== indicatorKey && pane === removedPane) {
                    otherIndicatorsUsingThisPane = true;
                    console.log(`CLEANUP DEBUG: Not removing pane ${removedPane} because it's still used by ${key}`);
                  }
                });

                // Only remove from active panes if no other indicators are using it
                if (!otherIndicatorsUsingThisPane) {
                  console.log(`CLEANUP DEBUG: Pane ${removedPane} is no longer in use by any indicators`);
                  // Remove from active panes tracking only if it's not being used by any active indicators
                  if (!activePaneIndices.has(removedPane)) {
                    console.log(`CLEANUP DEBUG: Removing pane ${removedPane} from tracking`);
                    delete panesRef.current[removedPane];
                  }
                }

                // Always remove the oscillator tracking for this specific indicator
                delete oscillatorPanesRef.current[indicatorKey];
              } else {
                console.log(`CLEANUP DEBUG: No pane tracking found for ${indicatorKey}`);
              }
            }
          }

          // Remove from tracking ref
          delete prevIndicatorsRef.current[id];
          console.log(`CLEANUP DEBUG: Successfully removed indicator ${id}`);
        } catch (error) {
          console.error(`CLEANUP DEBUG: Error removing indicator ${id}:`, error);
        }
      }
    });

    // Clean up empty panes
    try {
      // Check if we have v5 panes API
      if (chartApi.panes && typeof chartApi.panes === "function") {
        // Get all panes
        const panes = chartApi.panes();
        console.log(`CLEANUP DEBUG: Found ${panes.length} panes in the chart, active panes:`, Array.from(activePaneIndices).sort().join(", "));

        // Clean up panes from highest to lowest index (except 0 and 1)
        for (let i = panes.length - 1; i > 1; i--) {
          const pane = panes[i];

          // If this pane is not in active use, remove it
          if (!activePaneIndices.has(i) && typeof pane.getSeries === "function") {
            const series = pane.getSeries();
            console.log(`CLEANUP DEBUG: Pane ${i} has ${series.length} series, active=${activePaneIndices.has(i)}`);

            // Double-check: If the pane is empty and we can remove it, do so
            if (series.length === 0 && chartApi.removePane) {
              console.log(`CLEANUP DEBUG: About to remove empty pane ${i}`);
              chartApi.removePane(i);
              delete panesRef.current[i];
              console.log(`CLEANUP DEBUG: Removed unused pane at index ${i}`);
            } else if (series.length > 0) {
              console.log(`CLEANUP DEBUG: Can't remove pane ${i} because it still has ${series.length} series`);
            } else if (!chartApi.removePane) {
              console.log(`CLEANUP DEBUG: Can't remove pane ${i} because removePane method is not available`);
            }
          } else {
            console.log(`CLEANUP DEBUG: Keeping pane ${i}, active=${activePaneIndices.has(i)}`);
          }
        }

        // Update panesRef to match reality
        for (let i = 2; i < panes.length; i++) {
          if (!activePaneIndices.has(i) && panesRef.current[i]) {
            console.log(`CLEANUP DEBUG: Removing inactive pane ${i} from tracking`);
            delete panesRef.current[i];
          }
        }
      }
    } catch (error) {
      console.error("CLEANUP DEBUG: Error cleaning up empty panes:", error);
    }

    console.log("CLEANUP DEBUG: Final state after cleanup:", {
      oscillatorPanes: { ...oscillatorPanesRef.current },
      remainingPanes: { ...panesRef.current },
      activePaneIndices: Array.from(activePaneIndices).sort().join(", "),
    });
  }, [chartInstance, indicators]);

  return null; // This is a logic-only component, no UI to render
}
