"use client";

import { createChart, ColorType, UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { mockChartData } from "@/lib/mock-data";

interface TradingChartProps {
  pair: string;
}

export function TradingChart({ pair }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    chart.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.1)" },
        horzLines: { color: "rgba(255, 255, 255, 0.1)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.4)",
          style: 3,
        },
        horzLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.4)",
          style: 3,
        },
      },
      handleScroll: {
        vertTouchDrag: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    // Create candlestick series
    const candlestickSeries = chart.current.addCandlestickSeries();
    candlestickSeries.setData(
      mockChartData.candles.map((candle) => ({
        ...candle,
        time: candle.time as UTCTimestamp,
      }))
    );

    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chart.current) {
        chart.current.remove();
      }
    };
  }, []);

  return (
    <div className="w-full h-[60vh] min-h-[400px] relative">
      <div ref={chartContainerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 text-lg font-semibold bg-background/50 backdrop-blur-sm px-3 py-1 rounded-lg">{pair}</div>
    </div>
  );
}
