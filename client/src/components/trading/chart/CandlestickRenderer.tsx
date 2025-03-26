"use client";

import { useEffect } from "react";
import type { Time, CandlestickData, HistogramData } from "lightweight-charts";
import { ChartInstanceRef } from "./utils/chartTypes";
import { Candle } from "@/lib/api";

interface CandlestickRendererProps {
  chartInstance: ChartInstanceRef | null;
  candles: Candle[] | null;
  chartContainerRef: React.RefObject<HTMLDivElement>;
  precision: number;
}

/**
 * Component responsible for rendering candle and volume data in the chart
 */
export function CandlestickRenderer({ chartInstance, candles, chartContainerRef, precision }: CandlestickRendererProps) {
  // Update candlestick series when data changes
  useEffect(() => {
    if (!candles || !chartInstance?.candlestickSeries || !chartInstance?.chart) return;

    try {
      // Format candle data for the chart
      const formattedCandles: CandlestickData<Time>[] = candles.map((candle) => {
        return {
          time: (candle.timestamp / 1000) as Time, // Convert to seconds and cast as Time
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
      });

      console.log(`Setting chart data: ${formattedCandles.length} candles with precision ${precision}`);

      // Update price format precision
      if (chartInstance.candlestickSeries) {
        chartInstance.candlestickSeries.applyOptions({
          priceFormat: {
            type: "price",
            precision: precision,
            minMove: Math.pow(10, -precision),
          },
        });
      }

      // Update candlestick series
      chartInstance.candlestickSeries.setData(formattedCandles);

      // Update volume series with color based on candle direction
      if (chartInstance.volumeSeries) {
        // Format volume data with colors
        const volumeData: HistogramData<Time>[] = candles.map((candle) => {
          // Get volume color based on candle direction (up/down)
          const volumeColor =
            candle.open <= candle.close
              ? "rgba(76, 175, 80, 0.5)" // Up volume color (green)
              : "rgba(255, 82, 82, 0.5)"; // Down volume color (red)

          return {
            time: (candle.timestamp / 1000) as Time,
            value: candle.volume,
            color: volumeColor,
          };
        });

        // Set volume data
        chartInstance.volumeSeries.setData(volumeData);
      }

      // Fit content to show all candles
      if (chartInstance.chart) {
        // First fit the content
        chartInstance.chart.timeScale().fitContent();

        // Force chart to redraw with a small delay
        setTimeout(() => {
          if (chartInstance.chart) {
            // Apply a slight adjustment to force redraw
            const currentVisibleRange = chartInstance.chart.timeScale().getVisibleRange();
            if (currentVisibleRange) {
              // Slightly modify visible range to force redraw
              chartInstance.chart.timeScale().setVisibleRange({
                from: currentVisibleRange.from,
                to: currentVisibleRange.to,
              });
            }

            // Fit content again to ensure all data is visible
            chartInstance.chart.timeScale().fitContent();
          }
        }, 50);
      }
    } catch (err) {
      console.error("Error updating chart with candle data:", err);
    }
  }, [candles, precision, chartInstance, chartContainerRef]);

  return null; // This is a logic-only component, no UI to render
}
