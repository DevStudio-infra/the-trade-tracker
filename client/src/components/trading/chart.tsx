"use client";

// import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useApi, Candle } from "@/lib/api";
import { useTradingStore } from "@/stores/trading-store";
import { toast } from "sonner";
import { Loader2, AlertCircle, BarChart4, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time, CandlestickData, HistogramData } from "lightweight-charts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

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

// Define top indicators
type IndicatorType = "sma" | "ema" | "rsi" | "macd" | "bollinger" | "stochastic" | "atr" | "ichimoku" | "fibonacci" | "volume";

// Define types for indicator parameters
interface IndicatorParameters {
  period?: number;
  color?: string;
  overbought?: number;
  oversold?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  macdColor?: string;
  signalColor?: string;
  histogramColorPositive?: string;
  histogramColorNegative?: string;
  stdDev?: number;
  kPeriod?: number;
  dPeriod?: number;
  conversionPeriod?: number;
  basePeriod?: number;
  spanPeriod?: number;
  displacement?: number;
  levels?: number[];
  upColor?: string;
  downColor?: string;
}

interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  color: string;
  visible: boolean;
  parameters: IndicatorParameters;
  series?: ISeriesApi<"Line" | "Histogram" | "Area"> | null;
}

// Common indicator default parameters
const indicatorDefaults: Record<IndicatorType, { name: string; parameters: IndicatorParameters }> = {
  sma: {
    name: "Simple Moving Average",
    parameters: { period: 20, color: "#2962FF" },
  },
  ema: {
    name: "Exponential Moving Average",
    parameters: { period: 20, color: "#FF6D00" },
  },
  rsi: {
    name: "Relative Strength Index",
    parameters: { period: 14, color: "#F44336", overbought: 70, oversold: 30 },
  },
  macd: {
    name: "MACD",
    parameters: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      macdColor: "#2962FF",
      signalColor: "#FF6D00",
      histogramColorPositive: "#26A69A",
      histogramColorNegative: "#EF5350",
    },
  },
  bollinger: {
    name: "Bollinger Bands",
    parameters: { period: 20, stdDev: 2, color: "#7B1FA2" },
  },
  stochastic: {
    name: "Stochastic Oscillator",
    parameters: { kPeriod: 14, dPeriod: 3, color: "#43A047" },
  },
  atr: {
    name: "Average True Range",
    parameters: { period: 14, color: "#FFB300" },
  },
  ichimoku: {
    name: "Ichimoku Cloud",
    parameters: {
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
    },
  },
  fibonacci: {
    name: "Fibonacci Retracement",
    parameters: { levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] },
  },
  volume: {
    name: "Volume",
    parameters: {
      upColor: "rgba(76, 175, 80, 0.5)",
      downColor: "rgba(255, 82, 82, 0.5)",
    },
  },
};

// Define a type for candle data to address 'any' type warnings
interface FormattedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

export function TradingChart({ pair }: TradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [precision, setPrecision] = useState(5); // Default precision
  const [error, setError] = useState<string | null>(null);
  const [brokerConnectionIssue, setBrokerConnectionIssue] = useState(false);
  const { resolvedTheme } = useTheme(); // Get current theme

  // Track request state to prevent loops
  const requestInProgressRef = useRef(false);
  const requestParamsRef = useRef<{ pair: string; brokerId: string; timeframe: string } | null>(null);

  // References for chart elements
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

  // Reference to track indicators for cleanup
  const prevIndicatorsRef = useRef<Record<string, IndicatorConfig>>({});

  const api = useApi();
  const { selectedBroker } = useTradingStore();
  const settings = useSettings();

  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [selectedIndicatorType, setSelectedIndicatorType] = useState<IndicatorType | null>(null);
  const [indicatorParams, setIndicatorParams] = useState<IndicatorParameters>({});
  const [indicatorName, setIndicatorName] = useState("");

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

    // Create chart instance
    const chart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontSize: 12,
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

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
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
    });

    // Add volume series with separate panel configuration
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: "volume",
      },
      // Configure as a separate panel with its own price scale
      priceScaleId: "volume", // Unique ID for the volume price scale
      color: colors.volumeUp,
    });

    // Configure the volume panel to be at the bottom with smaller height
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85, // Start at 85% from the top (smaller panel at the bottom)
        bottom: 0.05, // Add a small margin at the bottom
      },
      // Hide the scale values for cleaner appearance
      borderVisible: true,
      borderColor: colors.borderColor,
      // Show scale values (optional)
      visible: true,
    });

    // Configure the main price scale for candlesticks
    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.05, // Small margin at top
        bottom: 0.25, // Leave 25% space at bottom for volume panel
      },
    });

    // Store references
    chartInstanceRef.current = {
      chart,
      candlestickSeries,
      volumeSeries,
    };

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
                  case "sma":
                  case "ema":
                    // Create a line series for moving averages
                    const lineSeries = chartInstanceRef.current.chart.addLineSeries({
                      color: indicator.color,
                      lineWidth: 2,
                      priceLineVisible: false,
                      lastValueVisible: true,
                      crosshairMarkerVisible: true,
                      title: `${indicator.type.toUpperCase()} (${indicator.parameters.period})`,
                    });

                    // Add to the indicator object for future reference
                    indicator.series = lineSeries;
                    break;
                  case "rsi":
                    // RSI typically appears in a separate panel
                    const rsiSeries = chartInstanceRef.current.chart.addLineSeries({
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

                    // Configure the panel for RSI
                    rsiSeries.priceScale().applyOptions({
                      scaleMargins: {
                        top: 0.85, // Small panel at bottom of chart, below price and volume
                        bottom: 0.0,
                      },
                      borderVisible: true,
                      borderColor: getChartColors().borderColor,
                      visible: true,
                    });

                    // Add to the indicator object for future reference
                    indicator.series = rsiSeries;
                    break;
                  // Additional indicator types would be handled here
                }
              }

              // If we have a series attached to this indicator, update its data
              if (indicator.series && formattedCandlesRef.length > 0) {
                // Calculate the indicator values based on type
                switch (indicator.type) {
                  case "sma":
                    // Simple Moving Average calculation
                    const period = Number(indicator.parameters.period) || 20;
                    const smaData = calculateSMA(formattedCandlesRef, period);
                    indicator.series.setData(smaData);
                    break;
                  case "ema":
                    // Exponential Moving Average calculation
                    const emaPeriod = Number(indicator.parameters.period) || 20;
                    const emaData = calculateEMA(formattedCandlesRef, emaPeriod);
                    indicator.series.setData(emaData);
                    break;
                  case "rsi":
                    // Relative Strength Index calculation
                    const rsiPeriod = Number(indicator.parameters.period) || 14;
                    const rsiData = calculateRSI(formattedCandlesRef, rsiPeriod);
                    indicator.series.setData(rsiData);
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
    if (!chartInstanceRef.current.chart) return;

    // Clean up any removed indicators
    const indicatorIds = indicators.map((i) => i.id);
    const storedIds = Object.keys(prevIndicatorsRef.current);

    // Find indicators that were removed
    storedIds.forEach((id) => {
      if (!indicatorIds.includes(id) && prevIndicatorsRef.current[id]?.series) {
        try {
          // If the chart still exists, remove the series
          chartInstanceRef.current.chart?.removeSeries(prevIndicatorsRef.current[id].series!);
          // Remove from our reference object
          delete prevIndicatorsRef.current[id];
          console.log(`Removed indicator: ${id}`);
        } catch (err) {
          console.error("Error removing indicator series:", err);
        }
      }
    });
  }, [indicators]);

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

  const handleRetry = () => {
    // Clear previous request params to force a new fetch
    requestParamsRef.current = null;
    setError(null);
  };

  // Function to open the indicator dialog
  const openIndicatorDialog = (type: IndicatorType) => {
    console.log("Opening dialog for:", type);

    // Get default parameters
    const defaults = indicatorDefaults[type];

    // Set dialog state
    setSelectedIndicatorType(type);
    setIndicatorName(defaults.name);
    setIndicatorParams({ ...defaults.parameters });

    // Open the dialog with a small delay to ensure state is set first
    setTimeout(() => {
      setIndicatorDialogOpen(true);
    }, 50);
  };

  // Function to add a new indicator
  const handleAddIndicator = () => {
    if (!selectedIndicatorType) return;

    const newIndicator: IndicatorConfig = {
      id: `${selectedIndicatorType}-${Date.now()}`,
      type: selectedIndicatorType,
      name: indicatorName,
      color: selectedIndicatorType === "macd" ? indicatorParams.macdColor || "#2962FF" : indicatorParams.color || "#4CAF50",
      visible: true,
      parameters: { ...indicatorParams },
    };

    // Add to indicators list
    setIndicators((prev) => [...prev, newIndicator]);

    // Close dialog and reset state
    setIndicatorDialogOpen(false);
    setSelectedIndicatorType(null);

    // Show success message
    toast.success(`${indicatorName} added to chart`);
  };

  // Function to remove an indicator
  const handleRemoveIndicator = (id: string) => {
    setIndicators((prev) => prev.filter((indicator) => indicator.id !== id));
    toast.success("Indicator removed");
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
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chart</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{pair}</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Indicators Management Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1 font-medium" disabled={isLoading}>
                <BarChart4 className="h-4 w-4" />
                <span>Indicators</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => openIndicatorDialog("sma")}>Simple Moving Average (SMA)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openIndicatorDialog("ema")}>Exponential Moving Average (EMA)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openIndicatorDialog("rsi")}>Relative Strength Index (RSI)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openIndicatorDialog("macd")}>MACD</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openIndicatorDialog("bollinger")}>Bollinger Bands</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openIndicatorDialog("stochastic")}>Stochastic Oscillator</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openIndicatorDialog("atr")}>Average True Range (ATR)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openIndicatorDialog("ichimoku")}>Ichimoku Cloud</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openIndicatorDialog("fibonacci")}>Fibonacci Retracement</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active indicators list */}
          {indicators.length > 0 && (
            <div className="flex gap-1 items-center overflow-x-auto py-0.5 px-1 max-w-xs">
              {indicators.map((indicator) => (
                <Badge
                  key={indicator.id}
                  variant="outline"
                  className="flex items-center gap-1 py-0 h-6 text-xs cursor-pointer group"
                  style={{ borderColor: indicator.color + "80" }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: indicator.color }} />
                  <span>
                    {indicator.type.toUpperCase()}-{indicator.parameters.period || "—"}
                  </span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1 opacity-70 hover:opacity-100" onClick={() => handleRemoveIndicator(indicator.id)}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Timeframe selection */}
          <div className="flex gap-2">
            {timeframes.map((timeframe) => (
              <Button
                key={timeframe}
                variant="ghost"
                size="sm"
                className={cn(
                  "font-medium",
                  selectedTimeframe === timeframe
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                onClick={() => handleTimeframeChange(timeframe)}
                disabled={isLoading || isRetrying}>
                {timeframe}
              </Button>
            ))}
          </div>
        </div>
      </div>

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

      {/* Indicator Dialog */}
      <Dialog
        open={indicatorDialogOpen}
        onOpenChange={(open) => {
          console.log("Dialog open state changed:", open);
          setIndicatorDialogOpen(open);
          if (!open) {
            // Reset on close
            setSelectedIndicatorType(null);
          }
        }}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>Add Indicator</DialogTitle>
          </DialogHeader>

          {selectedIndicatorType && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="indicator-name">Name</Label>
                <Input id="indicator-name" value={indicatorName} onChange={(e) => setIndicatorName(e.target.value)} />
              </div>

              {/* Parameter fields based on indicator type */}
              {(selectedIndicatorType === "sma" || selectedIndicatorType === "ema") && (
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    type="number"
                    min={1}
                    max={200}
                    value={indicatorParams.period || 20}
                    onChange={(e) =>
                      setIndicatorParams({
                        ...indicatorParams,
                        period: parseInt(e.target.value),
                      })
                    }
                  />

                  <div className="pt-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="color"
                        type="color"
                        value={indicatorParams.color || "#2962FF"}
                        className="w-16 h-8 p-1"
                        onChange={(e) =>
                          setIndicatorParams({
                            ...indicatorParams,
                            color: e.target.value,
                          })
                        }
                      />
                      <Input
                        value={indicatorParams.color || "#2962FF"}
                        onChange={(e) =>
                          setIndicatorParams({
                            ...indicatorParams,
                            color: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* RSI Parameters */}
              {selectedIndicatorType === "rsi" && (
                <div className="space-y-2">
                  <Label htmlFor="rsi-period">Period</Label>
                  <Input
                    id="rsi-period"
                    type="number"
                    min={1}
                    max={100}
                    value={indicatorParams.period || 14}
                    onChange={(e) =>
                      setIndicatorParams({
                        ...indicatorParams,
                        period: parseInt(e.target.value),
                      })
                    }
                  />

                  <div className="pt-2">
                    <Label htmlFor="rsi-color">Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="rsi-color"
                        type="color"
                        value={indicatorParams.color || "#F44336"}
                        className="w-16 h-8 p-1"
                        onChange={(e) =>
                          setIndicatorParams({
                            ...indicatorParams,
                            color: e.target.value,
                          })
                        }
                      />
                      <Input
                        value={indicatorParams.color || "#F44336"}
                        onChange={(e) =>
                          setIndicatorParams({
                            ...indicatorParams,
                            color: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label htmlFor="overbought">Overbought</Label>
                      <Input
                        id="overbought"
                        type="number"
                        min={50}
                        max={100}
                        value={indicatorParams.overbought || 70}
                        onChange={(e) =>
                          setIndicatorParams({
                            ...indicatorParams,
                            overbought: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="oversold">Oversold</Label>
                      <Input
                        id="oversold"
                        type="number"
                        min={0}
                        max={50}
                        value={indicatorParams.oversold || 30}
                        onChange={(e) =>
                          setIndicatorParams({
                            ...indicatorParams,
                            oversold: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional indicator parameters can be added here */}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIndicatorDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIndicator}>Add Indicator</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
