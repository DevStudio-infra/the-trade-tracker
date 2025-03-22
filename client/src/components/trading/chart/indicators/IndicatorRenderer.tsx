"use client";

import { useEffect, useRef } from "react";
import { ChartInstanceRef, IndicatorConfig, FormattedCandle } from "../utils/chartTypes";
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from "../utils/indicatorCalculations";

interface IndicatorRendererProps {
  chartInstance: ChartInstanceRef | null;
  indicators: IndicatorConfig[];
  formattedCandles: FormattedCandle[];
  onIndicatorUpdated: (updatedIndicator: IndicatorConfig) => void;
}

/**
 * Component responsible for calculating and rendering indicators on the chart
 */
export function IndicatorRenderer({ chartInstance, indicators, formattedCandles, onIndicatorUpdated }: IndicatorRendererProps) {
  // Reference to track indicators for cleanup
  const prevIndicatorsRef = useRef<Record<string, IndicatorConfig>>({});

  // Apply indicators to chart when they change
  useEffect(() => {
    if (!chartInstance?.chart || formattedCandles.length === 0) return;

    try {
      // Process indicators one by one
      indicators.forEach((indicator) => {
        // Skip if the chart is no longer available
        if (!chartInstance.chart) return;

        // If this indicator already has a series attached, use it
        // Otherwise create a new one
        if (!indicator.series) {
          // Create different types of series based on indicator type
          switch (indicator.type) {
            case "sma":
            case "ema":
              // Create a line series for moving averages
              const lineSeries = chartInstance.chart.addLineSeries({
                color: indicator.color,
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: true,
                crosshairMarkerVisible: true,
                title: `${indicator.type.toUpperCase()} (${indicator.parameters.period})`,
              });

              // Add to the indicator object for future reference
              indicator.series = lineSeries;
              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: lineSeries });
              break;

            case "rsi":
              // RSI typically appears in a separate panel
              const rsiSeries = chartInstance.chart.addLineSeries({
                color: indicator.color,
                lineWidth: 2,
                priceScaleId: "rsi",
                lastValueVisible: true,
                priceFormat: {
                  type: "price",
                  precision: 2,
                  minMove: 0.01,
                },
                title: `RSI (${indicator.parameters.period})`,
              });

              // Configure the panel for RSI
              rsiSeries.priceScale().applyOptions({
                scaleMargins: {
                  top: 0.85, // Small panel at bottom of chart, below price and volume
                  bottom: 0.0,
                },
                borderVisible: true,
                borderColor: "#2B2B43", // Use dark theme border color
                visible: true,
              });

              // Add to the indicator object for future reference
              indicator.series = rsiSeries;
              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: rsiSeries });
              break;

            case "macd":
              // MACD requires multiple series
              // Here we create one for the MACD line
              const macdSeries = chartInstance.chart.addLineSeries({
                color: indicator.parameters.macdColor || "#2962FF",
                lineWidth: 2,
                priceScaleId: "macd",
                lastValueVisible: true,
                priceFormat: {
                  type: "price",
                  precision: 4,
                },
                title: "MACD",
              });

              // Configure the panel for MACD
              macdSeries.priceScale().applyOptions({
                scaleMargins: {
                  top: 0.75,
                  bottom: 0.0,
                },
                borderVisible: true,
                borderColor: "#2B2B43",
                visible: true,
              });

              // Add to the indicator object for future reference
              indicator.series = macdSeries;
              // Notify parent about the updated indicator
              onIndicatorUpdated({ ...indicator, series: macdSeries });
              break;

            case "bollinger":
              // Bollinger Bands need a line series per band
              const middleSeries = chartInstance.chart.addLineSeries({
                color: indicator.color,
                lineWidth: 2,
                title: `BB (${indicator.parameters.period})`,
                lastValueVisible: false,
              });

              const upperSeries = chartInstance.chart.addLineSeries({
                color: indicator.color,
                lineStyle: 2, // Dashed
                lineWidth: 1,
                title: "Upper",
                lastValueVisible: false,
              });

              const lowerSeries = chartInstance.chart.addLineSeries({
                color: indicator.color,
                lineStyle: 2, // Dashed
                lineWidth: 1,
                title: "Lower",
                lastValueVisible: false,
              });

              // For simplicity, we'll store just the middle series in the indicator
              // and manage upper/lower separately
              indicator.series = middleSeries;
              // Also store references to upper and lower bands
              (indicator as any).upperSeries = upperSeries;
              (indicator as any).lowerSeries = lowerSeries;

              // Notify parent about the updated indicator
              onIndicatorUpdated({
                ...indicator,
                series: middleSeries,
              });
              break;

            // Additional indicator types would be handled here
          }
        }

        // If we have a series attached to this indicator, update its data
        if (indicator.series && formattedCandles.length > 0) {
          // Calculate the indicator values based on type
          switch (indicator.type) {
            case "sma":
              // Simple Moving Average calculation
              const period = Number(indicator.parameters.period) || 20;
              const smaData = calculateSMA(formattedCandles, period);
              indicator.series.setData(smaData);
              break;

            case "ema":
              // Exponential Moving Average calculation
              const emaPeriod = Number(indicator.parameters.period) || 20;
              const emaData = calculateEMA(formattedCandles, emaPeriod);
              indicator.series.setData(emaData);
              break;

            case "rsi":
              // Relative Strength Index calculation
              const rsiPeriod = Number(indicator.parameters.period) || 14;
              const rsiData = calculateRSI(formattedCandles, rsiPeriod);
              indicator.series.setData(rsiData);
              break;

            case "macd":
              // MACD calculation
              const macdResult = calculateMACD(formattedCandles, indicator.parameters.fastPeriod, indicator.parameters.slowPeriod, indicator.parameters.signalPeriod);

              // Set data for the main MACD line
              indicator.series.setData(macdResult.macdLine);

              // For full MACD, we would also set signal line and histogram
              // but this would require more series setup and management
              break;

            case "bollinger":
              // Bollinger Bands calculation
              const bbResult = calculateBollingerBands(formattedCandles, indicator.parameters.period, indicator.parameters.stdDev);

              // Set data for all three bands
              const middleBand = bbResult.map((band) => ({
                time: band.time,
                value: band.middle,
              }));

              const upperBand = bbResult.map((band) => ({
                time: band.time,
                value: band.upper,
              }));

              const lowerBand = bbResult.map((band) => ({
                time: band.time,
                value: band.lower,
              }));

              indicator.series.setData(middleBand);

              // Set data for upper and lower bands if they exist
              if ((indicator as any).upperSeries) {
                (indicator as any).upperSeries.setData(upperBand);
              }

              if ((indicator as any).lowerSeries) {
                (indicator as any).lowerSeries.setData(lowerBand);
              }
              break;

            // Additional indicators would be calculated and rendered here
          }
        }
      });

      // Store current indicators in ref for cleanup
      indicators.forEach((indicator) => {
        prevIndicatorsRef.current[indicator.id] = indicator;
      });
    } catch (err) {
      console.error("Error applying indicators:", err);
    }
  }, [chartInstance, indicators, formattedCandles, onIndicatorUpdated]);

  // Clean up indicators when they are removed
  useEffect(() => {
    if (!chartInstance?.chart) return;

    // Clean up any removed indicators
    const indicatorIds = indicators.map((i) => i.id);
    const storedIds = Object.keys(prevIndicatorsRef.current);

    // Find indicators that were removed
    storedIds.forEach((id) => {
      if (!indicatorIds.includes(id) && prevIndicatorsRef.current[id]?.series) {
        try {
          // If the chart still exists, remove the series
          chartInstance.chart?.removeSeries(prevIndicatorsRef.current[id].series!);

          // Also remove any additional series for indicators like Bollinger Bands
          if ((prevIndicatorsRef.current[id] as any).upperSeries) {
            chartInstance.chart?.removeSeries((prevIndicatorsRef.current[id] as any).upperSeries);
          }

          if ((prevIndicatorsRef.current[id] as any).lowerSeries) {
            chartInstance.chart?.removeSeries((prevIndicatorsRef.current[id] as any).lowerSeries);
          }

          // Remove from our reference object
          delete prevIndicatorsRef.current[id];
          console.log(`Removed indicator: ${id}`);
        } catch (err) {
          console.error("Error removing indicator series:", err);
        }
      }
    });

    // Clean up on component unmount
    return () => {
      try {
        if (chartInstance.chart) {
          // Remove all indicator series
          Object.values(prevIndicatorsRef.current).forEach((indicator) => {
            if (indicator.series) {
              chartInstance.chart?.removeSeries(indicator.series);

              // Also remove any additional series
              if ((indicator as any).upperSeries) {
                chartInstance.chart?.removeSeries((indicator as any).upperSeries);
              }

              if ((indicator as any).lowerSeries) {
                chartInstance.chart?.removeSeries((indicator as any).lowerSeries);
              }
            }
          });

          // Clear the reference object
          prevIndicatorsRef.current = {};
        }
      } catch (err) {
        console.error("Error cleaning up indicators:", err);
      }
    };
  }, [chartInstance, indicators]);

  return null; // This is a logic-only component, no UI to render
}
