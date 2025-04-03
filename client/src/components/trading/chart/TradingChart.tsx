"use client";

import React, { useEffect, useState } from "react";
import { CandlestickSeriesOptions } from "lightweight-charts";
import { ChartInstance } from "./core/ChartInstance";
import { IndicatorControls } from "./indicators/IndicatorControls";
import { useIndicatorStore } from "./indicators/indicatorStore";
import { FormattedCandle, ChartApiWithPanes } from "./core/ChartTypes";
import { useApi } from "@/lib/api";

interface TradingChartProps {
  pair: string | null;
  width?: number;
  height?: number;
}

/**
 * TradingChart Component
 *
 * Main trading chart component that integrates the ChartInstance with indicator controls
 */
export function TradingChart({ pair, width = 800, height = 500 }: TradingChartProps) {
  const [candles, setCandles] = useState<FormattedCandle[]>([]);
  const api = useApi();

  // Get indicators from store
  const { getIndicators, setChartInstance, updateData } = useIndicatorStore();
  const indicators = getIndicators();

  // Set chart container dimensions
  const chartHeight = Math.max(height - 40, 300); // Subtract height of controls

  // Fetch candle data when pair changes
  useEffect(() => {
    async function fetchCandles() {
      if (!pair) {
        setCandles([]);
        return;
      }

      try {
        const data = await api.getCandles(pair);
        setCandles(data);
        updateData(data);
      } catch (error) {
        console.error("Error fetching candles:", error);
        setCandles([]);
      }
    }

    fetchCandles();
  }, [pair, api, updateData]);

  // Handle chart instance ready
  const handleChartReady = (chart: ChartApiWithPanes) => {
    // Initialize chart
    setChartInstance(chart);

    // Create candlestick series
    const mainSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickVisible: true,
      borderVisible: false,
    } as CandlestickSeriesOptions);

    // Set data if available
    if (candles.length > 0) {
      mainSeries.setData(candles);
      updateData(candles);
      chart.timeScale().fitContent();
    }
  };

  return (
    <div className="trading-chart-container">
      {/* Test element */}
      <div className="w-[80px] h-[80px] bg-[#FF00FF] border-2 border-black dark:border-white" title="Trading Chart Component"></div>
      <IndicatorControls />
      {candles.length > 0 && <ChartInstance width={width} height={chartHeight} candles={candles} indicators={indicators} onChartReady={handleChartReady} />}
    </div>
  );
}
