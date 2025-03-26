"use client";

import { useEffect, useRef } from "react";
import { ChartInstanceRef, FormattedCandle } from "../utils/chartTypes";

interface CandlestickRendererProps {
  chartInstance: ChartInstanceRef | null;
  formattedCandles: FormattedCandle[];
  volumeEnabled: boolean;
}

/**
 * Component responsible for rendering price and volume data on the chart
 */
export function CandlestickRenderer({ chartInstance, formattedCandles, volumeEnabled }: CandlestickRendererProps) {
  // Track if data has been initialized
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!chartInstance?.chart || !chartInstance.candlestickSeries || !formattedCandles.length) {
      return;
    }

    try {
      // Set candlestick data
      chartInstance.candlestickSeries.setData(formattedCandles);

      // Set volume data if volume is enabled and the volumeSeries is available
      if (volumeEnabled && chartInstance.volumeSeries) {
        // Format volume data
        const volumeData = formattedCandles.map((candle) => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? "#26A69A" : "#EF5350", // Green for up, red for down
        }));

        // Set volume data
        chartInstance.volumeSeries.setData(volumeData);
      }

      // If this is the first time we're rendering data, fit content to chart
      if (!initializedRef.current) {
        // Need to wait a bit for the data to be rendered
        setTimeout(() => {
          if (chartInstance.chart) {
            chartInstance.chart.timeScale().fitContent();
            initializedRef.current = true;
          }
        }, 50);
      }
    } catch (error) {
      console.error("Error rendering candlestick data:", error);
    }
  }, [chartInstance, formattedCandles, volumeEnabled]);

  return null; // This is a logic-only component, no UI to render
}
