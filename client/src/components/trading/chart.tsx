"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useApi, Candle } from "@/lib/api";
import { useTradingStore } from "@/stores/trading-store";
import { toast } from "sonner";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { createChart, HistogramSeries, CandlestickSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { Button } from "@/components/ui/button";

// Import refactored components
import { ChartHeader } from "./chart/ChartHeader";
import { IndicatorControls } from "./chart/indicators/IndicatorControls";
import { useIndicatorStore } from "./chart/indicators/indicatorStore";
import { ChartApiWithPanes } from "./chart/core/ChartTypes";

// Chart colors configuration
const chartColors = {
  light: {
    background: "#FFFFFF",
    text: "#333333",
    gridLines: "#EAEAEA",
    borderColor: "#DDDDDD",
    upColor: "#26A69A",
    downColor: "#EF5350",
    wickUpColor: "#26A69A",
    wickDownColor: "#EF5350",
    volumeUp: "rgba(38, 166, 154, 0.5)",
    volumeDown: "rgba(239, 83, 80, 0.5)",
    crosshairColor: "#999999",
  },
  dark: {
    background: "#1E222D",
    text: "#DDD",
    gridLines: "#2B2B43",
    borderColor: "#2B2B43",
    upColor: "#4CAF50",
    downColor: "#FF5252",
    wickUpColor: "#4CAF50",
    wickDownColor: "#FF5252",
    volumeUp: "rgba(76, 175, 80, 0.5)",
    volumeDown: "rgba(255, 82, 82, 0.5)",
    crosshairColor: "#999999",
  },
};

interface ChartContextValue {
  _api: IChartApi | null;
  isRemoved: boolean;
}

interface TradingChartProps {
  pair: string | null;
}

// Add these types at the top of the file
type FetchState = "idle" | "loading" | "success" | "error";

interface ChartState {
  candles: Candle[] | null;
  error: string | null;
  fetchState: FetchState;
  lastSuccessfulFetch: {
    pair: string;
    brokerId: string;
    timeframe: string;
    timestamp: number;
  } | null;
}

export function TradingChart({ pair }: TradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [chartState, setChartState] = useState<ChartState>({
    candles: null,
    error: null,
    fetchState: "idle",
    lastSuccessfulFetch: null,
  });

  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Chart refs
  const chartApiRef = useRef<ChartContextValue>({
    _api: null,
    isRemoved: false,
  });

  const seriesRef = useRef<{
    candlestick: ISeriesApi<"Candlestick"> | null;
    volume: ISeriesApi<"Histogram"> | null;
  }>({
    candlestick: null,
    volume: null,
  });

  // Hooks
  const api = useApi();
  const { selectedBroker } = useTradingStore();
  const { resolvedTheme } = useTheme();
  const { getIndicators, setChartInstance, updateData, removeIndicator } = useIndicatorStore();
  const indicators = getIndicators();

  // Function to check if we should fetch data
  const shouldFetchData = (currentParams: { pair: string; brokerId: string; timeframe: string }) => {
    if (isManualRefresh) {
      return true;
    }

    if (chartState.fetchState === "loading") {
      console.log("Skipping fetch - already loading");
      return false;
    }

    if (!chartState.lastSuccessfulFetch) {
      return true;
    }

    const timeSinceLastFetch = Date.now() - chartState.lastSuccessfulFetch.timestamp;
    const hasParamsChanged =
      currentParams.pair !== chartState.lastSuccessfulFetch.pair ||
      currentParams.brokerId !== chartState.lastSuccessfulFetch.brokerId ||
      currentParams.timeframe !== chartState.lastSuccessfulFetch.timeframe;

    // Only fetch if params changed or it's been more than 5 minutes
    return hasParamsChanged || timeSinceLastFetch > 300000;
  };

  // Fetch data function
  const fetchChartData = async (params: { pair: string; brokerId: string; timeframe: string }) => {
    const requestId = `${params.pair}-${params.brokerId}-${params.timeframe}-${Date.now()}`;
    console.log("Starting fetch:", requestId, params);

    try {
      setChartState((prev) => ({
        ...prev,
        fetchState: "loading",
        error: null,
      }));

      const response = await api.sendTradingData(params.brokerId, params.pair, params.timeframe);

      if (!response.success) {
        throw new Error("Failed to fetch data");
      }

      if (!response.data?.candles?.length) {
        throw new Error("No data received from server");
      }

      console.log("Fetch successful:", requestId, {
        candlesCount: response.data.candles.length,
      });

      setChartState({
        candles: response.data.candles,
        error: null,
        fetchState: "success",
        lastSuccessfulFetch: {
          ...params,
          timestamp: Date.now(),
        },
      });

      // Only show success toast on manual refresh
      if (isManualRefresh) {
        toast.success("Chart data refreshed");
      }
    } catch (error) {
      console.error("Fetch failed:", requestId, error);

      setChartState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load chart data",
        fetchState: "error",
      }));

      // Only show error toast on manual refresh or first load
      if (isManualRefresh || !chartState.lastSuccessfulFetch) {
        toast.error("Failed to load chart data");
      }
    } finally {
      setIsManualRefresh(false);
    }
  };

  // Effect for data fetching
  useEffect(() => {
    if (!pair || !selectedBroker?.id) {
      console.log("Missing required params for fetch", { pair, brokerId: selectedBroker?.id });
      setChartState((prev) => ({
        ...prev,
        candles: null,
        fetchState: "idle",
        error: null,
      }));
      return;
    }

    const currentParams = {
      pair,
      brokerId: selectedBroker.id,
      timeframe: selectedTimeframe,
    };

    if (!shouldFetchData(currentParams)) {
      console.log("Skipping fetch - no update needed", currentParams);
      return;
    }

    fetchChartData(currentParams);
  }, [pair, selectedTimeframe, selectedBroker?.id, isManualRefresh]);

  // Initialize chart when container is available
  useLayoutEffect(() => {
    console.log("=== Chart Initialization Start ===");

    // Skip if no container or data
    if (!containerRef.current || !chartState.candles?.length) {
      console.log("Skipping chart initialization - no container or data:", {
        hasContainer: !!containerRef.current,
        containerDimensions: containerRef.current
          ? {
              clientWidth: containerRef.current.clientWidth,
              clientHeight: containerRef.current.clientHeight,
            }
          : null,
        hasData: !!chartState.candles?.length,
        dataLength: chartState.candles?.length,
      });
      return;
    }

    // Force layout calculation
    containerRef.current.getBoundingClientRect();

    let initAttempts = 0;
    const maxAttempts = 5;
    const attemptDelay = 100; // ms

    const tryInitializeChart = () => {
      console.log(`\nAttempt ${initAttempts + 1} to initialize chart`);

      const container = containerRef.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        console.log("Container not ready:", {
          exists: !!container,
          width: container?.clientWidth,
          height: container?.clientHeight,
          style: container?.style,
          className: container?.className,
        });

        if (initAttempts < maxAttempts) {
          initAttempts++;
          console.log(`Retrying in ${attemptDelay}ms...`);
          setTimeout(tryInitializeChart, attemptDelay);
          return;
        } else {
          console.error("Failed to initialize chart after max attempts");
          return;
        }
      }

      // Clean up any existing chart
      if (chartApiRef.current._api) {
        console.log("Cleaning up existing chart instance");
        if (seriesRef.current.candlestick) {
          chartApiRef.current._api.removeSeries(seriesRef.current.candlestick);
          seriesRef.current.candlestick = null;
        }
        if (seriesRef.current.volume) {
          chartApiRef.current._api.removeSeries(seriesRef.current.volume);
          seriesRef.current.volume = null;
        }
        chartApiRef.current._api.remove();
        chartApiRef.current._api = null;
      }

      try {
        const colors = resolvedTheme === "dark" ? chartColors.dark : chartColors.light;

        console.log("\nCreating chart with options:", {
          width: container.clientWidth,
          height: container.clientHeight,
          theme: resolvedTheme,
        });

        const chart = createChart(container, {
          width: container.clientWidth,
          height: container.clientHeight,
          layout: {
            background: { color: colors.background },
            textColor: colors.text,
            panes: {
              separatorColor: colors.gridLines,
              separatorHoverColor: colors.crosshairColor,
              enableResize: true,
            },
          },
          grid: {
            vertLines: { color: colors.gridLines },
            horzLines: { color: colors.gridLines },
          },
          crosshair: {
            vertLine: { color: colors.crosshairColor },
            horzLine: { color: colors.crosshairColor },
          },
        }) as ChartApiWithPanes;

        if (!chart) {
          console.error("Failed to create chart instance");
          return;
        }

        // Create oscillator pane if needed
        console.log("\nCreating oscillator pane...");
        try {
          // Create a pane for oscillators (RSI, MACD, etc.)
          const oscillatorPane = chart.addPane(150);
          if (oscillatorPane) {
            // Configure the oscillator pane's price scale
            const priceScale = oscillatorPane.priceScale("left");
            if (priceScale) {
              priceScale.applyOptions({
                scaleMargins: {
                  top: 0.1,
                  bottom: 0.1,
                },
                borderVisible: true,
                borderColor: colors.borderColor,
                visible: true,
              });
            }
            console.log("Created oscillator pane:", oscillatorPane);
          }
        } catch (error) {
          console.error("Error creating oscillator pane:", error);
          // Non-fatal error, continue with chart creation
        }

        chartApiRef.current._api = chart;
        chartApiRef.current.isRemoved = false;

        console.log("\nSetting chart instance in indicator store...");
        setChartInstance(chart as unknown as ChartApiWithPanes, seriesRef.current.candlestick);
        console.log(
          "Current indicators:",
          indicators.map((ind) => ({
            id: ind.getId(),
            type: ind.getType(),
            name: ind.getName(),
            isOscillator: ind.getType() === "RSI" || ind.getType() === "MACD" || ind.getType() === "Stochastic",
          }))
        );

        console.log("\nCreating series...");

        try {
          seriesRef.current.candlestick = chart.addSeries(CandlestickSeries, {
            upColor: colors.upColor,
            downColor: colors.downColor,
            borderVisible: false,
            wickUpColor: colors.wickUpColor,
            wickDownColor: colors.wickDownColor,
            lastValueVisible: true,
            priceLineVisible: true,
            priceFormat: {
              type: "price",
              precision: 5,
              minMove: 0.00001,
            },
          });

          seriesRef.current.candlestick.priceScale().applyOptions({
            autoScale: true,
            scaleMargins: {
              top: 0.1,
              bottom: 0.2,
            },
            borderVisible: true,
            borderColor: colors.borderColor,
          });

          seriesRef.current.volume = chart.addSeries(HistogramSeries, {
            color: colors.volumeUp,
            lastValueVisible: true,
            priceLineVisible: true,
            priceFormat: {
              type: "volume",
            },
            priceScaleId: "volume",
          });

          seriesRef.current.volume.priceScale().applyOptions({
            scaleMargins: {
              top: 0.8,
              bottom: 0.0,
            },
            borderVisible: true,
            borderColor: colors.borderColor,
            visible: true,
          });

          console.log("Series created successfully");

          // Set initial data
          if (chartState.candles?.length) {
            console.log("Setting initial data...");
            const formattedCandles = chartState.candles.map((candle) => ({
              time: (candle.timestamp / 1000) as Time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              value: candle.volume,
            }));

            seriesRef.current.candlestick.setData(
              formattedCandles.map(({ time, open, high, low, close }) => ({
                time,
                open,
                high,
                low,
                close,
              }))
            );

            seriesRef.current.volume.setData(
              formattedCandles.map(({ time, value, open, close }) => ({
                time,
                value,
                color: open <= close ? colors.volumeUp : colors.volumeDown,
              }))
            );

            // Initialize chart in indicator store
            console.log("Initializing chart in indicator store...");
            setChartInstance(chart as unknown as ChartApiWithPanes, seriesRef.current.candlestick);

            // Update indicators with initial data
            console.log("Updating indicators with initial data...");
            updateData(formattedCandles);
          }

          // Ensure content is visible
          chart.timeScale().fitContent();
          console.log("Chart initialization completed successfully");
        } catch (error) {
          console.error("Error creating series:", error);
          if (chart) {
            chart.remove();
            chartApiRef.current._api = null;
          }
          return;
        }

        const handleResize = () => {
          requestAnimationFrame(() => {
            if (!containerRef.current || !chartApiRef.current._api) {
              console.log("Skip resize - container or chart not available");
              return;
            }
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;
            console.log("Resizing chart:", {
              width: newWidth,
              height: newHeight,
              containerStyle: containerRef.current.style,
              containerClass: containerRef.current.className,
            });
            chartApiRef.current._api.resize(newWidth, newHeight, true);
            chartApiRef.current._api.timeScale().fitContent();
          });
        };

        window.addEventListener("resize", handleResize);
        console.log("Resize handler attached");

        return () => {
          console.log("Cleaning up chart...");
          window.removeEventListener("resize", handleResize);
          if (chartApiRef.current._api) {
            if (seriesRef.current.candlestick) {
              chartApiRef.current._api.removeSeries(seriesRef.current.candlestick);
              seriesRef.current.candlestick = null;
            }
            if (seriesRef.current.volume) {
              chartApiRef.current._api.removeSeries(seriesRef.current.volume);
              seriesRef.current.volume = null;
            }
            chartApiRef.current.isRemoved = true;
            chartApiRef.current._api.remove();
            chartApiRef.current._api = null;

            // Clear chart instance from indicator store
            setChartInstance(null);
          }
          console.log("Chart cleanup complete");
        };
      } catch (error) {
        console.error("Error in chart initialization:", error);
        return;
      }
    };

    // Start initialization attempts
    tryInitializeChart();
    console.log("=== Chart Initialization End ===");
  }, [resolvedTheme, setChartInstance, chartState.candles, updateData]);

  // Update chart data
  useEffect(() => {
    console.log("=== Chart Data Update Start ===");
    console.log("Update state:", {
      hasCandles: !!chartState.candles?.length,
      candlesCount: chartState.candles?.length,
      hasCandlestickSeries: !!seriesRef.current.candlestick,
      hasVolumeSeries: !!seriesRef.current.volume,
      hasChartInstance: !!chartApiRef.current._api,
      containerDimensions: containerRef.current
        ? {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          }
        : null,
    });

    if (!chartState.candles?.length || !seriesRef.current.candlestick || !seriesRef.current.volume) {
      console.log("Skipping chart update - missing required data or series");
      return;
    }

    const updateId = Date.now();
    console.log(`\nStarting update ${updateId}:`, {
      candlesCount: chartState.candles.length,
      firstCandle: chartState.candles[0],
      lastCandle: chartState.candles[chartState.candles.length - 1],
    });

    try {
      const formattedCandles = chartState.candles.map((candle) => ({
        time: (candle.timestamp / 1000) as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        value: candle.volume,
      }));

      const colors = resolvedTheme === "dark" ? chartColors.dark : chartColors.light;

      console.log("Setting candlestick data...");
      seriesRef.current.candlestick.setData(
        formattedCandles.map(({ time, open, high, low, close }) => ({
          time,
          open,
          high,
          low,
          close,
        }))
      );

      console.log("Setting volume data...");
      seriesRef.current.volume.setData(
        formattedCandles.map(({ time, value, open, close }) => ({
          time,
          value,
          color: open <= close ? colors.volumeUp : colors.volumeDown,
        }))
      );

      // Update indicators
      console.log("Updating indicators...");
      updateData(formattedCandles);

      // Fit content and ensure visibility
      if (chartApiRef.current._api) {
        console.log("Fitting content to view");
        const timeScale = chartApiRef.current._api.timeScale();
        timeScale.applyOptions({
          rightOffset: 20,
          barSpacing: 8,
        });
        timeScale.fitContent();
      }

      console.log(`Chart update completed: ${updateId}`);
    } catch (err) {
      console.error(`Chart update failed: ${updateId}`, err);
      toast.error("Error updating chart display");
    }
    console.log("=== Chart Data Update End ===");
  }, [chartState.candles, resolvedTheme, updateData]);

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
        <ChartHeader
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          openIndicatorDialog={(type) => {
            console.log("Creating indicator from ChartHeader:", type);
            try {
              const { createAndAddIndicator } = useIndicatorStore.getState();
              const id = createAndAddIndicator(type);
              console.log("Successfully created indicator:", id);
            } catch (error) {
              console.error("Failed to create indicator:", error);
              toast.error(error instanceof Error ? error.message : "Failed to add indicator");
            }
          }}
          activeIndicators={indicators.map((ind) => ({
            id: ind.getId(),
            name: ind.getName(),
            type: ind.getType(),
          }))}
          onRemoveIndicator={(id) => {
            const indicator = indicators.find((ind) => ind.getId() === id);
            if (indicator) {
              removeIndicator(id);
            }
          }}
        />
        <Button variant="outline" size="sm" onClick={() => setIsManualRefresh(true)} disabled={chartState.fetchState === "loading"}>
          <RefreshCw className={`h-4 w-4 mr-2 ${chartState.fetchState === "loading" ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative w-full h-[600px]" style={{ minHeight: "500px" }}>
        {chartState.fetchState === "loading" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
            <p>Loading chart data...</p>
            <p className="text-xs mt-1">Timeframe: {selectedTimeframe}</p>
          </div>
        ) : chartState.fetchState === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center max-w-md mx-auto bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-lg text-center">
              <AlertCircle className="h-8 w-8 mb-2 mx-auto" />
              <p className="font-medium">Error loading chart data</p>
              <p className="text-sm mt-1">{chartState.error}</p>
            </div>
            <Button className="mt-4" variant="outline" onClick={() => setIsManualRefresh(true)} size="sm">
              Try Again
            </Button>
          </div>
        ) : chartState.candles && chartState.candles.length > 0 ? (
          <div
            ref={containerRef}
            className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-lg"
            style={{
              width: "100%",
              height: "100%",
              minHeight: "500px",
              visibility: chartState.fetchState === "success" ? "visible" : "hidden",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p>No chart data available</p>
            <p className="text-xs mt-1">Try selecting a different trading pair or timeframe</p>
          </div>
        )}
      </div>

      <IndicatorControls />
    </div>
  );
}
