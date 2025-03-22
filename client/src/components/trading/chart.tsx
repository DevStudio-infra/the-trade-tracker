"use client";

// import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useApi, Candle } from "@/lib/api";
import { useTradingStore } from "@/stores/trading-store";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { createChart, ColorType, CandlestickData, HistogramData, Time, IChartApi, ISeriesApi } from "lightweight-charts";
import { useTheme } from "next-themes";

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

export function TradingChart({ pair }: TradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [precision, setPrecision] = useState(5); // Default precision
  const [error, setError] = useState<string | null>(null);
  const [brokerConnectionIssue, setBrokerConnectionIssue] = useState(false);
  const { theme } = useTheme(); // Get current theme

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

  const api = useApi();
  const { selectedBroker } = useTradingStore();
  const { brokerConnections } = useSettings();

  // Function to get chart colors based on theme
  const getChartColors = () => {
    return theme === "dark" ? chartColors.dark : chartColors.light;
  };

  // Add logging to check broker connections
  useEffect(() => {
    console.log("TradingChart - Broker data:", {
      selectedBroker,
      connections: brokerConnections,
      hasConnections: Array.isArray(brokerConnections) && brokerConnections.length > 0,
      activeBrokerFound: Array.isArray(brokerConnections) && selectedBroker ? brokerConnections.some((conn) => conn.id === selectedBroker.id) : false,
    });

    // Reset any error related to broker connections when the connections change
    if (brokerConnectionIssue && Array.isArray(brokerConnections) && brokerConnections.length > 0) {
      setBrokerConnectionIssue(false);
      setError(null);
    }
  }, [brokerConnections, selectedBroker, brokerConnectionIssue]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
      chart.remove();
      chartInstanceRef.current = {
        chart: null,
        candlestickSeries: null,
        volumeSeries: null,
      };
    };
  }, [candles, theme]); // Add theme to dependencies to recreate chart when theme changes

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
  }, [candles, theme]); // Add theme to dependencies

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
    if (!Array.isArray(brokerConnections) || brokerConnections.length === 0) {
      console.error("No broker connections available");
      setError("No broker connections available. Please connect a broker first.");
      setBrokerConnectionIssue(true);
      return;
    }

    // Check if the selected broker exists in the connections
    const brokerExists = brokerConnections.some((conn) => conn.id === selectedBroker.id);
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
    brokerConnections, // Add this to the dependency array to react to connection changes
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
    </div>
  );
}
