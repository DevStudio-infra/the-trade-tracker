"use client";

import { useEffect } from "react";
import type { Time, CandlestickData, HistogramData } from "lightweight-charts";
import { ChartInstanceRef, FormattedCandle } from "./utils/chartTypes";
import { forceChartReflow } from "./utils/chartUtils";
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
    if (!candles || !chartInstance?.candlestickSeries || !chartInstance?.volumeSeries) return;

    try {
      // Format candle data for the chart
      const formattedCandles = candles.map((candle) => {
        // LightweightCharts requires time to be a specific type (UTCTimestamp)
        const time = (candle.timestamp / 1000) as Time; // Convert to seconds and cast as Time type

        return {
          time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          value: candle.volume,
        } as FormattedCandle;
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
      chartInstance.candlestickSeries.setData(
        formattedCandles.map(
          ({ time, open, high, low, close }) =>
            ({
              time,
              open,
              high,
              low,
              close,
            } as CandlestickData<Time>)
        )
      );

      // Update volume series with color based on candle direction
      chartInstance.volumeSeries.setData(
        formattedCandles.map(({ time, value, open, close }) => {
          // Get theme-based colors
          const volumeColor =
            open <= close
              ? "rgba(76, 175, 80, 0.3)" // Up volume color (green)
              : "rgba(255, 82, 82, 0.3)"; // Down volume color (red)

          return {
            time,
            value,
            color: volumeColor,
          } as HistogramData<Time>;
        })
      );

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

            // Use our helper function to force reflow as a last resort
            setTimeout(() => forceChartReflow(chartInstance, chartContainerRef), 100);
          }
        }, 50);
      }
    } catch (err) {
      console.error("Error updating chart with candle data:", err);
    }
  }, [candles, precision, chartInstance, chartContainerRef]);

  return null; // This is a logic-only component, no UI to render
}
