"use client";

import { ISeriesApi, SeriesType, HistogramSeries, LineSeries, Time } from "lightweight-charts";
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
    this.priceScaleId = `macd-scale-${options.id}`;
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

      // Generate a unique ID for this specific MACD instance to avoid overlap with other indicators
      const uniqueScaleId = `macd-${this.config.id}-scale`;

      // Create a common price format
      const priceFormat = {
        type: "price" as const,
        precision: 5,
        minMove: 0.00001,
      };

      // STEP 1: Create the histogram first as the base element
      console.log(`[MACD DEBUG] Creating histogram first in pane ${paneIndex}`);
      this.histogramSeries = this.chart.addSeries(
        HistogramSeries,
        {
          color: histogramPositiveColor,
          base: 0,
          priceLineVisible: false,
          lastValueVisible: true,
          priceFormat: priceFormat,
          title: "MACD Histogram",
          priceScaleId: uniqueScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Histogram">;

      // STEP 2: Now create the MACD line using the SAME price scale ID
      console.log(`[MACD DEBUG] Creating MACD line with the same price scale`);
      this.macdLineSeries = this.chart.addSeries(
        LineSeries,
        {
          color: macdColor,
          lineWidth: 2,
          lastValueVisible: true,
          priceFormat: priceFormat,
          title: `MACD (${this.config.parameters.fastPeriod || 12},${this.config.parameters.slowPeriod || 26},${this.config.parameters.signalPeriod || 9})`,
          priceScaleId: uniqueScaleId, // SAME price scale ID
        },
        paneIndex // SAME pane index
      ) as ISeriesApi<"Line">;

      // STEP 3: Create the signal line last, but with the SAME price scale ID
      console.log(`[MACD DEBUG] Creating signal line with the same price scale`);
      this.signalLineSeries = this.chart.addSeries(
        LineSeries,
        {
          color: signalColor,
          lineWidth: 1,
          lineStyle: 1, // Dashed line
          lastValueVisible: true,
          priceFormat: priceFormat,
          title: "Signal",
          priceScaleId: uniqueScaleId, // SAME price scale ID
        },
        paneIndex // SAME pane index
      ) as ISeriesApi<"Line">;

      // Configure price scale settings only AFTER all series have been added
      if (this.histogramSeries) {
        console.log(`[MACD DEBUG] Configuring shared price scale`);
        try {
          // Get the price scale from any of the series
          const priceScale = this.histogramSeries.priceScale();

          // Apply options
          priceScale.applyOptions({
            autoScale: true,
            mode: 0, // Normal scale
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
            entireTextOnly: true,
          });

          console.log(`[MACD DEBUG] Successfully configured price scale`);
        } catch (e) {
          console.error(`[MACD ERROR] Error configuring price scale:`, e);
        }
      }

      // Store references for later use
      this.mainSeries = this.macdLineSeries; // Main reference is MACD Line

      // Store additional series references
      this.additionalSeries = {
        histogramSeries: this.histogramSeries,
        signalSeries: this.signalLineSeries,
      };

      // Update config
      this.config.series = this.macdLineSeries;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      // Add a test marker to visualize the pane
      this.createTestMarker(paneIndex, uniqueScaleId);

      console.log(`[MACD DEBUG] Successfully created all MACD components in pane ${paneIndex}`);

      return this.macdLineSeries;
    } catch (error) {
      console.error(`[MACD ERROR] Error creating MACD series:`, error);
      return null;
    }
  }

  /**
   * Create a test marker to verify pane rendering
   */
  private createTestMarker(paneIndex: number, priceScaleId: string): void {
    try {
      if (!this.chart) return;

      console.log(`[MACD DEBUG] Adding test marker with scale ID ${priceScaleId}`);

      // Add a test label line to verify the pane
      const testLine = this.chart.addSeries(
        LineSeries,
        {
          color: "#FF0000",
          lineWidth: 1,
          lastValueVisible: true,
          title: `TEST-MACD-PANE-${paneIndex}`,
          priceScaleId: priceScaleId, // Use the same price scale ID
        },
        paneIndex
      );

      // Add a single point with proper Time type and ensure it's at 0 value
      const currentTime = Math.floor(Date.now() / 1000) as Time;

      // Add a horizontal line at zero to visualize the boundary
      testLine.setData([{ time: currentTime, value: 0 }]);

      console.log(`[MACD DEBUG] Created test marker in pane ${paneIndex}`);
    } catch (error) {
      console.error(`[MACD ERROR] Error creating test marker:`, error);
    }
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
