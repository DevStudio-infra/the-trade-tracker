"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import type { IChartApi, IPaneApi, Time } from "lightweight-charts";
import { ChartInstanceRef } from "./core/ChartTypes";

// Define chart colors interface
interface ChartColorScheme {
  background: string;
  text: string;
  grid: string;
  borderColor: string;
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
  volumeUp: string;
  volumeDown: string;
}

// Add color utilities
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

// Function to get chart colors based on theme
const getChartColors = (theme: string): ChartColorScheme => {
  return theme === "dark" ? chartColors.dark : chartColors.light;
};

// Function to create basic chart options based on colors
const createChartOptions = (colors: ChartColorScheme, width: number, height: number = 500) => {
  return {
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
    width: width,
    height: height,
  };
};

// Add a type definition for chart API with panes support
interface ChartApiWithPanes extends IChartApi {
  addPane: (height: number) => IPaneApi<Time>;
  panes: () => IPaneApi<Time>[];
}

interface ChartContainerProps {
  onChartCreated: (chartInstance: ChartInstanceRef) => void;
  className?: string;
  height?: number;
  indicatorCount?: number; // Add indicator count to adjust height
}

/**
 * Chart container component responsible for:
 * - Initializing the chart instance
 * - Handling resize events
 * - Managing theme changes
 * - Clean up on unmount
 */
export function ChartContainer({ onChartCreated, className = "", height = 500, indicatorCount = 0 }: ChartContainerProps) {
  const { resolvedTheme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ChartInstanceRef>({
    chart: null,
    candlestickSeries: null,
    volumeSeries: null,
  });

  // Force chart reflow - use when chart doesn't render properly
  const forceChartReflow = () => {
    if (!chartInstanceRef.current || !chartInstanceRef.current.chart) return;

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

  // Calculate dynamic chart height based on indicator count
  const calculatedHeight = Math.max(height, 500 + Math.max(0, indicatorCount) * 200);

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

    // Create chart instance with dynamic height
    const baseOptions = createChartOptions(colors, chartContainer.clientWidth, calculatedHeight);
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
      leftPriceScale: {
        visible: true,
        borderColor: colors.borderColor,
        entireTextOnly: true,
      },
      rightPriceScale: {
        visible: false,
      },
      height: calculatedHeight, // explicitly set height
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
    };

    // Create chart with pane support
    const chart = createChart(chartContainer, {
      ...chartOptions,
      layout: {
        ...chartOptions.layout,
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
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: true,
        borderColor: colors.borderColor,
      },
    }) as ChartApiWithPanes;

    // Create a single additional pane for oscillator indicators
    try {
      if (typeof chart.addPane === "function") {
        // Create a pane for oscillators (RSI, MACD, etc.)
        const oscillatorPane = chart.addPane(150);
        if (oscillatorPane) {
          // Configure the oscillator pane to use left price scale
          chart.applyOptions({
            layout: {
              panes: {
                [1]: {
                  rightPriceScale: {
                    visible: false,
                  },
                  leftPriceScale: {
                    visible: true,
                    borderColor: colors.borderColor,
                  },
                },
              },
            },
          });
        }
        console.log("Created oscillator pane:", oscillatorPane);
      }
    } catch (err) {
      console.error("Error creating oscillator pane:", err);
    }

    // Add candlestick series to the main pane
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
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
      priceScaleId: "left",
    });

    // Configure the main price scale for candlesticks
    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.4, // Leave space for volume
      },
      borderVisible: true,
      borderColor: colors.borderColor,
      visible: true,
    });

    // Add volume series with a separate price scale
    const volumeSeries = chart.addSeries(HistogramSeries, {
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
      chart: chart,
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
        forceChartReflow();
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
