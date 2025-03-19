"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { LightweightChart } from "./lightweight-chart";
import { useApi } from "@/lib/api";
import { useTradingStore } from "@/stores/trading-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle } from "lucide-react";

interface TradingChartProps {
  pair: string | null;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function TradingChart({ pair }: TradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const api = useApi();
  const { selectedBroker } = useTradingStore();

  // Fetch candles data using React Query
  const {
    data: candles = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["candles", pair, selectedTimeframe, selectedBroker?.id],
    queryFn: async () => {
      if (!pair || !selectedBroker) return [];
      try {
        console.log(`Fetching candles for ${pair} with timeframe ${selectedTimeframe} using broker: ${selectedBroker.description || selectedBroker.broker_name}`);
        console.log(`Using ${selectedBroker.is_demo ? "demo" : "live"} account`);

        // Use the account type directly from the credential information
        const response = await api.getCandles(api, selectedBroker.id, pair, selectedTimeframe);

        // If we got empty data, try with mock data as fallback
        if (!response || response.length === 0) {
          console.warn(`No data returned for ${pair}, using mock data`);
          return generateMockCandles(pair, selectedTimeframe);
        }

        return response;
      } catch (err) {
        console.error("Error fetching candles:", err);
        // Return mock data on error for development
        return generateMockCandles(pair, selectedTimeframe);
      }
    },
    enabled: !!pair && !!selectedBroker,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Get account type directly from the broker credential
  const isDemo = selectedBroker?.is_demo || false;

  // Prepare volume data for chart
  const volumeData = candles.map((candle) => ({
    time: candle.time,
    value: candle.volume || 0,
  }));

  // Calculate SMA20
  const sma20Data = calculateSMA(candles, 20);

  // Calculate EMA50
  const ema50Data = calculateEMA(candles, 50);

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
  };

  if (!pair) {
    return (
      <Card className="flex items-center justify-center h-[500px]">
        <p className="text-slate-500 dark:text-slate-400">Select a trading pair to view chart</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4 relative h-[500px]">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chart</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pair} - {selectedTimeframe}
          </p>
        </div>
        <Skeleton className="w-full h-[450px] mt-4" />
      </Card>
    );
  }

  if (error || candles.length === 0) {
    return (
      <Card className="p-4 relative h-[500px]">
        <div className="space-y-1 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chart</h2>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pair} - {selectedTimeframe}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center h-[450px]">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-slate-700 dark:text-slate-300 font-medium">{error ? "Error loading chart data" : "No data available for this pair"}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            {error ? "There was a problem fetching the chart data. Please try again." : "Try selecting a different pair or timeframe."}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 relative">
      <div className="space-y-1 mb-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chart</h2>
          <div className="flex items-center gap-4">
            <Badge variant={isDemo ? "secondary" : "default"}>{isDemo ? "Demo Account" : "Live Account"}</Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pair} - {selectedTimeframe}
        </p>
      </div>
      <div className="h-[500px]">
        <LightweightChart
          data={candles}
          timeframe={selectedTimeframe}
          onTimeframeChange={handleTimeframeChange}
          indicators={[
            {
              type: "sma",
              data: sma20Data,
              options: { color: "rgba(33, 150, 243, 1)", lineWidth: 2 },
            },
            {
              type: "ema",
              data: ema50Data,
              options: { color: "rgba(255, 152, 0, 1)", lineWidth: 2 },
            },
            {
              type: "volume",
              data: volumeData,
            },
          ]}
        />
      </div>
    </Card>
  );
}

// Helper function to generate mock candles if API fails
function generateMockCandles(pair: string, timeframe: string): CandleData[] {
  const candles = [];
  const now = Math.floor(Date.now() / 1000);
  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const basePrice = getBasePriceForPair(pair);

  for (let i = 0; i < 200; i++) {
    const time = now - timeframeSeconds * (200 - i);
    const volatility = basePrice * 0.01; // 1% volatility

    // Generate random price movement
    const open = basePrice + (Math.random() * volatility * 2 - volatility);
    const close = open + (Math.random() * volatility * 2 - volatility);
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 100) + 50;

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}

// Helper function to convert timeframe to seconds
function getTimeframeSeconds(timeframe: string): number {
  const map: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
  };

  return map[timeframe] || 3600;
}

// Helper to get a base price for each pair to make mock data more realistic
function getBasePriceForPair(pair: string): number {
  const pairPrices: Record<string, number> = {
    EURUSD: 1.09,
    GBPUSD: 1.27,
    USDJPY: 108.5,
    USDCHF: 0.92,
    AUDUSD: 0.67,
    NZDUSD: 0.63,
    USDCAD: 1.34,
    CADCHF: 0.68,
    EURGBP: 0.86,
    EURJPY: 118.5,
  };

  return pairPrices[pair] || 1.0; // Default to 1.0 if pair not found
}

// Helper functions for calculating indicators
function calculateSMA(data: CandleData[], period: number) {
  if (data.length < period) {
    return [];
  }

  const smaData = [];
  let sum = 0;

  // Initial sum for the first period elements
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }

  // First SMA value
  smaData.push({
    time: data[period - 1].time,
    value: sum / period,
  });

  // Calculate remaining SMA values using the sliding window approach
  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period].close + data[i].close;
    smaData.push({
      time: data[i].time,
      value: sum / period,
    });
  }

  return smaData;
}

function calculateEMA(data: CandleData[], period: number) {
  if (data.length < period) {
    return [];
  }

  // Calculate initial SMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }

  // Initialize EMA array with first value (SMA)
  const ema = [
    {
      time: data[period - 1].time,
      value: sum / period,
    },
  ];

  // Calculate EMA using the multiplier
  const multiplier = 2 / (period + 1);

  for (let i = period; i < data.length; i++) {
    const newValue = (data[i].close - ema[ema.length - 1].value) * multiplier + ema[ema.length - 1].value;
    ema.push({
      time: data[i].time,
      value: newValue,
    });
  }

  return ema;
}
