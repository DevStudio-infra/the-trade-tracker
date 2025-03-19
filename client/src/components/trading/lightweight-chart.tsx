"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, Time, LineData, HistogramData, DeepPartial, LineWidth } from "lightweight-charts";
import { useTheme } from "next-themes";

interface ChartProps {
  data: {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
    upColor?: string;
    downColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
  };
  indicators?: {
    type: string;
    data: { time: string | number; value: number }[];
    options?: IndicatorOptions;
  }[];
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  height?: number;
  width?: number;
}

interface IndicatorOptions {
  color?: string;
  lineWidth?: number;
  [key: string]: unknown;
}

export function LightweightChart({ data, colors = {}, indicators = [], timeframe = "1h", onTimeframeChange, height = 500, width = 800 }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const timeframeButtonsRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_candleSeries, setCandleSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_indicatorSeries, setIndicatorSeries] = useState<ISeriesApi<"Line" | "Histogram">[]>([]);
  const { theme } = useTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  // Timeframes
  const availableTimeframes = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

  // Clean up old chart instance if already exists - with safe check
  useEffect(() => {
    return () => {
      if (chart) {
        try {
          chart.remove();
        } catch (error) {
          console.error("Error removing chart:", error);
          // Chart was already disposed, no action needed
        }
      }
    };
  }, [chart]);

  // Create new chart on component mount or theme change
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDarkTheme = theme === "dark";

    // Chart colors based on theme
    const chartColors = {
      backgroundColor: colors.backgroundColor || (isDarkTheme ? "#1E222D" : "#FFFFFF"),
      lineColor: colors.lineColor || (isDarkTheme ? "#2B2B43" : "#D9D9D9"),
      textColor: colors.textColor || (isDarkTheme ? "#D9D9D9" : "#191919"),
      upColor: colors.upColor || "#26a69a",
      downColor: colors.downColor || "#ef5350",
      wickUpColor: colors.wickUpColor || "#26a69a",
      wickDownColor: colors.wickDownColor || "#ef5350",
    };

    // Create chart instance
    const newChart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
      height: height || 500,
      layout: {
        background: { type: ColorType.Solid, color: chartColors.backgroundColor },
        textColor: chartColors.textColor,
      },
      grid: {
        vertLines: { color: chartColors.lineColor },
        horzLines: { color: chartColors.lineColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: chartColors.lineColor,
      },
      timeScale: {
        borderColor: chartColors.lineColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    // Add candlestick series
    const newCandleSeries = newChart.addCandlestickSeries({
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      borderUpColor: chartColors.upColor,
      borderDownColor: chartColors.downColor,
      wickUpColor: chartColors.wickUpColor,
      wickDownColor: chartColors.wickDownColor,
    });

    // Add indicators
    const newIndicatorSeries: ISeriesApi<"Line" | "Histogram">[] = [];

    // Format data with Time object
    const formattedData = data.map((d) => ({
      time: parseTime(d.time),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    // Helper function to safely parse time values
    function parseTime(timeValue: string | number): Time {
      if (typeof timeValue === "string") {
        // Convert string timestamp to Time
        return timeValue as Time;
      } else if (typeof timeValue === "number") {
        // Convert number to UTC format string that Time accepts
        const date = new Date(timeValue * 1000); // Assuming timestamps are in seconds
        return date.toISOString().split("T")[0] as Time;
      }
      // Default fallback in case of invalid time
      return "2023-01-01" as Time;
    }

    // Set data to series
    try {
      newCandleSeries.setData(formattedData);
    } catch (error) {
      console.error("Error setting candlestick data:", error);
    }

    // Add indicators if any
    indicators.forEach((indicator) => {
      if (indicator.type === "sma") {
        const sma = newChart.addLineSeries({
          color: indicator.options?.color || "rgba(4, 111, 232, 1)",
          lineWidth: (indicator.options?.lineWidth as DeepPartial<LineWidth>) || (2 as DeepPartial<LineWidth>),
          priceLineVisible: false,
        });

        try {
          const smaData: LineData<Time>[] = indicator.data.map((d) => ({
            time: parseTime(d.time),
            value: d.value,
          }));
          sma.setData(smaData);
          newIndicatorSeries.push(sma);
        } catch (error) {
          console.error("Error setting SMA data:", error);
        }
      } else if (indicator.type === "ema") {
        const ema = newChart.addLineSeries({
          color: indicator.options?.color || "rgba(255, 192, 0, 1)",
          lineWidth: (indicator.options?.lineWidth as DeepPartial<LineWidth>) || (2 as DeepPartial<LineWidth>),
          priceLineVisible: false,
        });

        try {
          const emaData: LineData<Time>[] = indicator.data.map((d) => ({
            time: parseTime(d.time),
            value: d.value,
          }));
          ema.setData(emaData);
          newIndicatorSeries.push(ema);
        } catch (error) {
          console.error("Error setting EMA data:", error);
        }
      } else if (indicator.type === "volume") {
        const volume = newChart.addHistogramSeries({
          color: indicator.options?.color || "#26a69a80",
          priceFormat: {
            type: "volume",
          },
          priceScaleId: "", // Set to create a separate scale
        });

        try {
          const volumeData: HistogramData<Time>[] = indicator.data.map((d) => ({
            time: parseTime(d.time),
            value: d.value,
            color: d.value >= 0 ? "#26a69a80" : "#ef535080",
          }));
          volume.setData(volumeData);
          newIndicatorSeries.push(volume);
        } catch (error) {
          console.error("Error setting volume data:", error);
        }
      }
    });

    // Fit content
    newChart.timeScale().fitContent();

    // Set states
    setChart(newChart);
    setCandleSeries(newCandleSeries);
    setIndicatorSeries(newIndicatorSeries);

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && newChart) {
        newChart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (newChart) {
        try {
          newChart.remove();
        } catch (error) {
          console.error("Error removing chart on unmount:", error);
          // Chart was already disposed, no action needed
        }
      }
    };
  }, [data, theme, colors, height, width]);

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    setSelectedTimeframe(newTimeframe);
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    }
  };

  return (
    <div className="relative">
      <div ref={timeframeButtonsRef} className="absolute right-4 top-4 z-10 flex space-x-1 bg-white dark:bg-gray-800 p-1 rounded-md shadow-md">
        {availableTimeframes.map((tf) => (
          <button
            key={tf}
            className={`px-2 py-1 text-xs rounded ${
              selectedTimeframe === tf ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
            onClick={() => handleTimeframeChange(tf)}>
            {tf}
          </button>
        ))}
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
