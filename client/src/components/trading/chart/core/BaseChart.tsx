"use client";

import { useRef, useEffect } from "react";
import { createChart } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { ChartApiWithPanes } from "./ChartTypes";
import { getChartOptions } from "../utils/chartOptions";
import { createChartSeries, removeSeries } from "../utils/chartSeries";
import { Candle } from "@/lib/api";
import { formatCandlesForChart, formatCandlesForVolume } from "../utils/candles";

interface BaseChartProps {
  candles: Candle[] | null;
  isDarkMode: boolean;
  onChartCreated?: (chart: ChartApiWithPanes) => void;
  onSeriesCreated?: (series: { candlestickSeries: ISeriesApi<"Candlestick">; volumeSeries: ISeriesApi<"Histogram"> }) => void;
}

export function BaseChart({ candles, isDarkMode, onChartCreated, onSeriesCreated }: BaseChartProps) {
  // References
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

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up any existing chart
    if (chartInstanceRef.current.chart) {
      if (chartInstanceRef.current.candlestickSeries && chartInstanceRef.current.volumeSeries) {
        removeSeries(chartInstanceRef.current.chart as ChartApiWithPanes, {
          candlestickSeries: chartInstanceRef.current.candlestickSeries,
          volumeSeries: chartInstanceRef.current.volumeSeries,
        });
      }
      chartInstanceRef.current.chart.remove();
      chartInstanceRef.current = {
        chart: null,
        candlestickSeries: null,
        volumeSeries: null,
      };
    }

    const chartContainer = chartContainerRef.current;

    // Create chart instance with options
    const chart = createChart(chartContainer, getChartOptions(isDarkMode)) as ChartApiWithPanes;

    // Create series
    const series = createChartSeries(chart, isDarkMode);

    // Store references
    chartInstanceRef.current = {
      chart,
      candlestickSeries: series.candlestickSeries,
      volumeSeries: series.volumeSeries,
    };

    // Notify parent components
    if (onChartCreated) {
      onChartCreated(chart);
    }
    if (onSeriesCreated) {
      onSeriesCreated(series);
    }

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (chartInstanceRef.current.chart && width > 0) {
        chartInstanceRef.current.chart.applyOptions({ width });
        if (candles && candles.length > 0) {
          chartInstanceRef.current.chart.timeScale().fitContent();
        }
      }
    });

    resizeObserver.observe(chartContainer);

    // Force initial size
    setTimeout(() => {
      if (chartInstanceRef.current.chart) {
        chartInstanceRef.current.chart.applyOptions({
          width: chartContainer.clientWidth,
        });
      }
    }, 50);

    return () => {
      resizeObserver.unobserve(chartContainer);
      resizeObserver.disconnect();
      if (chartInstanceRef.current.chart) {
        chart.remove();
        chartInstanceRef.current = {
          chart: null,
          candlestickSeries: null,
          volumeSeries: null,
        };
      }
    };
  }, [isDarkMode, onChartCreated, onSeriesCreated]);

  // Update chart data when candles change
  useEffect(() => {
    if (!candles || !chartInstanceRef.current.candlestickSeries || !chartInstanceRef.current.volumeSeries) return;

    try {
      const formattedCandles = formatCandlesForChart(candles);
      const formattedVolume = formatCandlesForVolume(candles);

      chartInstanceRef.current.candlestickSeries.setData(formattedCandles);
      chartInstanceRef.current.volumeSeries.setData(formattedVolume);

      // Fit content
      if (chartInstanceRef.current.chart) {
        chartInstanceRef.current.chart.timeScale().fitContent();
      }
    } catch (err) {
      console.error("Error updating chart with candle data:", err);
    }
  }, [candles]);

  return (
    <div>
      {/* Test element */}
      <div className="mb-4 w-[80px] h-[80px] bg-[#00FFFF] border-2 border-black dark:border-white" title="Base Chart Component"></div>
      <div ref={chartContainerRef} className="h-[500px] bg-white dark:bg-slate-950 rounded-lg border dark:border-slate-800" />
    </div>
  );
}
