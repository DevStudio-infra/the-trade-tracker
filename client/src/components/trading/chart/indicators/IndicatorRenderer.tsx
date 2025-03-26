"use client";

import { useEffect, useRef } from "react";
import { LineSeries, SeriesType, IPaneApi } from "lightweight-charts";
import { ChartInstanceRef, IndicatorConfig, FormattedCandle, indicatorDefaults } from "../utils/chartTypes";
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from "../utils/indicatorCalculations";

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

  // Apply indicators to chart when they change
  useEffect(() => {
    if (!chartInstance?.chart || formattedCandles.length === 0) return;

    try {
      const chart = chartInstance.chart; // Create local reference to avoid null checks
      // Cast to API type that can handle both v4 and v5 methods
      const chartApi = chart as ChartApi;

      // Ensure necessary panes exist for indicators
      indicators.forEach((indicator) => {
        const defaultPane = indicatorDefaults[indicator.type].defaultPane || 0;
        const paneIndex = indicator.paneIndex !== undefined ? indicator.paneIndex : defaultPane;

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
            }
          } else {
            console.warn("Panes API not available - using v4 compatibility mode");
          }
        } catch (err) {
          console.error("Error creating pane:", err);
        }
      });

      // Process indicators one by one
      indicators.forEach((indicator) => {
        // Skip if the chart is no longer available
        if (!chart) return;

        // Determine pane index for this indicator
        const defaultPane = indicatorDefaults[indicator.type].defaultPane || 0;
        const paneIndex = indicator.paneIndex !== undefined ? indicator.paneIndex : defaultPane;

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
              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: lineSeries, paneIndex });
              break;

            case "rsi":
              // RSI appears in a separate pane (typically pane 2)
              let rsiSeries;
              try {
                // Try using v5 API first
                if (typeof chart.addSeries === "function") {
                  // Use v5 API
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
                    paneIndex
                  );
                } else {
                  // For v4 API compatibility
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

              // Add to the indicator object for future reference
              indicator.series = rsiSeries;
              indicator.paneIndex = paneIndex;
              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: rsiSeries, paneIndex });
              break;

            case "macd":
              // MACD requires multiple series in the same pane
              let macdSeries;
              try {
                // Try using v5 API first
                if (typeof chart.addSeries === "function") {
                  // Use v5 API
                  macdSeries = chart.addSeries(
                    LineSeries,
                    {
                      color: indicator.parameters.macdColor || "#2962FF",
                      lineWidth: 2,
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 4,
                      },
                      title: "MACD",
                    },
                    paneIndex
                  );
                } else {
                  // For v4 API compatibility
                  if (chartApi.addLineSeries) {
                    macdSeries = chartApi.addLineSeries({
                      color: indicator.parameters.macdColor || "#2962FF",
                      lineWidth: 2,
                      priceScaleId: "macd",
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 4,
                      },
                      title: "MACD",
                    });

                    // Configure the panel for MACD in v4
                    macdSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.75,
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
                console.error("Error adding MACD series:", error);
                // Fallback to v4 API with specific cast
                try {
                  if (chartApi.addLineSeries) {
                    macdSeries = chartApi.addLineSeries({
                      color: indicator.parameters.macdColor || "#2962FF",
                      lineWidth: 2,
                      priceScaleId: "macd",
                      lastValueVisible: true,
                      priceFormat: {
                        type: "price",
                        precision: 4,
                      },
                      title: "MACD",
                    });

                    // Configure the panel for MACD in v4
                    macdSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.75,
                        bottom: 0.05,
                      },
                      borderVisible: true,
                      borderColor: "#2B2B43",
                      visible: true,
                    });
                  } else {
                    throw new Error("Could not add MACD series after fallback");
                  }
                } catch (fallbackError) {
                  console.error("Failed to add MACD series with fallback method:", fallbackError);
                  return; // Skip this indicator if we can't add a series
                }
              }

              // Add to the indicator object for future reference
              indicator.series = macdSeries;
              indicator.paneIndex = paneIndex;
              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: macdSeries, paneIndex });
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
              indicator.series.setData(macdResult.macdLine);

              // For full MACD, we would also set signal line and histogram
              // but this would require more series setup and management
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

            // Additional indicators would be calculated and rendered here
          }
        }
      });

      // Store current indicators in ref for cleanup
      indicators.forEach((indicator) => {
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
          // Check if pane has any series
          if (typeof pane.getSeries === "function") {
            const series = pane.getSeries();

            // If the pane is empty and we can remove it, do so
            if (series.length === 0 && chartApi.removePane) {
              chartApi.removePane(i);
              delete panesRef.current[i];
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
