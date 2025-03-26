"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import type { IChartApi, IPaneApi, Time } from "lightweight-charts";
import { ChartInstanceRef } from "./utils/chartTypes";
import { getChartColors, createChartOptions, forceChartReflow } from "./utils/chartUtils";

// Add a type definition for chart API with panes support
interface ChartApiWithPanes extends IChartApi {
  createPane: (options: { height: number }) => IPaneApi<Time>;
  panes: () => IPaneApi<Time>[];
}

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
    const baseOptions = createChartOptions(colors, chartContainer.clientWidth, height);
    const chartOptions = {
      ...baseOptions,
      layout: {
        ...baseOptions.layout,
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontSize: 12,
        // Configure panes with separators and allow resizing
        panes: {
          separatorColor: colors.borderColor,
          separatorHoverColor: resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          enableResize: true,
        },
      },
    };

    // Create chart
    const chart = createChart(chartContainer, chartOptions);

    // Cast to enhanced chart API with pane support
    const chartWithPanes = chart as ChartApiWithPanes;

    // Create an additional pane for indicators like RSI
    try {
      if (typeof chartWithPanes.createPane === "function") {
        // Create a pane for oscillators (RSI, MACD, etc.)
        chartWithPanes.createPane({
          height: 150, // Smaller height for the indicator pane
        });
      }
    } catch (err) {
      console.error("Error creating additional panes:", err);
    }

    // Add candlestick series to the main pane
    const candlestickSeries = chartWithPanes.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
      priceFormat: {
        type: "price",
        precision: 5,
        minMove: Math.pow(10, -5),
      },
    });

    // Configure the main price scale for candlesticks
    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.4, // Leave space for volume
      },
      borderVisible: true,
      borderColor: colors.borderColor,
    });

    // Add volume series with a separate price scale
    const volumeSeries = chartWithPanes.addSeries(HistogramSeries, {
      color: colors.volumeUp,
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume", // Use a separate price scale
    });

    // Configure volume price scale
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Position at the bottom of the chart
        bottom: 0.0,
      },
      borderVisible: true,
      borderColor: colors.borderColor,
      visible: true,
    });

    // Store references
    chartInstanceRef.current = {
      chart: chartWithPanes,
      candlestickSeries,
      volumeSeries,
    };

    // Notify parent
    onChartCreated(chartInstanceRef.current);

    // Set up resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (chartInstanceRef.current.chart && width > 0) {
        chartInstanceRef.current.chart.applyOptions({
          width: width,
        });
        chartInstanceRef.current.chart.timeScale().fitContent();
      }
    });

    resizeObserver.observe(chartContainer);

    // Force initial resize
    setTimeout(() => {
      if (chartInstanceRef.current.chart) {
        chartInstanceRef.current.chart.applyOptions({
          width: chartContainer.clientWidth,
        });
        chartInstanceRef.current.chart.timeScale().fitContent();
        forceChartReflow(chartInstanceRef.current, chartContainerRef);
      }
    }, 50);

    return () => {
      // Clean up
      resizeObserver.unobserve(chartContainer);
      resizeObserver.disconnect();

      if (chartInstanceRef.current.chart) {
        chartInstanceRef.current.chart.remove();
        chartInstanceRef.current = {
          chart: null,
          candlestickSeries: null,
          volumeSeries: null,
        };
      }
    };
  }, [resolvedTheme, height, onChartCreated]);

  return <div ref={chartContainerRef} className={`w-full h-full ${className}`} data-testid="chart-container" />;
}
