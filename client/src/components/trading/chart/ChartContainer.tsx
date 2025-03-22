"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { createChart } from "lightweight-charts";
import { ChartInstanceRef } from "./utils/chartTypes";
import { getChartColors, createChartOptions, forceChartReflow } from "./utils/chartUtils";

interface ChartContainerProps {
  onChartCreated: (chartInstance: ChartInstanceRef) => void;
  className?: string;
  height?: number;
}

/**
 * Chart container component responsible for:
 * - Initializing the chart instance
 * - Handling resize events
 * - Managing theme changes
 * - Clean up on unmount
 */
export function ChartContainer({ onChartCreated, className = "", height = 500 }: ChartContainerProps) {
  const { resolvedTheme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ChartInstanceRef>({
    chart: null,
    candlestickSeries: null,
    volumeSeries: null,
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up any existing chart first
    if (chartInstanceRef.current.chart) {
      try {
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
    const colors = getChartColors(resolvedTheme || "light");

    // Create chart instance
    const chart = createChart(chartContainer, createChartOptions(colors, chartContainer.clientWidth, height));

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
      priceFormat: {
        type: "price",
        precision: 5, // Default precision
        minMove: Math.pow(10, -5),
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

    // Notify parent that chart is created
    onChartCreated(chartInstanceRef.current);

    // Better resize handling with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (chartInstanceRef.current.chart && width > 0) {
        chartInstanceRef.current.chart.applyOptions({
          width: width,
        });

        // Ensure chart content remains visible after resize
        chartInstanceRef.current.chart.timeScale().fitContent();
      }
    });

    // Start observing the chart container
    resizeObserver.observe(chartContainer);

    // Force an initial size adjustment
    setTimeout(() => {
      if (chartInstanceRef.current.chart) {
        chartInstanceRef.current.chart.applyOptions({
          width: chartContainer.clientWidth,
        });
        // Force reflow to ensure everything is rendered properly
        forceChartReflow(chartInstanceRef.current, chartContainerRef);
      }
    }, 50);

    return () => {
      // Clean up
      resizeObserver.unobserve(chartContainer);
      resizeObserver.disconnect();

      try {
        // Only remove if chart still exists
        if (chartInstanceRef.current.chart) {
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
  }, [resolvedTheme, height, onChartCreated]); // Recreate chart when theme or height changes

  return <div ref={chartContainerRef} className={`w-full h-full ${className}`} data-testid="chart-container" />;
}
