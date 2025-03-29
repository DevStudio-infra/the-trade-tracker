"use client";

import React from "react";
import { CandlestickSeriesOptions } from "lightweight-charts";
import { ChartInstance } from "./core/ChartInstance";
import { IndicatorControls } from "./indicators/IndicatorControls";
import { useIndicatorStore } from "./indicators/indicatorStore";
import { FormattedCandle, ChartApiWithPanes } from "./core/ChartTypes";

interface TradingChartProps {
  candles: FormattedCandle[];
  width?: number;
  height?: number;
}

/**
 * TradingChart Component
 *
 * Main trading chart component that integrates the ChartInstance with indicator controls
 */
export function TradingChart({ candles, width = 800, height = 500 }: TradingChartProps) {
  // Get indicators from store
  const { getIndicators, setChartInstance, updateData } = useIndicatorStore();
  const indicators = getIndicators();

  // Set chart container dimensions
  const chartHeight = Math.max(height - 40, 300); // Subtract height of controls

  // Handle chart instance ready
  const handleChartReady = (chart: ChartApiWithPanes) => {
    // Initialize chart
    setChartInstance(chart);

    // Create candlestick series
    // Using type assertion to work around incomplete type definition
    const mainSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickVisible: true,
      borderVisible: false,
    } as CandlestickSeriesOptions);

    // Set data
    mainSeries.setData(candles);

    // Update indicators with data
    updateData(candles);

    // Fit content
    chart.timeScale().fitContent();
  };

  return (
    <div className="trading-chart-container">
      <IndicatorControls />
      <ChartInstance width={width} height={chartHeight} candles={candles} indicators={indicators} onChartReady={handleChartReady} />
    </div>
  );
}
