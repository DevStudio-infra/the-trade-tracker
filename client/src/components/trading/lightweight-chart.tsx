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

    let newChart: IChartApi | null = null;
    let newCandleSeries: ISeriesApi<"Candlestick"> | null = null;
    const newIndicatorSeries: ISeriesApi<"Line" | "Histogram">[] = [];

    try {
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
      newChart = createChart(chartContainerRef.current, {
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
      newCandleSeries = newChart.addCandlestickSeries({
        upColor: chartColors.upColor,
        downColor: chartColors.downColor,
        borderUpColor: chartColors.upColor,
        borderDownColor: chartColors.downColor,
        wickUpColor: chartColors.wickUpColor,
        wickDownColor: chartColors.wickDownColor,
      });

      // Format data with Time object and ensure no duplicate timestamps
      const formattedData = data
        .map((d) => ({
          time: parseTime(d.time),
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
        .reduce((acc: { time: Time; open: number; high: number; low: number; close: number }[], current) => {
          // Check if this timestamp already exists in our accumulator
          const exists = acc.find((item) => item.time === current.time);
          if (!exists) {
            // If it doesn't exist, add it to the accumulator
            acc.push(current);
          }
          return acc;
        }, [])
        // Ensure data is sorted by time in ascending order
        .sort((a, b) => {
          if (typeof a.time === "string" && typeof b.time === "string") {
            return a.time.localeCompare(b.time);
          } else if (typeof a.time === "number" && typeof b.time === "number") {
            return a.time - b.time;
          }
          return 0;
        });

      // Set data to series if we have data
      if (formattedData.length > 0) {
        try {
          newCandleSeries.setData(formattedData);
        } catch (error) {
          console.error("Error setting candlestick data:", error);
        }
      }

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

      // Add indicators if any
      if (Array.isArray(indicators)) {
        indicators.forEach((indicator) => {
          if (!indicator || !indicator.data || !Array.isArray(indicator.data) || indicator.data.length === 0) {
            return; // Skip invalid indicators
          }

          try {
            if (indicator.type === "sma") {
              const sma = newChart!.addLineSeries({
                color: indicator.options?.color || "rgba(4, 111, 232, 1)",
                lineWidth: (indicator.options?.lineWidth as DeepPartial<LineWidth>) || (2 as DeepPartial<LineWidth>),
                priceLineVisible: false,
              });

              // Process indicator data to remove duplicates
              const smaData: LineData<Time>[] = indicator.data
                .map((d) => ({
                  time: parseTime(d.time),
                  value: d.value,
                }))
                .reduce((acc: LineData<Time>[], current) => {
                  const exists = acc.find((item) => item.time === current.time);
                  if (!exists) {
                    acc.push(current);
                  }
                  return acc;
                }, [])
                .sort((a, b) => {
                  if (typeof a.time === "string" && typeof b.time === "string") {
                    return a.time.localeCompare(b.time);
                  } else if (typeof a.time === "number" && typeof b.time === "number") {
                    return (a.time as number) - (b.time as number);
                  }
                  return 0;
                });

              if (smaData.length > 0) {
                sma.setData(smaData);
                newIndicatorSeries.push(sma);
              }
            } else if (indicator.type === "ema") {
              const ema = newChart!.addLineSeries({
                color: indicator.options?.color || "rgba(255, 192, 0, 1)",
                lineWidth: (indicator.options?.lineWidth as DeepPartial<LineWidth>) || (2 as DeepPartial<LineWidth>),
                priceLineVisible: false,
              });

              // Process indicator data to remove duplicates
              const emaData: LineData<Time>[] = indicator.data
                .map((d) => ({
                  time: parseTime(d.time),
                  value: d.value,
                }))
                .reduce((acc: LineData<Time>[], current) => {
                  const exists = acc.find((item) => item.time === current.time);
                  if (!exists) {
                    acc.push(current);
                  }
                  return acc;
                }, [])
                .sort((a, b) => {
                  if (typeof a.time === "string" && typeof b.time === "string") {
                    return a.time.localeCompare(b.time);
                  } else if (typeof a.time === "number" && typeof b.time === "number") {
                    return (a.time as number) - (b.time as number);
                  }
                  return 0;
                });

              if (emaData.length > 0) {
                ema.setData(emaData);
                newIndicatorSeries.push(ema);
              }
            } else if (indicator.type === "volume") {
              const volume = newChart!.addHistogramSeries({
                color: indicator.options?.color || "#26a69a80",
                priceFormat: {
                  type: "volume",
                },
                priceScaleId: "", // Set to create a separate scale
              });

              // Process indicator data to remove duplicates
              const volumeData: HistogramData<Time>[] = indicator.data
                .map((d) => ({
                  time: parseTime(d.time),
                  value: d.value,
                  color: d.value >= 0 ? "#26a69a80" : "#ef535080",
                }))
                .reduce((acc: HistogramData<Time>[], current) => {
                  const exists = acc.find((item) => item.time === current.time);
                  if (!exists) {
                    acc.push(current);
                  }
                  return acc;
                }, [])
                .sort((a, b) => {
                  if (typeof a.time === "string" && typeof b.time === "string") {
                    return a.time.localeCompare(b.time);
                  } else if (typeof a.time === "number" && typeof b.time === "number") {
                    return (a.time as number) - (b.time as number);
                  }
                  return 0;
                });

              if (volumeData.length > 0) {
                volume.setData(volumeData);
                newIndicatorSeries.push(volume);
              }
            }
          } catch (error) {
            console.error(`Error adding ${indicator.type} indicator:`, error);
          }
        });
      }

      // Fit content if we have a chart
      if (newChart) {
        newChart.timeScale().fitContent();
      }

      // Set states
      setChart(newChart);
      if (newCandleSeries) {
        setCandleSeries(newCandleSeries);
      }
      setIndicatorSeries(newIndicatorSeries);
    } catch (error) {
      console.error("Error initializing chart:", error);
    }

    // Cleanup function
    return () => {
      if (newChart) {
        try {
          newChart.remove();
        } catch (error) {
          console.error("Error removing chart:", error);
        }
      }
    };
  }, [data, theme, colors, height, width, indicators]);

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
