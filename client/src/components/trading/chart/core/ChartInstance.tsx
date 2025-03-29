"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { createChart, DeepPartial, ChartOptions, ISeriesApi } from "lightweight-charts";
import { ChartApiWithPanes, FormattedCandle } from "./ChartTypes";
import { BaseIndicator } from "../indicators/base/types";

interface ChartInstanceProps {
  width: number;
  height: number;
  candles: FormattedCandle[];
  indicators?: BaseIndicator[];
  chartOptions?: DeepPartial<ChartOptions>;
  onChartReady?: (chart: ChartApiWithPanes) => void;
}

/**
 * ChartInstance Component
 *
 * Manages the lightweight-charts instance with multiple panes and indicators
 */
export function ChartInstance({ width, height, candles, indicators = [], chartOptions = {}, onChartReady }: ChartInstanceProps) {
  // Refs for chart container and chart instance
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartApiWithPanes | null>(null);

  // Ref for main series
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Track created panes (0 = main price chart, 1 = volume chart)
  const [panes, setPanes] = useState<{ [key: number]: boolean }>({ 0: true });

  // Track active indicators
  const [activeIndicators, setActiveIndicators] = useState<BaseIndicator[]>([]);

  // Initialize chart
  useEffect(() => {
    if (chartContainerRef.current) {
      // Clean up previous chart if it exists
      if (chartRef.current) {
        chartRef.current.remove();
      }

      // Create chart with default options
      const chart = createChart(chartContainerRef.current, {
        width,
        height,
        layout: {
          background: { color: "#ffffff" },
          textColor: "#333333",
        },
        grid: {
          vertLines: { color: "#f0f0f0" },
          horzLines: { color: "#f0f0f0" },
        },
        timeScale: {
          borderColor: "#d1d1d1",
        },
        rightPriceScale: {
          borderColor: "#d1d1d1",
        },
        ...chartOptions,
      }) as ChartApiWithPanes;

      // Store the chart instance
      chartRef.current = chart;

      // Notify parent that chart is ready
      if (onChartReady) {
        onChartReady(chart);
      }
    }

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [width, height, chartOptions, onChartReady]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize(width, height);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [width, height]);

  // Update candles when they change
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    // The main candlestick series will be created by the parent TradingChart component
    // This effect will only update data if the parent component decides to track the main series
    if (mainSeriesRef.current) {
      mainSeriesRef.current.setData(candles);
    }
  }, [candles]);

  // Ensure a pane exists at the given index
  const ensurePaneExists = useCallback(
    (paneIndex: number): boolean => {
      if (panes[paneIndex]) {
        return true; // Pane already exists
      }

      if (!chartRef.current) {
        return false; // No chart instance
      }

      try {
        // Check if chart has panes support
        if (typeof chartRef.current.panes === "function") {
          const currentPanes = chartRef.current.panes();

          // If needed pane index is beyond current panes, create new ones
          if (paneIndex >= currentPanes.length && typeof chartRef.current.createPane === "function") {
            // Create panes until we reach the target index
            for (let i = currentPanes.length; i <= paneIndex; i++) {
              console.log(`Creating pane ${i}`);

              // Adjust height based on pane type
              const paneHeight = i === 1 ? 100 : 200; // Volume pane is smaller

              chartRef.current.createPane({ height: paneHeight });

              // Update panes state
              setPanes((prev) => ({ ...prev, [i]: true }));
            }

            return true;
          } else if (paneIndex < currentPanes.length) {
            // Pane already exists in chart but not in our state
            setPanes((prev) => ({ ...prev, [paneIndex]: true }));
            return true;
          }
        }
      } catch (error) {
        console.error("Error ensuring pane exists:", error);
      }

      return false;
    },
    [panes]
  );

  // Initialize and update indicators
  useEffect(() => {
    if (!chartRef.current) return;

    // Track which indicators have been processed
    const processedIndicators = new Set<string>();

    // Initialize new indicators
    indicators.forEach((indicator) => {
      const id = indicator.getId();

      // Skip if already processed
      if (processedIndicators.has(id)) return;
      processedIndicators.add(id);

      // Initialize the indicator with the chart
      if (!activeIndicators.some((ai) => ai.getId() === id)) {
        // Get preferred pane index first so it can be initialized with the correct options
        const preferredPaneIndex = indicator.getPreferredPaneIndex();
        const targetPaneIndex = preferredPaneIndex >= 0 ? preferredPaneIndex : Math.max(2, Object.keys(panes).length); // Oscillators go in separate panes

        // Check if chart instance exists before initializing
        if (chartRef.current) {
          // Initialize with chart and config options
          indicator.initialize(chartRef.current, {
            id: indicator.getId(),
            type: indicator.getType(),
            name: indicator.getName(),
            color: "#000000", // Default color, will be set by the indicator
            visible: indicator.isVisible(),
            parameters: { paneIndex: targetPaneIndex },
          });

          // Ensure the pane exists
          const paneExists = ensurePaneExists(targetPaneIndex);

          if (paneExists) {
            // Create the indicator series
            indicator.createSeries(targetPaneIndex);

            // If data is available, update the indicator
            if (candles.length > 0) {
              indicator.updateData(candles);
            }

            // Add to active indicators
            setActiveIndicators((prev) => [...prev, indicator]);
          } else {
            console.error(`Failed to create pane ${targetPaneIndex} for indicator ${id}`);
          }
        }
      }
    });

    // Remove indicators that are no longer in the list
    activeIndicators.forEach((indicator) => {
      const id = indicator.getId();
      if (!indicators.some((i) => i.getId() === id)) {
        // Clean up the indicator
        indicator.destroy();

        // Remove from active indicators
        setActiveIndicators((prev) => prev.filter((i) => i.getId() !== id));
      }
    });
  }, [indicators, activeIndicators, candles, ensurePaneExists]);

  // Update indicator data when candles change
  useEffect(() => {
    if (candles.length === 0) return;

    // Update all active indicators with new data
    activeIndicators.forEach((indicator) => {
      indicator.updateData(candles);
    });
  }, [candles, activeIndicators]);

  return <div className="chart-instance" ref={chartContainerRef} />;
}
