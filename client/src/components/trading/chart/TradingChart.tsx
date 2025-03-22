"use client";

import { useState, useEffect, useRef } from "react";
import { useApi, Candle } from "@/lib/api";
import { useTradingStore } from "@/stores/trading-store";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { TradingChartProps, IndicatorConfig, IndicatorType, ChartInstanceRef, FormattedCandle } from "./utils/chartTypes";

// Import components
import { ChartContainer } from "./ChartContainer";
import { CandlestickRenderer } from "./CandlestickRenderer";
import { ChartHeader } from "./ChartHeader";
import { ChartLoadingState } from "./ChartLoadingState";
import { ChartErrorState } from "./ChartErrorState";
import { IndicatorManager } from "./indicators/IndicatorManager";
import { IndicatorRenderer } from "./indicators/IndicatorRenderer";

/**
 * Main Trading Chart component
 * Coordinates all chart sub-components and manages state
 */
export function TradingChart({ pair }: TradingChartProps) {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [precision, setPrecision] = useState(5); // Default precision
  const [error, setError] = useState<string | null>(null);
  const [brokerConnectionIssue, setBrokerConnectionIssue] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [chartInstance, setChartInstance] = useState<ChartInstanceRef | null>(null);
  const [formattedCandles, setFormattedCandles] = useState<FormattedCandle[]>([]);

  // Dialog state
  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [selectedIndicatorType, setSelectedIndicatorType] = useState<IndicatorType | null>(null);

  // Track request state to prevent loops
  const requestInProgressRef = useRef(false);
  const requestParamsRef = useRef<{ pair: string; brokerId: string; timeframe: string } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // External hooks
  const api = useApi();
  const { selectedBroker } = useTradingStore();
  const settings = useSettings();

  // Initialize chart instance callback
  const handleChartCreated = (newChartInstance: ChartInstanceRef) => {
    setChartInstance(newChartInstance);
  };

  // Format candles for rendering when candles change
  useEffect(() => {
    if (!candles) {
      setFormattedCandles([]);
      return;
    }

    // Format candle data for the chart
    const formatted = candles.map((candle) => {
      const time = (candle.timestamp / 1000) as number; // Convert timestamp to seconds as number type

      return {
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        value: candle.volume,
      } as FormattedCandle;
    });

    setFormattedCandles(formatted);
  }, [candles]);

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

        // The api.sendTradingData method handles retries internally
        const response = await api.sendTradingData(selectedBroker.id, pair, selectedTimeframe);

        if (!isMounted) return;

        if (response.success) {
          setCandles(response.data.candles);

          // Update precision from API response
          if (response.data.precision) {
            setPrecision(response.data.precision);
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
    selectedBroker?.id, // Use ID instead of the whole object
    settings?.brokerConnections, // React to connection changes
    api, // Include API in dependencies
    error, // Include error to retry on error changes
  ]);

  // Handle timeframe changes
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

  // Open the indicator dialog
  const openIndicatorDialog = (type: IndicatorType) => {
    console.log("Opening dialog for:", type);
    setSelectedIndicatorType(type);

    // Open the dialog with a small delay to ensure state is set first
    setTimeout(() => {
      setIndicatorDialogOpen(true);
    }, 50);
  };

  // Handle indicator updates
  const handleIndicatorUpdated = (updatedIndicator: IndicatorConfig) => {
    setIndicators((prev) => prev.map((indicator) => (indicator.id === updatedIndicator.id ? updatedIndicator : indicator)));
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
      {/* Chart Header */}
      <ChartHeader
        pair={pair}
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={handleTimeframeChange}
        onAddIndicator={openIndicatorDialog}
        isLoading={isLoading}
        indicatorCount={indicators.length}
      />

      {/* Chart Container */}
      <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
        {isLoading ? (
          <ChartLoadingState timeframe={selectedTimeframe} isRetrying={isRetrying} retryCount={retryCount} />
        ) : error ? (
          <ChartErrorState error={error} onRetry={handleRetry} />
        ) : candles && candles.length > 0 ? (
          <>
            <ChartContainer onChartCreated={handleChartCreated} />

            {/* Render candles if chart instance is available */}
            {chartInstance && <CandlestickRenderer chartInstance={chartInstance} candles={candles} chartContainerRef={chartContainerRef} precision={precision} />}

            {/* Render indicators if chart instance and formatted candles are available */}
            {chartInstance && formattedCandles.length > 0 && (
              <IndicatorRenderer chartInstance={chartInstance} indicators={indicators} formattedCandles={formattedCandles} onIndicatorUpdated={handleIndicatorUpdated} />
            )}
          </>
        ) : (
          <div className="text-slate-500 dark:text-slate-400">
            <p>No chart data available</p>
            <p className="text-xs mt-1">Try selecting a different trading pair or timeframe</p>
          </div>
        )}
      </div>

      {/* Indicator Manager */}
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
