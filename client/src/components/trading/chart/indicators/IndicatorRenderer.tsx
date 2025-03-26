"use client";

import { useEffect, useRef } from "react";
import { LineSeries, SeriesType, IPaneApi } from "lightweight-charts";
import { ChartInstanceRef, IndicatorConfig, FormattedCandle, indicatorDefaults } from "../utils/chartTypes";
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateStochastic } from "../utils/indicatorCalculations";

// For type safety, import IChartApi, ISeriesApi and Time
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

// Define interfaces for extended indicators with proper types for series
interface MACDIndicator extends IndicatorConfig {
  additionalSeries?: {
    signalSeries?: ISeriesApi<"Line">;
    histogramSeries?: ISeriesApi<"Histogram"> | ISeriesApi<"Line">;
  };
}

interface StochasticIndicator extends IndicatorConfig {
  additionalSeries?: {
    dSeries?: ISeriesApi<"Line">;
  };
}

/**
 * Component responsible for calculating and rendering indicators on the chart
 */
export function IndicatorRenderer({ chartInstance, indicators, formattedCandles, onIndicatorUpdated }: IndicatorRendererProps) {
  // Reference to track indicators for cleanup
  const prevIndicatorsRef = useRef<Record<string, IndicatorConfig>>({});
  // Reference to track created panes
  const panesRef = useRef<Record<number, boolean>>({ 0: true, 1: true }); // 0: main pane, 1: volume pane (already created)
  // Reference to track which indicators are in which panes
  const paneIndicatorsRef = useRef<Record<number, string[]>>({
    0: [], // Main price pane
    1: [], // Volume pane
  });

  // Apply indicators to chart when they change
  useEffect(() => {
    if (!chartInstance?.chart || formattedCandles.length === 0) return;

    try {
      const chart = chartInstance.chart; // Create local reference to avoid null checks
      // Cast to API type that can handle both v4 and v5 methods
      const chartApi = chart as ChartApi;

      // Function to find the next available pane index for oscillators
      const findNextAvailablePaneIndex = (indicatorType: string): number => {
        // Default pane from indicator defaults
        const defaultPane = indicatorDefaults[indicatorType as keyof typeof indicatorDefaults]?.defaultPane || 0;

        // If not an oscillator type (RSI, MACD, etc.), return default pane
        if (defaultPane < 2) return defaultPane;

        // For oscillator indicators that should be in separate panes
        // Get all panes currently in use
        const usedPanes = Object.keys(paneIndicatorsRef.current).map(Number);

        // For oscillators, we'll always create a new pane to avoid overlapping
        // Find the highest pane index currently in use
        const highestPaneIndex = Math.max(...usedPanes, 1); // Start from at least pane 1 (volume)

        // Return the next available pane index
        return highestPaneIndex + 1;
      };

      // First pass: assign pane indices to indicators that need them
      const indicatorsWithPanes = indicators.map((indicator) => {
        // Skip if already has a pane assigned and the series exists
        if (indicator.paneIndex !== undefined && indicator.series) {
          return indicator;
        }

        // For oscillator indicators without a specific pane index,
        // assign to a new pane index
        const isOscillator = (indicatorDefaults[indicator.type]?.defaultPane || 0) >= 2;

        if (isOscillator && indicator.paneIndex === undefined) {
          // Find next available pane
          const nextPaneIndex = findNextAvailablePaneIndex(indicator.type);
          return { ...indicator, paneIndex: nextPaneIndex };
        }

        // For non-oscillators or indicators with an explicit pane index
        return indicator;
      });

      // Ensure necessary panes exist for indicators
      indicatorsWithPanes.forEach((indicator) => {
        const paneIndex = indicator.paneIndex !== undefined ? indicator.paneIndex : indicatorDefaults[indicator.type].defaultPane || 0;

        // Skip if pane already exists
        if (panesRef.current[paneIndex]) return;

        // Create new pane if needed
        try {
          // Check if we have a v5 chart with panes support
          if (chartApi.panes && typeof chartApi.panes === "function") {
            const currentPanes = chartApi.panes();
            if (paneIndex >= currentPanes.length && chartApi.createPane) {
              // Create a new pane and store reference
              chartApi.createPane({
                height: 150, // Default height for indicator panes
              });
              console.log(`Created new pane at index ${paneIndex}`);
              panesRef.current[paneIndex] = true;
              paneIndicatorsRef.current[paneIndex] = [];
            }
          } else {
            console.warn("Panes API not available - using v4 compatibility mode");
          }
        } catch (err) {
          console.error("Error creating pane:", err);
        }
      });

      // Process indicators one by one
      indicatorsWithPanes.forEach((indicator) => {
        // Skip if the chart is no longer available
        if (!chart) return;

        // Get the pane index for this indicator
        const paneIndex = indicator.paneIndex !== undefined ? indicator.paneIndex : indicatorDefaults[indicator.type].defaultPane || 0;

        // If this indicator already has a series attached, use it
        // Otherwise create a new one
        if (!indicator.series) {
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

              // Track this indicator in its pane
              if (!paneIndicatorsRef.current[paneIndex]) {
                paneIndicatorsRef.current[paneIndex] = [];
              }
              paneIndicatorsRef.current[paneIndex].push(indicator.id);

              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: lineSeries, paneIndex });
              break;

            case "rsi":
              // RSI appears in a separate pane
              let rsiSeries;
              try {
                // Try using v5 API first
                if (typeof chart.addSeries === "function") {
                  // Use v5 API
                  rsiSeries = chart.addSeries(
                    LineSeries,
                    {
                      color: indicator.color,
                      lineWidth: Number(indicator.parameters.period) > 10 ? 2 : 3, // Thicker line for shorter periods
                      lastValueVisible: true,
                      priceLineVisible: true, // Show price line for better visibility
                      priceFormat: {
                        type: "price",
                        precision: 2,
                        minMove: 0.01,
                      },
                      // Enhance the title to make it more distinctive
                      title: `RSI ${indicator.parameters.period}`,
                    },
                    paneIndex
                  );
                } else {
                  // For v4 API compatibility
                  if (chartApi.addLineSeries) {
                    rsiSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: Number(indicator.parameters.period) > 10 ? 2 : 3, // Thicker line for shorter periods
                      priceScaleId: `rsi-${indicator.id}`, // Use unique price scale ID
                      lastValueVisible: true,
                      priceLineVisible: true, // Show price line for better visibility
                      priceFormat: {
                        type: "price",
                        precision: 2,
                        minMove: 0.01,
                      },
                      // Enhance the title to make it more distinctive
                      title: `RSI ${indicator.parameters.period}`,
                    });

                    // Configure the panel for RSI in v4
                    rsiSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.85,
                        bottom: 0.05,
                      },
                      borderVisible: true,
                      borderColor: "#2B2B43",
                      visible: true,
                    });
                  } else {
                    throw new Error("Neither addSeries nor addLineSeries methods are available");
                  }
                }
              } catch (error) {
                console.error("Error adding RSI series:", error);
                // Fallback to v4 API with specific cast
                try {
                  if (chartApi.addLineSeries) {
                    rsiSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: Number(indicator.parameters.period) > 10 ? 2 : 3, // Thicker line for shorter periods
                      priceScaleId: `rsi-${indicator.id}`, // Use unique price scale ID
                      lastValueVisible: true,
                      priceLineVisible: true, // Show price line for better visibility
                      priceFormat: {
                        type: "price",
                        precision: 2,
                        minMove: 0.01,
                      },
                      // Enhance the title to make it more distinctive
                      title: `RSI ${indicator.parameters.period}`,
                    });

                    // Configure the panel for RSI in v4
                    rsiSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.85,
                        bottom: 0.05,
                      },
                      borderVisible: true,
                      borderColor: "#2B2B43",
                      visible: true,
                    });
                  } else {
                    throw new Error("Could not add RSI series after fallback");
                  }
                } catch (fallbackError) {
                  console.error("Failed to add RSI series with fallback method:", fallbackError);
                  return; // Skip this indicator if we can't add a series
                }
              }

              // Configure RSI price scale with fixed range (0-100)
              if (rsiSeries.priceScale) {
                rsiSeries.priceScale().applyOptions({
                  autoScale: false,
                  mode: 2, // Entire mode to show all data
                });
              }

              // Add to the indicator object for future reference
              indicator.series = rsiSeries;
              indicator.paneIndex = paneIndex;

              // Track this indicator in its pane
              if (!paneIndicatorsRef.current[paneIndex]) {
                paneIndicatorsRef.current[paneIndex] = [];
              }
              paneIndicatorsRef.current[paneIndex].push(indicator.id);

              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: rsiSeries, paneIndex });

              // If we have overbought/oversold parameters, draw reference lines
              if (indicator.parameters.overbought !== undefined && indicator.parameters.oversold !== undefined) {
                try {
                  const overbought = Number(indicator.parameters.overbought);
                  const oversold = Number(indicator.parameters.oversold);

                  if (!isNaN(overbought) && !isNaN(oversold) && formattedCandles.length > 0) {
                    // Add horizontal lines for overbought level
                    const overboughtSeries = chart.addSeries(
                      LineSeries,
                      {
                        color: "rgba(255, 76, 76, 0.5)", // Brighter red
                        lineWidth: 2, // Integer value for lineWidth
                        lineStyle: 2, // Dashed line
                        lastValueVisible: true, // Show value
                        crosshairMarkerVisible: false,
                        title: `Overbought (${overbought})`, // Include level in title
                      },
                      paneIndex
                    );

                    // Add data for the overbought line
                    const firstTime = formattedCandles[0].time;
                    const lastTime = formattedCandles[formattedCandles.length - 1].time;

                    overboughtSeries.setData([
                      { time: firstTime, value: overbought },
                      { time: lastTime, value: overbought },
                    ]);

                    // Add horizontal lines for oversold level
                    const oversoldSeries = chart.addSeries(
                      LineSeries,
                      {
                        color: "rgba(76, 175, 80, 0.5)", // Brighter green
                        lineWidth: 2, // Integer value for lineWidth
                        lineStyle: 2, // Dashed line
                        lastValueVisible: true, // Show value
                        crosshairMarkerVisible: false,
                        title: `Oversold (${oversold})`, // Include level in title
                      },
                      paneIndex
                    );

                    // Add data for the oversold line
                    oversoldSeries.setData([
                      { time: firstTime, value: oversold },
                      { time: lastTime, value: oversold },
                    ]);
                  }
                } catch (err) {
                  console.error("Error adding overbought/oversold lines:", err);
                }
              }
              break;

            case "macd":
              // MACD calculation
              const macdResult = calculateMACD(
                formattedCandles,
                indicator.parameters.fastPeriod || 12,
                indicator.parameters.slowPeriod || 26,
                indicator.parameters.signalPeriod || 9
              );

              // Set data for the main MACD line
              if (indicator.series) {
                indicator.series.setData(macdResult.macdLine);
              }

              // Check if we have additional series stored (from an extended indicator)
              const macdIndicator = indicator as MACDIndicator;
              if (macdIndicator.additionalSeries) {
                // Set data for signal line
                if (macdIndicator.additionalSeries.signalSeries && macdResult.signalLine) {
                  macdIndicator.additionalSeries.signalSeries.setData(macdResult.signalLine);
                }

                // Set data for histogram
                if (macdIndicator.additionalSeries.histogramSeries && macdResult.histogram) {
                  macdIndicator.additionalSeries.histogramSeries.setData(
                    // Add color property to each point for the histogram
                    macdResult.histogram.map((point) => ({
                      time: point.time,
                      value: point.value,
                      color:
                        point.value >= 0
                          ? indicator.parameters.histogramColorPositive || "#26A69A" // Positive color
                          : indicator.parameters.histogramColorNegative || "#EF5350", // Negative color
                    }))
                  );
                }
              }
              break;

            case "bollinger":
              // Cast to extended type for better type safety
              const bollingerIndicator = indicator as ExtendedBollingerBandsIndicator;

              let middleSeries, upperSeries, lowerSeries;
              try {
                // Try using v5 API first
                if (typeof chart.addSeries === "function") {
                  // Use v5 API
                  // Bollinger Bands need a line series per band
                  middleSeries = chart.addSeries(
                    LineSeries,
                    {
                      color: indicator.color,
                      lineWidth: 2,
                      title: `BB (${indicator.parameters.period})`,
                      lastValueVisible: false,
                    },
                    paneIndex
                  );

                  upperSeries = chart.addSeries(
                    LineSeries,
                    {
                      color: indicator.color,
                      lineStyle: 2, // Dashed
                      lineWidth: 1,
                      title: "Upper",
                      lastValueVisible: false,
                    },
                    paneIndex
                  );

                  lowerSeries = chart.addSeries(
                    LineSeries,
                    {
                      color: indicator.color,
                      lineStyle: 2, // Dashed
                      lineWidth: 1,
                      title: "Lower",
                      lastValueVisible: false,
                    },
                    paneIndex
                  );
                } else {
                  // For v4 API compatibility
                  if (chartApi.addLineSeries) {
                    middleSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: 2,
                      title: `BB (${indicator.parameters.period})`,
                      lastValueVisible: false,
                    });

                    upperSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineStyle: 2, // Dashed
                      lineWidth: 1,
                      title: "Upper",
                      lastValueVisible: false,
                    });

                    lowerSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineStyle: 2, // Dashed
                      lineWidth: 1,
                      title: "Lower",
                      lastValueVisible: false,
                    });
                  } else {
                    throw new Error("Neither addSeries nor addLineSeries methods are available");
                  }
                }
              } catch (error) {
                console.error("Error adding Bollinger Bands series:", error);
                // Fallback with specific casting
                try {
                  if (chartApi.addLineSeries) {
                    middleSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineWidth: 2,
                      title: `BB (${indicator.parameters.period})`,
                      lastValueVisible: false,
                    });

                    upperSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineStyle: 2, // Dashed
                      lineWidth: 1,
                      title: "Upper",
                      lastValueVisible: false,
                    });

                    lowerSeries = chartApi.addLineSeries({
                      color: indicator.color,
                      lineStyle: 2, // Dashed
                      lineWidth: 1,
                      title: "Lower",
                      lastValueVisible: false,
                    });
                  } else {
                    throw new Error("Could not add Bollinger Bands series after fallback");
                  }
                } catch (fallbackError) {
                  console.error("Failed to add Bollinger Bands series with fallback method:", fallbackError);
                  return; // Skip this indicator if we can't add a series
                }
              }

              // For simplicity, we'll store just the middle series in the indicator
              // and manage upper/lower separately
              bollingerIndicator.series = middleSeries;
              bollingerIndicator.paneIndex = paneIndex;
              // Also store references to upper and lower bands
              bollingerIndicator.upperSeries = upperSeries;
              bollingerIndicator.lowerSeries = lowerSeries;

              // Notify parent about the updated indicator
              onIndicatorUpdated({
                ...bollingerIndicator,
                series: middleSeries,
                paneIndex,
              });
              break;

            case "stochastic":
              // Stochastic calculation
              const kPeriod = Number(indicator.parameters.kPeriod) || 14;
              const dPeriod = Number(indicator.parameters.dPeriod) || 3;
              const stochResult = calculateStochastic(formattedCandles, kPeriod, dPeriod);

              // Set data for %K line (main series)
              if (indicator.series) {
                indicator.series.setData(stochResult.k);
              }

              // Check if we have additional series stored (from an extended indicator)
              const stochIndicator = indicator as StochasticIndicator;
              if (stochIndicator.additionalSeries && stochIndicator.additionalSeries.dSeries) {
                // Set data for %D line
                stochIndicator.additionalSeries.dSeries.setData(stochResult.d);
              }
              break;

            // Additional indicator types would be handled here
          }
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
              // MACD calculation
              const macdResult = calculateMACD(
                formattedCandles,
                indicator.parameters.fastPeriod || 12,
                indicator.parameters.slowPeriod || 26,
                indicator.parameters.signalPeriod || 9
              );

              // Set data for the main MACD line
              if (indicator.series) {
                indicator.series.setData(macdResult.macdLine);
              }

              // Check if we have additional series stored (from an extended indicator)
              const macdIndicator = indicator as MACDIndicator;
              if (macdIndicator.additionalSeries) {
                // Set data for signal line
                if (macdIndicator.additionalSeries.signalSeries && macdResult.signalLine) {
                  macdIndicator.additionalSeries.signalSeries.setData(macdResult.signalLine);
                }

                // Set data for histogram
                if (macdIndicator.additionalSeries.histogramSeries && macdResult.histogram) {
                  macdIndicator.additionalSeries.histogramSeries.setData(
                    // Add color property to each point for the histogram
                    macdResult.histogram.map((point) => ({
                      time: point.time,
                      value: point.value,
                      color:
                        point.value >= 0
                          ? indicator.parameters.histogramColorPositive || "#26A69A" // Positive color
                          : indicator.parameters.histogramColorNegative || "#EF5350", // Negative color
                    }))
                  );
                }
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

            case "stochastic":
              // Stochastic calculation
              const kPeriod = Number(indicator.parameters.kPeriod) || 14;
              const dPeriod = Number(indicator.parameters.dPeriod) || 3;
              const stochResult = calculateStochastic(formattedCandles, kPeriod, dPeriod);

              // Set data for %K line (main series)
              if (indicator.series) {
                indicator.series.setData(stochResult.k);
              }

              // Check if we have additional series stored (from an extended indicator)
              const stochIndicator = indicator as StochasticIndicator;
              if (stochIndicator.additionalSeries && stochIndicator.additionalSeries.dSeries) {
                // Set data for %D line
                stochIndicator.additionalSeries.dSeries.setData(stochResult.d);
              }
              break;

            // Additional indicators would be calculated and rendered here
          }
        }
      });

      // Store current indicators in ref for cleanup
      indicatorsWithPanes.forEach((indicator) => {
        prevIndicatorsRef.current[indicator.id] = indicator;
      });
    } catch (err) {
      console.error("Error applying indicators:", err);
    }
  }, [chartInstance, indicators, formattedCandles, onIndicatorUpdated]);

  // Clean up indicators when they are removed
  useEffect(() => {
    if (!chartInstance?.chart) return;
    const chart = chartInstance.chart; // Create a local reference to avoid null checks
    // Cast to combined API type
    const chartApi = chart as ChartApi;

    // Clean up any removed indicators
    const indicatorIds = indicators.map((i) => i.id);
    const storedIds = Object.keys(prevIndicatorsRef.current);

    storedIds.forEach((id) => {
      // If an indicator is no longer in the list, remove its series from the chart
      if (!indicatorIds.includes(id)) {
        const indicator = prevIndicatorsRef.current[id];
        const paneIndex = indicator.paneIndex;

        try {
          // Remove main series
          if (indicator.series) {
            // chart.removeSeries() will handle removal properly
            chart.removeSeries(indicator.series);
          }

          // Remove additional series if any (like for Bollinger Bands)
          const bollingerIndicator = indicator as ExtendedBollingerBandsIndicator;
          if (bollingerIndicator.upperSeries) {
            chart.removeSeries(bollingerIndicator.upperSeries);
          }

          if (bollingerIndicator.lowerSeries) {
            chart.removeSeries(bollingerIndicator.lowerSeries);
          }

          // Remove from tracking ref
          delete prevIndicatorsRef.current[id];

          // Also remove from pane tracking
          if (paneIndex !== undefined && paneIndicatorsRef.current[paneIndex]) {
            paneIndicatorsRef.current[paneIndex] = paneIndicatorsRef.current[paneIndex].filter((indId) => indId !== id);
          }
        } catch (error) {
          console.error(`Error removing indicator ${id}:`, error);
        }
      }
    });

    // Clean up empty panes
    try {
      // Check if we have v5 panes API
      if (chartApi.panes && typeof chartApi.panes === "function") {
        // Get all panes
        const panes = chartApi.panes();

        // Skip main price pane (0) and volume pane (1)
        for (let i = panes.length - 1; i > 1; i--) {
          const pane = panes[i];

          // Check if pane is empty in our tracking
          const isEmpty = !paneIndicatorsRef.current[i] || paneIndicatorsRef.current[i].length === 0;

          // Double-check with API if possible
          if (isEmpty && typeof pane.getSeries === "function") {
            const series = pane.getSeries();

            // If the pane is empty and we can remove it, do so
            if (series.length === 0 && chartApi.removePane) {
              chartApi.removePane(i);
              delete panesRef.current[i];
              delete paneIndicatorsRef.current[i];
              console.log(`Removed empty pane at index ${i}`);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error cleaning up empty panes:", error);
    }
  }, [chartInstance, indicators]);

  return null; // This is a logic-only component, no UI to render
}
