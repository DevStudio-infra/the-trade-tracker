"use client";

import { useState, useRef } from "react";
import { useApi, Candle } from "@/lib/api";
import { useTradingStore } from "@/stores/trading-store";
import { Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import type { ISeriesApi } from "lightweight-charts";
import { useSettings } from "@/hooks/useSettings";
import { ChartApiWithPanes } from "./core/ChartTypes";
import { ChartHeader } from "./ChartHeader";
import { useIndicatorStore } from "./indicators/indicatorStore";
import { BaseChart } from "./core/BaseChart";

interface TradingChartProps {
  pair: string | null;
}

export function TradingChart({ pair }: TradingChartProps) {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // References
  const requestInProgressRef = useRef(false);
  const requestParamsRef = useRef<{ pair: string; brokerId: string; timeframe: string } | null>(null);
  const chartRef = useRef<ChartApiWithPanes | null>(null);
  const seriesRef = useRef<{
    candlestickSeries: ISeriesApi<"Candlestick"> | null;
    volumeSeries: ISeriesApi<"Histogram"> | null;
  }>({
    candlestickSeries: null,
    volumeSeries: null,
  });

  // Hooks
  const api = useApi();
  const { selectedBroker } = useTradingStore();
  const settings = useSettings();
  const { resolvedTheme } = useTheme();
  const { getIndicators } = useIndicatorStore();

  // Fetch data effect
  const fetchData = async () => {
    if (!pair || !selectedBroker?.id) return;

    // Validate broker connections
    if (!settings?.brokerConnections?.length) {
      setError("No broker connections available. Please connect a broker first.");
      return;
    }

    const brokerExists = settings.brokerConnections.some((conn) => conn.id === selectedBroker.id);
    if (!brokerExists) {
      setError("Selected broker connection not found. Please select another broker.");
      return;
    }

    // Prevent concurrent requests
    if (requestInProgressRef.current) return;

    const currentParams = { pair, brokerId: selectedBroker.id, timeframe: selectedTimeframe };

    // Skip if same request
    if (
      requestParamsRef.current?.pair === currentParams.pair &&
      requestParamsRef.current?.brokerId === currentParams.brokerId &&
      requestParamsRef.current?.timeframe === currentParams.timeframe
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    requestInProgressRef.current = true;
    requestParamsRef.current = currentParams;

    try {
      const data = await api.getCandles(pair);
      if (Array.isArray(data)) {
        setCandles(data);
      }
    } catch (err) {
      console.error("Error fetching candles:", err);
      setError("Failed to fetch trading data. Please try again.");
      setCandles(null);
    } finally {
      setIsLoading(false);
      requestInProgressRef.current = false;
    }
  };

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    fetchData();
  };

  const handleChartCreated = (chart: ChartApiWithPanes) => {
    chartRef.current = chart;
  };

  const handleSeriesCreated = (series: { candlestickSeries: ISeriesApi<"Candlestick">; volumeSeries: ISeriesApi<"Histogram"> }) => {
    seriesRef.current = series;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white dark:bg-slate-950 rounded-lg border dark:border-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-white dark:bg-slate-950 rounded-lg border dark:border-slate-800">
        <AlertCircle className="h-8 w-8 text-destructive mb-4" />
        <p className="text-sm text-muted-foreground text-center max-w-[400px]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartHeader
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={handleTimeframeChange}
        activeIndicators={getIndicators().map((ind) => ({
          id: ind.getId(),
          name: ind.getName(),
          type: ind.getType(),
        }))}
        openIndicatorDialog={() => {}} // Indicator dialog is now handled by IndicatorControls
      />
      {/* Test element */}
      <div className="w-[80px] h-[80px] bg-[#00FF00] border-2 border-black dark:border-white" title="Trading Chart Component"></div>
      <BaseChart candles={candles} isDarkMode={resolvedTheme === "dark"} onChartCreated={handleChartCreated} onSeriesCreated={handleSeriesCreated} />
    </div>
  );
}
