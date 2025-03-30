"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useApi, Candle } from "@/lib/api";
import { useTradingStore } from "@/stores/trading-store";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { createChart, ColorType, HistogramSeries, LineSeries, CandlestickSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time, CandlestickData, HistogramData } from "lightweight-charts";
import { useSettings } from "@/hooks/useSettings";

// Import refactored indicator components
import { IndicatorManager } from "@/components/trading/chart/indicators";
import { IndicatorType, IndicatorConfig, ChartApiWithPanes } from "./chart/core/ChartTypes";
import { ChartHeader } from "./chart/ChartHeader";
import { createIndicator } from "./chart/indicators/indicatorFactory";
import { BaseIndicator } from "./chart/indicators/base/types";

// Timeframes are now imported from ChartTypes.ts

// Chart colors for light/dark themes
const chartColors = {
  light: {
    background: "#FFFFFF",
    text: "#333333",
    grid: "#EAEAEA",
    borderColor: "#DDDDDD",
    upColor: "#26A69A",
    downColor: "#EF5350",
    wickUpColor: "#26A69A",
    wickDownColor: "#EF5350",
    volumeUp: "rgba(38, 166, 154, 0.5)",
    volumeDown: "rgba(239, 83, 80, 0.5)",
  },
  dark: {
    background: "#1E222D",
    text: "#DDD",
    grid: "#2B2B43",
    borderColor: "#2B2B43",
    upColor: "#4CAF50",
    downColor: "#FF5252",
    wickUpColor: "#4CAF50",
    wickDownColor: "#FF5252",
    volumeUp: "rgba(76, 175, 80, 0.5)",
    volumeDown: "rgba(255, 82, 82, 0.5)",
  },
};

interface TradingChartProps {
  pair: string | null;
}

// Define a type for candle data to address 'any' type warnings
interface FormattedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

// Add this at the top level, outside any component

export function TradingChart({ pair }: TradingChartProps) {
  // State management - group related state variables together
  // Chart state
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [precision, setPrecision] = useState(5); // Default precision

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [brokerConnectionIssue, setBrokerConnectionIssue] = useState(false);

  // Indicator states
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [selectedIndicatorType, setSelectedIndicatorType] = useState<IndicatorType | null>(null);

  // References
  const requestInProgressRef = useRef(false);
  const requestParamsRef = useRef<{ pair: string; brokerId: string; timeframe: string } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<{
    chart: IChartApi | null;
    candlestickSeries: ISeriesApi<"Candlestick"> | null;
    volumeSeries: ISeriesApi<"Histogram"> | null;
  }>({
    chart: null,
    candlestickSeries: null,
    volumeSeries: null,
  });
  const prevIndicatorsRef = useRef<Record<string, IndicatorConfig>>({});

  // References for tracking oscillator panes
  const oscillatorPanesRef = useRef<Record<string, number>>({});
  const panesRef = useRef<Record<number, boolean>>({ 0: true, 1: true }); // 0: main, 1: volume

  // Add this near other refs
  const indicatorRenderersRef = useRef<Record<string, BaseIndicator>>({});

  // Hooks
  const api = useApi();
  const { selectedBroker } = useTradingStore();
  const settings = useSettings();
  const { resolvedTheme } = useTheme();

  // Function to get chart colors based on theme
  const getChartColors = () => {
    return resolvedTheme === "dark" ? chartColors.dark : chartColors.light;
  };

  // Add logging to check broker connections
  useEffect(() => {
    console.log("TradingChart - Broker data:", {
      selectedBroker,
      connections: settings?.brokerConnections,
      hasConnections: Array.isArray(settings?.brokerConnections) && settings?.brokerConnections.length > 0,
      activeBrokerFound: Array.isArray(settings?.brokerConnections) && selectedBroker ? settings?.brokerConnections.some((conn) => conn.id === selectedBroker.id) : false,
    });

    // Reset any error related to broker connections when the connections change
    if (brokerConnectionIssue && Array.isArray(settings?.brokerConnections) && settings?.brokerConnections.length > 0) {
      setBrokerConnectionIssue(false);
      setError(null);
    }
  }, [settings?.brokerConnections, selectedBroker, brokerConnectionIssue]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up any existing chart first
    if (chartInstanceRef.current.chart) {
      try {
        // Clear all indicators from ref
        Object.keys(prevIndicatorsRef.current).forEach((id) => {
          if (prevIndicatorsRef.current[id]?.series) {
            delete prevIndicatorsRef.current[id];
          }
        });

        // Remove the chart
        chartInstanceRef.current.chart.remove();
        chartInstanceRef.current = {
          chart: null,
          candlestickSeries: null,
          volumeSeries: null,
        };
      } catch (err) {
        console.error("Error cleaning up existing chart:", err);
      }
    }

    // Store container reference for cleanup
    const chartContainer = chartContainerRef.current;

    // Get colors based on current theme
    const colors = getChartColors();

    console.log("CHART DEBUG: Creating new chart instance");

    // Create chart instance
    const chart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontSize: 12,
        // Configure panes with separators and allow resizing
        panes: {
          separatorColor: colors.borderColor,
          separatorHoverColor: resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          enableResize: true,
        },
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
        barSpacing: 8,
        fixLeftEdge: true,
        fixRightEdge: true,
        borderColor: colors.borderColor,
      },
      rightPriceScale: {
        borderColor: colors.borderColor,
        entireTextOnly: true,
      },
      width: chartContainer.clientWidth,
      height: 500,
    });

    // Cast to enhanced chart API with pane support
    const chartWithPanes = chart as ChartApiWithPanes;

    console.log("CHART DEBUG: Creating initial panes");

    // Check if we have the panes API
    if (!chartWithPanes.panes || typeof chartWithPanes.panes !== "function") {
      console.error("CHART DEBUG: Chart does not have panes API");
    } else {
      const initialPanes = chartWithPanes.panes();
      console.log(`CHART DEBUG: Chart initialized with ${initialPanes.length} panes`);
    }

    // Create the initial panes setup - main pane (index 0) for price and volume,
    // and a secondary pane (index 1) for indicators like RSI
    // The main pane is created by default, but we need to create the secondary pane
    if (typeof chartWithPanes.createPane === "function") {
      try {
        // Create an additional pane for oscillators like RSI
        chartWithPanes.createPane({
          height: 150, // Smaller height for the indicator pane
        });

        // Verify pane was created
        if (chartWithPanes.panes && typeof chartWithPanes.panes === "function") {
          const panes = chartWithPanes.panes();
          console.log(`CHART DEBUG: After volume pane creation, chart has ${panes.length} panes`);

          // Track the panes we created
          panesRef.current = {
            0: true, // Main pane
            1: true, // Volume pane
          };
        }
      } catch (error) {
        console.error("CHART DEBUG: Error creating volume pane:", error);
      }
    } else {
      console.error("CHART DEBUG: Chart does not have createPane API");
    }

    console.log("CHART DEBUG: Adding candlestick series");

    // Add candlestick series with the new v5 syntax and proper typing
    const candlestickSeries = chartWithPanes.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
      priceFormat: {
        type: "price",
        precision: precision,
        minMove: Math.pow(10, -precision),
      },
    }) as ISeriesApi<"Candlestick">; // Cast to the correct type

    // Configure the main price scale for candlesticks
    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.4, // Leave space for volume
      },
      borderVisible: true,
      borderColor: colors.borderColor,
    });

    console.log("CHART DEBUG: Adding volume series");

    // Add volume series with separate price scale and proper typing
    const volumeSeries = chartWithPanes.addSeries(HistogramSeries, {
      color: colors.volumeUp,
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume", // Separate price scale ID
    }) as ISeriesApi<"Histogram">; // Cast to the correct type

    // Configure volume price scale
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Position at the bottom of the chart
        bottom: 0.0,
      },
      borderVisible: true,
      borderColor: colors.borderColor,
      visible: true,
    });

    // Store references
    chartInstanceRef.current = {
      chart,
      candlestickSeries,
      volumeSeries,
    };

    // Check if we have the correct number of panes after setup
    if (chartWithPanes.panes && typeof chartWithPanes.panes === "function") {
      const panesAfterSetup = chartWithPanes.panes();
      console.log(`CHART DEBUG: After complete setup, chart has ${panesAfterSetup.length} panes`);

      // Create an additional buffer pane for indicators that will be added later
      if (panesAfterSetup.length < 3 && typeof chartWithPanes.createPane === "function") {
        try {
          console.log("CHART DEBUG: Creating buffer pane for future indicators");
          chartWithPanes.createPane({
            height: 200, // Height for indicator panes
          });

          // Track the additional pane
          panesRef.current[2] = true;

          // Verify buffer pane was created
          const panesFinal = chartWithPanes.panes();
          console.log(`CHART DEBUG: After buffer pane creation, chart has ${panesFinal.length} panes`);
        } catch (error) {
          console.error("CHART DEBUG: Error creating buffer pane:", error);
        }
      }
    }

    // Better resize handling with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (chartInstanceRef.current.chart && width > 0) {
        chartInstanceRef.current.chart.applyOptions({
          width: width,
        });

        // If we have data, ensure it remains visible after resize
        if (candles && candles.length > 0) {
          chartInstanceRef.current.chart.timeScale().fitContent();
        }
      }
    });

    // Start observing the chart container
    resizeObserver.observe(chartContainer);

    // Also force an initial size adjustment
    setTimeout(() => {
      if (chartInstanceRef.current.chart) {
        chartInstanceRef.current.chart.applyOptions({
          width: chartContainer.clientWidth,
        });
      }
    }, 50);

    return () => {
      // Clean up
      resizeObserver.unobserve(chartContainer);
      resizeObserver.disconnect();

      try {
        // Only remove if chart still exists
        if (chartInstanceRef.current.chart) {
          // Clear all indicators from ref
          Object.keys(prevIndicatorsRef.current).forEach((id) => {
            if (prevIndicatorsRef.current[id]?.series) {
              delete prevIndicatorsRef.current[id];
            }
          });

          chart.remove();
          chartInstanceRef.current = {
            chart: null,
            candlestickSeries: null,
            volumeSeries: null,
          };
        }
      } catch (err) {
        console.error("Error cleaning up chart:", err);
      }
    };
  }, [pair, selectedTimeframe, resolvedTheme]); // Recreate chart when pair, timeframe, or theme changes

  // Add a helper function for forcing chart reflow
  const forceChartReflow = () => {
    if (!chartInstanceRef.current.chart) return;

    // Force a chart reflow by slightly modifying options and fitting content
    const chart = chartInstanceRef.current.chart;

    // Apply resize trick
    const container = chartContainerRef.current;
    if (container) {
      const currentWidth = container.clientWidth;

      // First apply a slightly different width
      chart.applyOptions({ width: currentWidth - 1 });

      // Then revert to original width
      setTimeout(() => {
        chart.applyOptions({ width: currentWidth });
        chart.timeScale().fitContent();
      }, 10);
    }
  };

  // Update chart data when candles change
  useEffect(() => {
    if (!candles || !chartInstanceRef.current.candlestickSeries || !chartInstanceRef.current.volumeSeries) return;

    try {
      // Format candle data for the chart
      const formattedCandles = candles.map((candle) => {
        // LightweightCharts requires time to be a specific type (UTCTimestamp)
        const time = (candle.timestamp / 1000) as Time; // Convert to seconds and cast as Time type

        return {
          time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          value: candle.volume,
        };
      });

      console.log(`Setting chart data: ${formattedCandles.length} candles with precision ${precision}`);

      // Get colors based on current theme
      const colors = getChartColors();

      // Update candlestick series
      chartInstanceRef.current.candlestickSeries.setData(
        formattedCandles.map(
          ({ time, open, high, low, close }) =>
            ({
              time,
              open,
              high,
              low,
              close,
            } as CandlestickData<Time>)
        )
      );

      // Update volume series with color based on candle direction
      chartInstanceRef.current.volumeSeries.setData(
        formattedCandles.map(
          ({ time, value, open, close }) =>
            ({
              time,
              value,
              color:
                open <= close
                  ? // Use more transparent colors for volume bars
                    colors.volumeUp.replace("0.5", "0.3")
                  : colors.volumeDown.replace("0.5", "0.3"),
            } as HistogramData<Time>)
        )
      );

      // Only apply indicators if we have a chart and there are indicators to show
      if (chartInstanceRef.current.chart && indicators.length > 0) {
        // Process indicators in a separate microtask to avoid blocking rendering
        setTimeout(() => {
          try {
            // Store formatted candles for indicators to use
            const formattedCandlesRef = formattedCandles;

            // Apply indicators one by one
            indicators.forEach((indicator) => {
              // Skip if the chart is no longer available
              if (!chartInstanceRef.current.chart) return;

              // If this indicator already has a series attached, use it
              // Otherwise create a new one
              if (!indicator.series) {
                // Create different types of series based on indicator type
                switch (indicator.type) {
                  case "SMA":
                  case "EMA":
                    // Create a line series for moving averages
                    const chartInstance = chartInstanceRef.current.chart;
                    if (chartInstance) {
                      // Add null check
                      const lineSeries = chartInstance.addSeries(LineSeries, {
                        color: indicator.color,
                        lineWidth: 2,
                        priceLineVisible: false,
                        lastValueVisible: true,
                        crosshairMarkerVisible: true,
                        title: `${indicator.type} (${indicator.parameters.period})`,
                      });

                      // Add to the indicator object for future reference
                      indicator.series = lineSeries;
                    }
                    break;
                  case "RSI": {
                    // Get the dedicated pane index for this RSI instance
                    const indicatorKey = `RSI-${indicator.id}`;
                    let rsiPaneIndex = oscillatorPanesRef.current[indicatorKey];

                    if (!rsiPaneIndex) {
                      // Assign a new pane if needed
                      rsiPaneIndex = getNextAvailablePaneIndex();
                      oscillatorPanesRef.current[indicatorKey] = rsiPaneIndex;
                      indicator.parameters.paneIndex = rsiPaneIndex;
                      console.log(`CHART DEBUG: Assigning new pane ${rsiPaneIndex} to RSI ${indicator.id}`);
                    }

                    // Ensure the pane exists
                    ensurePaneExists(rsiPaneIndex);

                    console.log(`CHART DEBUG: Creating RSI in pane ${rsiPaneIndex}`);

                    // Use the chart instance
                    const chartWithPanesForRSI = chartInstanceRef.current.chart as ChartApiWithPanes;

                    // No need to create a pane here, as we've already done that above
                    // (removing previous pane creation code)

                    const rsiSeries = chartWithPanesForRSI.addSeries(
                      LineSeries,
                      {
                        color: indicator.color,
                        lineWidth: 2,
                        priceFormat: {
                          type: "price",
                          precision: 2,
                          minMove: 0.01,
                        },
                        title: `RSI (${indicator.parameters.period})`,
                        // Set overbought/oversold levels if provided
                        ...(indicator.parameters.overbought
                          ? {
                              autoscaleInfoProvider: () => ({
                                priceRange: {
                                  minValue: 0,
                                  maxValue: 100,
                                },
                              }),
                            }
                          : {}),
                      },
                      rsiPaneIndex
                    );

                    // Store pane index with the indicator for future reference
                    indicator.paneIndex = rsiPaneIndex;

                    // Configure RSI price scale with fixed range for better visualization
                    rsiSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                      },
                      borderVisible: true,
                      borderColor: colors.borderColor,
                      visible: true,
                      // Fixed range for RSI
                      autoScale: false,
                      // Use mode: 'entire' instead of explicit min/max values
                      mode: 2, // Entire mode (shows all data)
                    });

                    // Draw overbought/oversold lines if parameters are provided
                    if (indicator.parameters.overbought && indicator.parameters.oversold) {
                      try {
                        const overbought = Number(indicator.parameters.overbought) || 70;
                        const oversold = Number(indicator.parameters.oversold) || 30;

                        // Add horizontal lines for overbought level
                        const overboughtSeries = chartWithPanesForRSI.addSeries(
                          LineSeries,
                          {
                            color: "rgba(255, 0, 0, 0.3)", // Light red
                            lineWidth: 1,
                            lineStyle: 1, // Dotted line
                            lastValueVisible: false,
                            priceLineVisible: false,
                            crosshairMarkerVisible: false,
                          },
                          rsiPaneIndex
                        );

                        // Add data for the overbought line
                        if (candles && candles.length > 0) {
                          const firstTime = (candles[0].timestamp / 1000) as Time;
                          const lastTime = (candles[candles.length - 1].timestamp / 1000) as Time;
                          overboughtSeries.setData([
                            { time: firstTime, value: overbought },
                            { time: lastTime, value: overbought },
                          ]);
                        }

                        // Add horizontal lines for oversold level
                        const oversoldSeries = chartWithPanesForRSI.addSeries(
                          LineSeries,
                          {
                            color: "rgba(0, 255, 0, 0.3)", // Light green
                            lineWidth: 1,
                            lineStyle: 1, // Dotted line
                            lastValueVisible: false,
                            priceLineVisible: false,
                            crosshairMarkerVisible: false,
                          },
                          rsiPaneIndex
                        );

                        // Add data for the oversold line
                        if (candles && candles.length > 0) {
                          const firstTime = (candles[0].timestamp / 1000) as Time;
                          const lastTime = (candles[candles.length - 1].timestamp / 1000) as Time;
                          oversoldSeries.setData([
                            { time: firstTime, value: oversold },
                            { time: lastTime, value: oversold },
                          ]);
                        }
                      } catch (err) {
                        console.error("Error adding overbought/oversold lines:", err);
                      }
                    }

                    // Add to the indicator object for future reference
                    indicator.series = rsiSeries;
                    break;
                  }
                  case "MACD":
                    // Use our dedicated MACD creation function
                    createMACDIndicator(indicator);
                    break;
                  case "Stochastic":
                    // Use our dedicated Stochastic creation function
                    createStochasticIndicator(indicator);
                    break;
                  // Additional indicator types would be handled here
                }
              }

              // If we have a series attached to this indicator, update its data
              if (indicator.series && formattedCandlesRef.length > 0) {
                // Calculate the indicator values based on type
                switch (indicator.type) {
                  case "SMA":
                    // Simple Moving Average calculation
                    const period = Number(indicator.parameters.period) || 20;
                    const smaData = calculateSMA(formattedCandlesRef, period);
                    indicator.series.setData(smaData);
                    break;
                  case "EMA":
                    // Exponential Moving Average calculation
                    const emaPeriod = Number(indicator.parameters.period) || 20;
                    const emaData = calculateEMA(formattedCandlesRef, emaPeriod);
                    indicator.series.setData(emaData);
                    break;
                  case "RSI":
                    // Relative Strength Index calculation
                    const rsiPeriod = Number(indicator.parameters.period) || 14;
                    const rsiData = calculateRSI(formattedCandlesRef, rsiPeriod);
                    indicator.series.setData(rsiData);
                    break;
                  case "MACD":
                    // MACD data is handled within the createMACDIndicator function
                    // or we can manually update it here
                    updateMACDData(indicator, formattedCandlesRef);
                    break;
                  case "Stochastic":
                    // Stochastic data is handled within the createStochasticIndicator function
                    // No need to update here as we're using the updateData method of the indicator
                    break;
                  // Additional indicators would be calculated here
                }
              }
            });

            // Store current indicators in ref for cleanup
            indicators.forEach((indicator) => {
              prevIndicatorsRef.current[indicator.id] = indicator;
            });
          } catch (indicatorError) {
            console.error("Error applying indicators:", indicatorError);
          }
        }, 0);
      }

      // Fit content and workaround for chart not rendering initially
      if (chartInstanceRef.current.chart) {
        // First fit the content
        chartInstanceRef.current.chart.timeScale().fitContent();

        // Force chart to redraw with a small delay
        setTimeout(() => {
          if (chartInstanceRef.current.chart) {
            // Apply a slight adjustment to force redraw
            const currentVisibleRange = chartInstanceRef.current.chart.timeScale().getVisibleRange();
            if (currentVisibleRange) {
              // Slightly modify visible range to force redraw
              chartInstanceRef.current.chart.timeScale().setVisibleRange({
                from: currentVisibleRange.from,
                to: currentVisibleRange.to,
              });
            }

            // Fit content again to ensure all data is visible
            chartInstanceRef.current.chart.timeScale().fitContent();

            // Use our helper function to force reflow as a last resort
            setTimeout(forceChartReflow, 100);
          }
        }, 50);
      }
    } catch (err) {
      console.error("Error updating chart with candle data:", err);
    }
  }, [candles, resolvedTheme, indicators]); // Add indicators to dependencies

  // Helper function to calculate Simple Moving Average
  function calculateSMA(candles: FormattedCandle[], period: number) {
    const result = [];

    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      result.push({
        time: candles[i].time,
        value: sum / period,
      });
    }

    return result;
  }

  // Helper function to calculate Exponential Moving Average
  function calculateEMA(candles: FormattedCandle[], period: number) {
    const result = [];

    // First value is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[i].close;
    }
    let ema = sum / period;

    // Multiplier: (2 / (period + 1))
    const multiplier = 2 / (period + 1);

    result.push({
      time: candles[period - 1].time,
      value: ema,
    });

    // Calculate EMA for the rest
    for (let i = period; i < candles.length; i++) {
      ema = (candles[i].close - ema) * multiplier + ema;
      result.push({
        time: candles[i].time,
        value: ema,
      });
    }

    return result;
  }

  // Helper function to calculate Relative Strength Index
  function calculateRSI(candles: FormattedCandle[], period: number) {
    const result = [];
    const gains = [];
    const losses = [];

    // Calculate initial gains and losses
    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);

      // Once we have enough data to calculate the first RSI value
      if (i >= period) {
        // Calculate average gain and loss for the period
        let avgGain = 0;
        let avgLoss = 0;

        if (i === period) {
          // First calculation is a simple average
          for (let j = 0; j < period; j++) {
            avgGain += gains[j];
            avgLoss += losses[j];
          }
          avgGain /= period;
          avgLoss /= period;
        } else {
          // Subsequent calculations use the previous values
          const prevAvgGain = result[result.length - 1].avgGain;
          const prevAvgLoss = result[result.length - 1].avgLoss;

          // Smoothed averages
          avgGain = (prevAvgGain * (period - 1) + gains[gains.length - 1]) / period;
          avgLoss = (prevAvgLoss * (period - 1) + losses[losses.length - 1]) / period;
        }

        // Calculate RS and RSI
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);

        result.push({
          time: candles[i].time,
          value: rsi,
          avgGain,
          avgLoss,
        });
      }
    }

    // Remove the avgGain and avgLoss properties for the final result
    return result.map(({ time, value }) => ({ time, value }));
  }

  // Effect to clean up indicators when they are removed
  useEffect(() => {
    // Create a list of indicators to clean up (removed from the list)
    const indicatorsToCleanup = Object.values(prevIndicatorsRef.current).filter((prevIndicator) => !indicators.find((indicator) => indicator.id === prevIndicator.id));

    if (indicatorsToCleanup.length > 0) {
      try {
        indicatorsToCleanup.forEach((indicator) => {
          // Clean up specific indicator types
          if (indicator.type === "MACD") {
            // Check if we have a renderer for this MACD in our ref
            const renderer = indicatorRenderersRef.current[indicator.id];
            if (renderer) {
              // Call destroy method on the renderer to properly clean up
              renderer.destroy();
              // Remove from our refs
              delete indicatorRenderersRef.current[indicator.id];
              console.log(`CHART DEBUG: Destroyed MACD renderer for ${indicator.id}`);
            } else {
              // Fallback to legacy cleanup
              cleanupMACDIndicator(indicator);
            }
          } else if (indicator.type === "Stochastic") {
            // Check if we have a renderer for this Stochastic in our ref
            const renderer = indicatorRenderersRef.current[indicator.id];
            if (renderer) {
              // Call destroy method on the renderer to properly clean up
              renderer.destroy();
              // Remove from our refs
              delete indicatorRenderersRef.current[indicator.id];
              console.log(`CHART DEBUG: Destroyed Stochastic renderer for ${indicator.id}`);
            } else {
              // Fallback to removing series directly if renderer not available
              if (indicator.series) {
                try {
                  chartInstanceRef.current.chart?.removeSeries(indicator.series);
                  console.log(`CHART DEBUG: Removed main Stochastic series for ${indicator.id}`);
                } catch (e) {
                  console.error("Error removing Stochastic series:", e);
                }
              }
            }
          } else {
            // For other indicator types
            if (indicator.series) {
              // Remove the series from the chart
              try {
                chartInstanceRef.current.chart?.removeSeries(indicator.series);
              } catch (e) {
                console.error("Error removing series:", e);
              }
            }
          }

          // Remove from our tracking
          delete prevIndicatorsRef.current[indicator.id];

          // Handle oscillator panes
          if (indicator.type === "RSI" || indicator.type === "MACD" || indicator.type === "Stochastic") {
            const key = `${indicator.type}-${indicator.id}`;
            delete oscillatorPanesRef.current[key];
          }
        });
      } catch (error) {
        console.error("Error cleaning up indicators:", error);
      }
    }
  }, [indicators.length]);

  // Effect to send trading data to server when pair, timeframe, or broker changes
  useEffect(() => {
    // Guard against invalid data
    if (!pair || !selectedBroker || !selectedBroker.id) {
      console.log("Missing required data:", {
        hasPair: !!pair,
        hasSelectedBroker: !!selectedBroker,
        brokerId: selectedBroker?.id,
      });
      return;
    }

    // Check if broker connections are available
    if (!Array.isArray(settings?.brokerConnections) || settings?.brokerConnections.length === 0) {
      console.error("No broker connections available");
      setError("No broker connections available. Please connect a broker first.");
      setBrokerConnectionIssue(true);
      return;
    }

    // Check if the selected broker exists in the connections
    const brokerExists = settings?.brokerConnections.some((conn) => conn.id === selectedBroker.id);
    if (!brokerExists) {
      console.error(`Selected broker (${selectedBroker.id}) not found in connections`);
      setError("Selected broker connection not found. Please select another broker.");
      setBrokerConnectionIssue(true);
      return;
    }

    // Create a request identifier to prevent duplicate requests
    const currentRequestParams = {
      pair,
      brokerId: selectedBroker.id,
      timeframe: selectedTimeframe,
    };

    // Check if this exact request is already in progress or completed successfully
    if (
      requestInProgressRef.current ||
      (requestParamsRef.current &&
        requestParamsRef.current.pair === currentRequestParams.pair &&
        requestParamsRef.current.brokerId === currentRequestParams.brokerId &&
        requestParamsRef.current.timeframe === currentRequestParams.timeframe &&
        candles !== null &&
        !error)
    ) {
      // Skip duplicate request
      console.log("Skipping duplicate request:", currentRequestParams);
      return;
    }

    let isMounted = true;
    requestInProgressRef.current = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setIsRetrying(false);
        setRetryCount(0);
        setBrokerConnectionIssue(false);

        console.log(`Fetching data for ${pair} with timeframe ${selectedTimeframe} from broker ${selectedBroker.id}`);

        // The api.sendTradingData method now handles retries internally
        const response = await api.sendTradingData(selectedBroker.id, pair, selectedTimeframe);

        if (!isMounted) return;

        if (response.success) {
          setCandles(response.data.candles);

          // Update precision from API response
          if (response.data.precision) {
            setPrecision(response.data.precision);

            // If we have a chart instance, update its price format
            if (chartInstanceRef.current.candlestickSeries) {
              chartInstanceRef.current.candlestickSeries.applyOptions({
                priceFormat: {
                  type: "price",
                  precision: response.data.precision,
                  minMove: Math.pow(10, -response.data.precision),
                },
              });
            }
          }

          // Store successful request params to prevent duplicate requests
          requestParamsRef.current = currentRequestParams;

          // Show success toast based on data source
          if (response.data.source === "cache") {
            toast.info("Chart data loaded from cache");
          } else {
            toast.success("Fresh chart data loaded from broker");
          }
        } else {
          throw new Error(response.message || "Failed to load chart data");
        }
      } catch (error) {
        console.error("Error sending trading data:", error);

        if (!isMounted) return;

        setCandles(null);
        requestParamsRef.current = null; // Clear successful request params on error

        const errorMessage = error instanceof Error ? error.message : "Failed to load chart data. Please try again.";

        // Check for different types of errors
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit")) {
          setError("Rate limit exceeded. The broker API is temporarily unavailable. Please try again in a few minutes.");
          toast.error("Rate limit exceeded. Please try again later.", {
            duration: 5000,
          });
        } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
          setError("Broker connection not found. Please check your broker settings.");
          setBrokerConnectionIssue(true);
          toast.error("Broker connection issue. Please check your broker settings.", {
            duration: 5000,
          });
        } else {
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRetrying(false);
          requestInProgressRef.current = false;
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      // We don't reset requestInProgressRef here to prevent new requests during cleanup
    };
  }, [
    // Only these specific values should trigger a refetch
    pair,
    selectedTimeframe,
    selectedBroker?.id, // Use ID instead of the whole object to prevent unnecessary renders
    settings?.brokerConnections, // Add this to the dependency array to react to connection changes
  ]);

  // Add an additional effect to force chart visibility after data is loaded
  useEffect(() => {
    // This effect addresses the common issue where lightweight-charts doesn't render
    // on first load despite having data. An approach using DOM manipulation to force a reflow.

    if (candles && candles.length > 0 && chartContainerRef.current && chartInstanceRef.current.chart) {
      const forceReflow = () => {
        console.log("Applying chart reflow technique");

        // Force browser reflow by accessing computed styles
        if (chartContainerRef.current) {
          // Force reflow by requesting a style computation and modifying a style
          const container = chartContainerRef.current;
          // This line triggers a style computation to force a reflow
          void window.getComputedStyle(container).display;

          // DOM manipulation sequence to force reflow
          container.style.opacity = "0.99";
          setTimeout(() => {
            container.style.opacity = "1";
            if (chartInstanceRef.current.chart) {
              try {
                // Request animation frame to align with browser's render cycle
                window.requestAnimationFrame(() => {
                  chartInstanceRef.current.chart?.applyOptions({
                    width: container.clientWidth,
                  });
                  chartInstanceRef.current.chart?.timeScale().fitContent();
                });
              } catch (err) {
                console.error("Error during chart reflow:", err);
              }
            }
          }, 50);
        }
      };

      // Apply immediately
      forceReflow();

      // And also with some delay to catch timing issues
      const timers = [setTimeout(forceReflow, 100), setTimeout(forceReflow, 500), setTimeout(forceReflow, 1000)];

      return () => {
        // Clean up timers
        timers.forEach((timer) => clearTimeout(timer));
      };
    }
  }, [candles]);

  const handleTimeframeChange = (timeframe: string) => {
    // Clear previous request params to force a new fetch
    requestParamsRef.current = null;
    setSelectedTimeframe(timeframe);
  };

  // Handle retry after error
  const handleRetry = () => {
    // Clear previous request params to force a new fetch
    requestParamsRef.current = null;
    setError(null);
  };

  // Handle indicators functions
  const openIndicatorDialog = (type: IndicatorType) => {
    console.log("chart.tsx - Opening dialog for:", type);
    setSelectedIndicatorType(type);
    setIndicatorDialogOpen(true);
    console.log("Dialog state in chart.tsx:", { type, isOpen: true });
  };

  // Remove indicator function
  const handleRemoveIndicator = (id: string) => {
    setIndicators((prevIndicators) => prevIndicators.filter((indicator) => indicator.id !== id));
    toast.success("Indicator removed from chart");
  };

  // Helper to get the next available pane index for oscillators
  const getNextAvailablePaneIndex = () => {
    // Start from pane 2 (after main and volume panes)
    let nextPaneIndex = 2;
    const usedPanes = new Set<number>();

    // Add all currently tracked oscillator panes
    Object.values(oscillatorPanesRef.current).forEach((paneIndex) => {
      usedPanes.add(paneIndex);
    });

    // Find the next unused pane index
    while (usedPanes.has(nextPaneIndex)) {
      nextPaneIndex++;
    }

    console.log(`CHART DEBUG: Getting next available pane: ${nextPaneIndex}`);
    return nextPaneIndex;
  };

  // Create or ensure a pane exists
  const ensurePaneExists = (paneIndex: number) => {
    if (!chartInstanceRef.current.chart) {
      console.error("CHART DEBUG: Cannot ensure pane exists, chart is null");
      return false;
    }

    // If we already have this pane tracked, it exists
    if (panesRef.current[paneIndex]) {
      console.log(`CHART DEBUG: Pane ${paneIndex} already exists in our tracking`);
      return true;
    }

    try {
      // Cast to access panes API
      const chartWithPanes = chartInstanceRef.current.chart as ChartApiWithPanes;

      if (!chartWithPanes.panes || typeof chartWithPanes.panes !== "function") {
        console.error("CHART DEBUG: Chart does not have panes API");
        return false;
      }

      const currentPanes = chartWithPanes.panes();
      console.log(`CHART DEBUG: Current panes count: ${currentPanes.length}, need pane: ${paneIndex}`);

      // If we need to create new panes
      if (paneIndex >= currentPanes.length) {
        if (!chartWithPanes.createPane || typeof chartWithPanes.createPane !== "function") {
          console.error("CHART DEBUG: Chart does not have createPane API");
          return false;
        }

        // Create panes one by one until we reach the required index
        for (let i = currentPanes.length; i <= paneIndex; i++) {
          console.log(`CHART DEBUG: Creating pane ${i}`);

          try {
            // Create pane with specific height
            const paneHeight = i === 1 ? 100 : 200; // Volume pane smaller, others larger
            chartWithPanes.createPane({
              height: paneHeight,
            });

            // Verify pane was created
            const updatedPanes = chartWithPanes.panes();
            if (updatedPanes.length <= i) {
              console.error(`CHART DEBUG: Failed to create pane ${i}, current count: ${updatedPanes.length}`);
              return false;
            }

            console.log(`CHART DEBUG: Successfully created pane ${i}, total panes: ${updatedPanes.length}`);
            panesRef.current[i] = true;
          } catch (err) {
            console.error(`CHART DEBUG: Error creating pane ${i}:`, err);
            return false;
          }
        }

        // Final verification
        const finalPanes = chartWithPanes.panes();
        console.log(`CHART DEBUG: After creation, total panes: ${finalPanes.length}, requested pane: ${paneIndex}`);
        return finalPanes.length > paneIndex;
      } else if (paneIndex < currentPanes.length) {
        // Pane exists but we weren't tracking it
        console.log(`CHART DEBUG: Pane ${paneIndex} already exists in chart but not in our tracking`);
        panesRef.current[paneIndex] = true;
        return true;
      }
    } catch (error) {
      console.error("CHART DEBUG: Error ensuring pane exists:", error);
    }

    return false;
  };

  // Apply indicators when they change
  useEffect(() => {
    if (!chartInstanceRef.current.chart || !candles || candles.length === 0) return;

    // Get a local reference to candles data for use in calculations
    const formattedCandles = candles.map((candle) => {
      const time = (candle.timestamp / 1000) as Time;
      return {
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        value: candle.close,
      } as FormattedCandle;
    });

    console.log("Applying indicators:", indicators);

    // First pass: determine and create panes for all oscillators
    indicators.forEach((indicator) => {
      // Special handling for oscillator indicators (RSI, MACD, Stochastic)
      if (indicator.type === "RSI" || indicator.type === "MACD" || indicator.type === "Stochastic") {
        // Generate a unique key for this specific indicator instance
        const indicatorKey = `${indicator.type}-${indicator.id}`;

        // If we don't have a pane assigned yet
        if (!oscillatorPanesRef.current[indicatorKey]) {
          const nextPaneIndex = getNextAvailablePaneIndex();
          oscillatorPanesRef.current[indicatorKey] = nextPaneIndex;

          // Store the pane index in the indicator params
          indicator.parameters.paneIndex = nextPaneIndex;
          console.log(`CHART DEBUG: Assigned pane ${nextPaneIndex} to ${indicatorKey}`);

          // Make sure the pane exists
          ensurePaneExists(nextPaneIndex);
        } else {
          // Just ensure the pane exists if already assigned
          ensurePaneExists(oscillatorPanesRef.current[indicatorKey]);
        }
      }
    });

    // After the cleanup logic and before applying new indicators, reset the chart
    if (indicators.length > 0 && chartInstanceRef.current.chart) {
      try {
        // Delay to ensure the DOM is ready
        setTimeout(() => {
          try {
            // Process each indicator
            indicators.forEach((indicator) => {
              console.log(`Processing indicator: ${indicator.type}-${indicator.id}`);

              // Skip if already processed
              if (indicator.series) {
                console.log(`Indicator ${indicator.type}-${indicator.id} already has a series, skipping creation`);
                return;
              }

              try {
                // Create appropriate indicator series based on type
                switch (indicator.type) {
                  case "SMA":
                  case "EMA":
                    // Create a line series for moving averages
                    const chartInstance = chartInstanceRef.current.chart;
                    if (chartInstance) {
                      // Add null check
                      const lineSeries = chartInstance.addSeries(LineSeries, {
                        color: indicator.color,
                        lineWidth: 2,
                        priceLineVisible: false,
                        lastValueVisible: true,
                        crosshairMarkerVisible: true,
                        title: `${indicator.type} (${indicator.parameters.period})`,
                      });

                      // Add to the indicator object for future reference
                      indicator.series = lineSeries;
                    }
                    break;

                  case "RSI":
                    // Use existing RSI code (no changes needed)
                    break;

                  case "MACD":
                    // Use our dedicated MACD creation function
                    createMACDIndicator(indicator);
                    break;

                  case "Stochastic":
                    // Use our dedicated Stochastic creation function
                    createStochasticIndicator(indicator);
                    break;
                }
              } catch (error) {
                console.error("Error creating indicator:", error);
              }

              // If we have a series attached to this indicator, update its data
              if (indicator.series && formattedCandles.length > 0) {
                // Calculate the indicator values based on type
                switch (indicator.type) {
                  case "SMA":
                    // Simple Moving Average calculation
                    const period = Number(indicator.parameters.period) || 20;
                    const smaData = calculateSMA(formattedCandles, period);
                    indicator.series.setData(smaData);
                    break;
                  case "EMA":
                    // Exponential Moving Average calculation
                    const emaPeriod = Number(indicator.parameters.period) || 20;
                    const emaData = calculateEMA(formattedCandles, emaPeriod);
                    indicator.series.setData(emaData);
                    break;
                  case "RSI":
                    // Relative Strength Index calculation
                    const rsiPeriod = Number(indicator.parameters.period) || 14;
                    const rsiData = calculateRSI(formattedCandles, rsiPeriod);
                    indicator.series.setData(rsiData);
                    break;
                  case "MACD":
                    // MACD data is handled within the createMACDIndicator function
                    // or we can manually update it here
                    updateMACDData(indicator, formattedCandles);
                    break;
                  case "Stochastic":
                    // Stochastic data is handled within the createStochasticIndicator function
                    // No need to update here as we're using the updateData method of the indicator
                    break;
                }
              }
            });

            // Store current indicators in ref for cleanup
            indicators.forEach((indicator) => {
              prevIndicatorsRef.current[indicator.id] = indicator;
            });
          } catch (error) {
            console.error("Error processing indicators:", error);
          }
        }, 0);
      } catch (error) {
        console.error("Error resetting chart:", error);
      }
    }
  }, [candles, resolvedTheme, indicators]); // Add indicators to dependencies

  /**
   * Create MACD indicator
   */
  const createMACDIndicator = (indicator: IndicatorConfig) => {
    if (!chartInstanceRef.current.chart) {
      console.error("[createMACDIndicator] Chart is null");
      return;
    }

    // Always use volume pane (index 1) for MACD indicators
    const macdPaneIndex = 1;

    // Generate a unique price scale ID for this specific MACD instance
    const uniquePriceScaleId = `macd-${Date.now()}-scale`;

    console.log(`[MACD DEBUG] Creating MACD indicator in pane ${macdPaneIndex} with price scale ID: ${uniquePriceScaleId}`);

    try {
      // Create MACD with properly defined parameters
      const macdIndicator = createIndicator("MACD", {
        ...indicator.parameters,
        priceScaleId: uniquePriceScaleId,
        paneIndex: macdPaneIndex,
      });

      // Initialize with our chart
      macdIndicator.initialize(chartInstanceRef.current.chart as unknown as ChartApiWithPanes, indicator);

      // Create series in the specified pane
      const series = macdIndicator.createSeries(macdPaneIndex);

      if (series) {
        console.log(`[MACD DEBUG] Successfully created MACD indicator in pane ${macdPaneIndex}`);
        indicator.series = series;
        indicator.paneIndex = macdPaneIndex;

        // Store renderer reference
        indicatorRenderersRef.current[indicator.id] = macdIndicator;

        // Calculate and set initial MACD data if we have candles
        if (candles && candles.length > 0) {
          const formattedCandles = formatCandlesForIndicator(candles);
          macdIndicator.updateData(formattedCandles);
          console.log(`[MACD DEBUG] Updated MACD with ${formattedCandles.length} candles`);
        }

        // Store the indicator config for later reference
        prevIndicatorsRef.current[indicator.id] = indicator;
      } else {
        console.error(`[MACD ERROR] Failed to create MACD indicator series`);
      }
    } catch (error) {
      console.error("[MACD ERROR] Error creating MACD indicator:", error);
    }
  };

  // Calculate and update MACD data
  const updateMACDData = (indicator: IndicatorConfig, formattedCandles: FormattedCandle[]) => {
    try {
      // Check if we have a renderer for this MACD
      const renderer = indicatorRenderersRef.current[indicator.id];

      if (renderer) {
        // Use the renderer's updateData method directly
        renderer.updateData(formattedCandles);
        console.log("CHART DEBUG: Updated MACD data using renderer");
        return;
      }

      // Fallback to old implementation if renderer not available
      const fastPeriod = indicator.parameters.fastPeriod || 12;
      const slowPeriod = indicator.parameters.slowPeriod || 26;
      const signalPeriod = indicator.parameters.signalPeriod || 9;

      const macdData = calculateMACD(formattedCandles, fastPeriod, slowPeriod, signalPeriod);

      // Get the series from the indicator
      const macdSeries = indicator.series;
      const signalSeries = indicator.parameters.additionalSeries?.signalSeries;
      const histogramSeries = indicator.parameters.additionalSeries?.histogramSeries;

      // Set data for MACD line
      if (macdSeries && macdData.macdLine.length > 0) {
        macdSeries.setData(macdData.macdLine);
      }

      // Set data for Signal line
      if (signalSeries && macdData.signalLine.length > 0) {
        signalSeries.setData(macdData.signalLine);
      }

      // Set data for Histogram with colors
      if (histogramSeries && macdData.histogram.length > 0) {
        const histogramPositiveColor = indicator.parameters.histogramColorPositive || "#26A69A";
        const histogramNegativeColor = indicator.parameters.histogramColorNegative || "#EF5350";

        const coloredHistogram = macdData.histogram.map((item) => ({
          time: item.time,
          value: item.value,
          color: item.value >= 0 ? histogramPositiveColor : histogramNegativeColor,
        }));

        histogramSeries.setData(coloredHistogram);
      }

      console.log("CHART DEBUG: Updated MACD data using legacy method");
    } catch (error) {
      console.error("CHART DEBUG: Error updating MACD data:", error);
    }
  };

  // Calculate MACD - Moving Average Convergence Divergence
  function calculateMACD(candles: FormattedCandle[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
    // Calculate the EMAs
    const fastEMA = calculateEMA(candles, fastPeriod);
    const slowEMA = calculateEMA(candles, slowPeriod);

    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine: { time: Time; value: number }[] = [];

    // Need to align the EMAs by time
    const emaMap = new Map<string, { fast?: number; slow?: number }>();

    // Populate the map with slow EMA values
    slowEMA.forEach((point) => {
      const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();
      emaMap.set(timeKey, { slow: point.value });
    });

    // Add fast EMA values and calculate MACD line
    fastEMA.forEach((point) => {
      const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();

      const entry = emaMap.get(timeKey) || {};
      entry.fast = point.value;
      emaMap.set(timeKey, entry);

      if (entry.slow !== undefined && entry.fast !== undefined) {
        macdLine.push({
          time: point.time,
          value: entry.fast - entry.slow,
        });
      }
    });

    // Calculate signal line (EMA of MACD line)
    const signalLine = calculateEMAFromPoints(macdLine, signalPeriod);

    // Calculate histogram (MACD line - signal line)
    const histogram: { time: Time; value: number }[] = [];

    // Align MACD and signal by time
    const lineMap = new Map<string, { macd?: number; signal?: number }>();

    // Populate with MACD values
    macdLine.forEach((point) => {
      const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();
      lineMap.set(timeKey, { macd: point.value });
    });

    // Add signal values and calculate histogram
    signalLine.forEach((point) => {
      const timeKey = typeof point.time === "number" ? point.time.toString() : point.time.toString();

      const entry = lineMap.get(timeKey) || {};
      entry.signal = point.value;
      lineMap.set(timeKey, entry);

      if (entry.macd !== undefined && entry.signal !== undefined) {
        histogram.push({
          time: point.time,
          value: entry.macd - entry.signal,
        });
      }
    });

    return { macdLine, signalLine, histogram };
  }

  // Helper to calculate EMA from an array of points
  function calculateEMAFromPoints(points: { time: Time; value: number }[], period: number) {
    if (points.length < period) {
      return [];
    }

    const k = 2 / (period + 1);
    const result: { time: Time; value: number }[] = [];

    // Initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += points[i].value;
    }
    let ema = sum / period;

    // First EMA uses SMA as previous
    result.push({
      time: points[period - 1].time,
      value: ema,
    });

    // Calculate remaining EMAs
    for (let i = period; i < points.length; i++) {
      ema = (points[i].value - ema) * k + ema;
      result.push({
        time: points[i].time,
        value: ema,
      });
    }

    return result;
  }

  // Legacy MACD cleanup function
  const cleanupMACDIndicator = (indicator: IndicatorConfig) => {
    if (!chartInstanceRef.current.chart) return;

    try {
      // Remove main MACD series
      if (indicator.series) {
        chartInstanceRef.current.chart.removeSeries(indicator.series);
      }

      // Remove additional series from MACD
      const signalSeries = indicator.parameters.additionalSeries?.signalSeries;
      const histogramSeries = indicator.parameters.additionalSeries?.histogramSeries;

      if (signalSeries) {
        chartInstanceRef.current.chart.removeSeries(signalSeries);
      }

      if (histogramSeries) {
        chartInstanceRef.current.chart.removeSeries(histogramSeries);
      }

      console.log(`CHART DEBUG: Cleaned up legacy MACD indicator ${indicator.id}`);
    } catch (error) {
      console.error("CHART DEBUG: Error cleaning up legacy MACD:", error);
    }
  };

  /**
   * Create a Stochastic Indicator
   */
  const createStochasticIndicator = (indicator: IndicatorConfig) => {
    try {
      if (!chartInstanceRef.current?.chart) {
        console.error("CHART DEBUG: Cannot create Stochastic indicator without chart");
        return;
      }

      console.log(`CHART DEBUG: Creating Stochastic indicator with id ${indicator.id}`);
      console.log(`CHART DEBUG: Stochastic parameters:`, indicator.parameters);

      // CRITICAL FIX: Always use pane 1 for all Stochastic indicators
      // Pane 1 typically contains volume but can accommodate oscillators
      const stochasticPaneIndex = 1;
      console.log(`CHART DEBUG: Using FIXED pane ${stochasticPaneIndex} for ALL Stochastic indicators`);

      // Store pane assignment for tracking
      const stochasticPaneKey = `Stochastic-${indicator.id}`;
      oscillatorPanesRef.current[stochasticPaneKey] = stochasticPaneIndex;

      // Update indicator parameters with our fixed pane assignment
      indicator.parameters.paneIndex = stochasticPaneIndex;

      // Create a unique price scale ID for this instance
      // This ensures components of one indicator share same scale but different indicators don't interfere
      const priceScaleId = `stochastic-${indicator.id}-${Date.now()}`;
      console.log(`CHART DEBUG: Generated price scale ID: ${priceScaleId}`);
      indicator.parameters.priceScaleId = priceScaleId;

      // Create the Stochastic indicator with our renderer
      const stochasticIndicator = createIndicator("Stochastic", {
        ...indicator.parameters,
        kPeriod: indicator.parameters.kPeriod || 14,
        dPeriod: indicator.parameters.dPeriod || 3,
        overboughtLevel: indicator.parameters.overboughtLevel || 80,
        oversoldLevel: indicator.parameters.oversoldLevel || 20,
        kLineColor: indicator.parameters.kLineColor || "#2962FF", // Blue for %K line
        dLineColor: indicator.parameters.dLineColor || "#FF6D00", // Orange for %D line
        overboughtLineColor: indicator.parameters.overboughtLineColor || "#787B86",
        oversoldLineColor: indicator.parameters.oversoldLineColor || "#787B86",
        paneIndex: stochasticPaneIndex, // FIXED pane assignment
        priceScaleId: priceScaleId,
        type: "Stochastic",
      });

      // Initialize with our chart - use casting to bypass the type check
      stochasticIndicator.initialize(chartInstanceRef.current.chart as unknown as ChartApiWithPanes, indicator);

      // Create series in the specified pane
      const series = stochasticIndicator.createSeries(stochasticPaneIndex);

      console.log(`CHART DEBUG: Series created:`, series ? "Success" : "Failed");

      // Store the series and update configuration
      if (series) {
        indicator.series = series;
        indicator.paneIndex = stochasticPaneIndex;
        console.log(`CHART DEBUG: Stochastic indicator ${indicator.id} created successfully in pane ${stochasticPaneIndex}`);
      } else {
        console.error(`CHART DEBUG: Failed to create series for Stochastic ${indicator.id}`);
      }

      // Store renderer reference
      indicatorRenderersRef.current[indicator.id] = stochasticIndicator;

      // Update data if we have candles
      if (candles && candles.length > 0) {
        const formattedCandles = candles.map((candle) => {
          return {
            time: (candle.timestamp / 1000) as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            value: candle.close,
          } as FormattedCandle;
        });

        stochasticIndicator.updateData(formattedCandles);
        console.log(`CHART DEBUG: Updated Stochastic ${indicator.id} with ${formattedCandles.length} candles`);
      }

      // Store the indicator config
      prevIndicatorsRef.current[indicator.id] = indicator;

      return stochasticIndicator;
    } catch (error) {
      console.error("CHART DEBUG: Error creating Stochastic indicator:", error);
    }
  };

  /**
   * Format candles for indicator use
   */
  const formatCandlesForIndicator = (candlesToFormat: Candle[]): FormattedCandle[] => {
    return candlesToFormat.map((candle) => {
      return {
        time: (candle.timestamp / 1000) as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        value: candle.close,
      } as FormattedCandle;
    });
  };

  if (!pair) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-slate-500 dark:text-slate-400">Select a trading pair to view chart</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Improved Trading View-style chart header with indicator management */}
      <ChartHeader
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={handleTimeframeChange}
        openIndicatorDialog={openIndicatorDialog}
        activeIndicators={indicators as unknown as { id: string; name: string; type: IndicatorType }[]}
        onRemoveIndicator={handleRemoveIndicator}
      />

      <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
            <p>Loading chart data...</p>
            <p className="text-xs mt-1">Timeframe: {selectedTimeframe}</p>
            {isRetrying && (
              <div className="mt-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>Retrying request ({retryCount}/3)...</span>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-lg text-center">
              <AlertCircle className="h-8 w-8 mb-2 mx-auto" />
              <p className="font-medium">Error loading chart data</p>
              <p className="text-sm mt-1">{error}</p>
              {error.includes("rate limit") && (
                <p className="text-xs mt-3 text-slate-500 dark:text-slate-400">The broker API has rate limits to prevent abuse. Please wait a few minutes and try again.</p>
              )}
            </div>
            <Button className="mt-4" variant="outline" onClick={handleRetry} size="sm">
              Try Again
            </Button>
          </div>
        ) : candles && candles.length > 0 ? (
          <div ref={chartContainerRef} className="w-full h-full" />
        ) : (
          <div className="text-slate-500 dark:text-slate-400">
            <p>No chart data available</p>
            <p className="text-xs mt-1">Try selecting a different trading pair or timeframe</p>
          </div>
        )}
      </div>

      {/* Only render IndicatorManager for the dialog functionality */}
      <IndicatorManager
        indicators={indicators}
        onIndicatorsChange={setIndicators}
        selectedIndicatorType={selectedIndicatorType}
        isDialogOpen={indicatorDialogOpen}
        onDialogOpenChange={setIndicatorDialogOpen}
      />
    </div>
  );
}
