"use client";

import { ISeriesApi, SeriesType, HistogramSeries, LineSeries } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters } from "../../../chart/core/ChartTypes";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { calculateMACD } from "../calculations/macd";

/**
 * MACD Renderer specific options
 */
export interface MACDRendererOptions extends BaseIndicatorOptions {
  parameters: IndicatorParameters & {
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
    macdColor?: string;
    signalColor?: string;
    histogramColorPositive?: string;
    histogramColorNegative?: string;
  };
}

/**
 * MACD Indicator Renderer
 *
 * Implements the Moving Average Convergence Divergence indicator
 * with three components:
 * 1. MACD line (difference between fast and slow EMAs)
 * 2. Signal line (EMA of MACD line)
 * 3. Histogram (difference between MACD and signal lines)
 */
export class MACDRenderer extends IndicatorBase {
  private macdLineSeries: ISeriesApi<"Line"> | null = null;
  private signalLineSeries: ISeriesApi<"Line"> | null = null;
  private histogramSeries: ISeriesApi<"Histogram"> | null = null;
  private priceScaleId: string;

  /**
   * Create a new MACD renderer
   */
  constructor(options: MACDRendererOptions) {
    // Ensure options.type is set if not provided
    if (!options.type) {
      console.warn("[MACD WARNING] Type not provided in options, setting default 'MACD'");
      options.type = "MACD";
    }

    super(options);
    this.priceScaleId = `macd-${options.id}-scale`;
    console.log(`[MACD DEBUG] Created MACD renderer with ID ${options.id}, type: ${options.type}, priceScaleId: ${this.priceScaleId}`);
  }

  /**
   * Create all MACD series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) {
      console.error("[MACD ERROR] Cannot create series, chart is null");
      return null;
    }

    try {
      console.log(`[MACD DEBUG] Using a new approach for MACD rendering in pane ${paneIndex}`);

      // Set default colors
      const macdColor = (this.config.parameters.macdColor as string) || "#2962FF";
      const signalColor = (this.config.parameters.signalColor as string) || "#FF6D00";
      const histogramPositiveColor = (this.config.parameters.histogramColorPositive as string) || "#26A69A";
      const histogramNegativeColor = (this.config.parameters.histogramColorNegative as string) || "#EF5350";

      // Use price scale ID from parameters if provided, otherwise generate one
      if (this.config.parameters.priceScaleId) {
        this.priceScaleId = this.config.parameters.priceScaleId as string;
      } else {
        // Generate a unique ID for this specific MACD instance to avoid overlap with other indicators
        this.priceScaleId = `macd-${this.config.id}-scale`;
      }

      console.log(`[MACD DEBUG] Using price scale ID: ${this.priceScaleId} for all MACD components`);

      // Determine the pane type for proper configuration
      const isInMainPane = paneIndex === 0;
      const isInVolumPane = paneIndex === 1;
      const isInDedicatedPane = !isInMainPane && !isInVolumPane;

      console.log(`[MACD DEBUG] Pane configuration: mainPane=${isInMainPane}, volumePane=${isInVolumPane}, dedicatedPane=${isInDedicatedPane}`);

      // Create a common price format
      const priceFormat = {
        type: "price" as const,
        precision: 5,
        minMove: 0.00001,
      };

      // CRITICAL: Create all series with shared options to ensure they remain in the same pane
      const sharedSeriesOptions = {
        priceScaleId: this.priceScaleId,
        priceFormat: priceFormat,
        // Configure based on pane type
        overlay: isInMainPane, // Only use overlay mode for main pane
      };

      // STEP 1: Create the histogram first as the base element
      console.log(`[MACD DEBUG] Creating histogram first in pane ${paneIndex}`);
      this.histogramSeries = this.chart.addSeries(
        HistogramSeries,
        {
          ...sharedSeriesOptions,
          color: histogramPositiveColor,
          base: 0,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "MACD Histogram",
        },
        paneIndex
      ) as ISeriesApi<"Histogram">;

      // Save the negative color for later use when updating data
      this.config.parameters.histogramColorNegative = histogramNegativeColor;
      console.log(`[MACD DEBUG] Using histogram colors - positive: ${histogramPositiveColor}, negative: ${histogramNegativeColor}`);

      // STEP 2: Now create the MACD line using the SAME price scale ID
      console.log(`[MACD DEBUG] Creating MACD line with the same price scale`);
      this.macdLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...sharedSeriesOptions,
          color: macdColor,
          lineWidth: 2,
          lastValueVisible: true,
          title: `MACD (${this.config.parameters.fastPeriod || 12},${this.config.parameters.slowPeriod || 26},${this.config.parameters.signalPeriod || 9})`,
        },
        paneIndex // SAME pane index
      ) as ISeriesApi<"Line">;

      // STEP 3: Create the signal line last, but with the SAME price scale ID
      console.log(`[MACD DEBUG] Creating signal line with the same price scale`);
      this.signalLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...sharedSeriesOptions,
          color: signalColor,
          lineWidth: 1,
          lineStyle: 1, // Dashed line
          lastValueVisible: true,
          title: "Signal",
        },
        paneIndex // SAME pane index
      ) as ISeriesApi<"Line">;

      // Configure price scale settings only AFTER all series have been added
      if (this.histogramSeries) {
        console.log(`[MACD DEBUG] Configuring shared price scale`);
        try {
          // Get the price scale from any of the series
          const priceScale = this.histogramSeries.priceScale();

          // Apply different options based on pane type
          if (isInMainPane) {
            // For main pane, optimize as an overlay
            priceScale.applyOptions({
              scaleMargins: {
                // Position in the upper area of the main chart
                top: 0.7,
                bottom: 0.2,
              },
              visible: false, // Don't show a separate scale
              autoScale: false, // Use fixed scale
              mode: 2, // Entire range mode
            });
          } else if (isInVolumPane) {
            // For volume pane, optimize positioning above volume bars
            priceScale.applyOptions({
              scaleMargins: {
                // Position ABOVE volume bars with careful margins
                top: 0.05, // Very small margin at top
                bottom: 0.5, // Leave bottom half for volume
              },
              visible: true,
              autoScale: true,
              mode: 0,
            });
          } else {
            // For a dedicated pane, use full range
            priceScale.applyOptions({
              autoScale: true,
              mode: 0, // Normal scale
              scaleMargins: {
                top: 0.1,
                bottom: 0.1,
              },
              entireTextOnly: true,
            });
          }

          console.log(`[MACD DEBUG] Successfully configured price scale for ${this.config.id} in pane ${paneIndex}`);
        } catch (e) {
          console.error(`[MACD ERROR] Error configuring price scale:`, e);
        }
      }

      // Store references for later use
      this.mainSeries = this.macdLineSeries;

      // Store additional series references
      this.additionalSeries = {
        histogramSeries: this.histogramSeries,
        signalSeries: this.signalLineSeries,
      };

      // Update config
      this.config.series = this.macdLineSeries;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[MACD DEBUG] Successfully created all MACD components in pane ${paneIndex}`);

      return this.macdLineSeries;
    } catch (error) {
      console.error(`[MACD ERROR] Error creating MACD series:`, error);
      return null;
    }
  }

  /**
   * Get the preferred pane index for this indicator
   */
  getPreferredPaneIndex(): number {
    // If a pane index is specified in the configuration, use it
    if (typeof this.config.parameters.paneIndex === "number") {
      return this.config.parameters.paneIndex as number;
    }

    // CRITICAL FIX: Always use pane 1 (volume pane) for MACD
    // This ensures all MACD indicators go in the same pane
    return 1;
  }

  /**
   * Update all MACD series with calculated data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.macdLineSeries || !this.signalLineSeries || !this.histogramSeries || !this.chart || !candles.length) {
      console.log(`[MACD DEBUG] Cannot update MACD data, missing components`);
      console.log(`[MACD DEBUG] MACD line exists: ${!!this.macdLineSeries}`);
      console.log(`[MACD DEBUG] Signal line exists: ${!!this.signalLineSeries}`);
      console.log(`[MACD DEBUG] Histogram exists: ${!!this.histogramSeries}`);
      console.log(`[MACD DEBUG] Chart exists: ${!!this.chart}`);
      console.log(`[MACD DEBUG] Candles length: ${candles.length}`);
      return;
    }

    try {
      // Extract parameters
      const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = this.config.parameters;
      const histogramPositiveColor = (this.config.parameters.histogramColorPositive as string) || "#26A69A";
      const histogramNegativeColor = (this.config.parameters.histogramColorNegative as string) || "#EF5350";

      console.log(`[MACD DEBUG] Calculating MACD with params: fast=${fastPeriod}, slow=${slowPeriod}, signal=${signalPeriod}`);

      // Calculate MACD values
      const macdData = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);

      console.log(`[MACD DEBUG] MACD calculation complete, got ${macdData.macdLine.length} data points`);

      // Set data for MACD line
      this.macdLineSeries.setData(macdData.macdLine);

      // Set data for signal line
      this.signalLineSeries.setData(macdData.signalLine);

      // Set data for histogram with colors
      const coloredHistogram = macdData.histogram.map((item) => ({
        time: item.time,
        value: item.value,
        color: item.value >= 0 ? histogramPositiveColor : histogramNegativeColor,
      }));

      this.histogramSeries.setData(coloredHistogram);

      console.log(`[MACD DEBUG] Updated ${this.config.id} with ${macdData.macdLine.length} data points in pane ${this.config.paneIndex}`);
    } catch (error) {
      console.error(`[MACD ERROR] Error updating data:`, error);
    }
  }

  /**
   * Destroy MACD indicator
   * Override parent to ensure all series are removed
   */
  destroy(): void {
    if (!this.chart) return;

    try {
      console.log(`[MACD DEBUG] Destroying MACD indicator ${this.config.id}`);

      // Remove all series
      if (this.histogramSeries) {
        this.chart.removeSeries(this.histogramSeries);
        this.histogramSeries = null;
      }

      if (this.macdLineSeries) {
        this.chart.removeSeries(this.macdLineSeries);
        this.macdLineSeries = null;
      }

      if (this.signalLineSeries) {
        this.chart.removeSeries(this.signalLineSeries);
        this.signalLineSeries = null;
      }

      // Clear references
      this.mainSeries = null;
      this.additionalSeries = {};
      this.chart = null;

      console.log(`[MACD DEBUG] Successfully destroyed MACD indicator ${this.config.id}`);
    } catch (error) {
      console.error(`[MACD ERROR] Error destroying MACD indicator:`, error);
    }
  }
}
