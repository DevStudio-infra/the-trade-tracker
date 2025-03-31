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
  private histogramColorPositive: string = "#26A69A"; // Default positive color
  private histogramColorNegative: string = "#EF5350"; // Default negative color

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

      // Store colors for later use
      this.histogramColorPositive = histogramPositiveColor;
      this.histogramColorNegative = histogramNegativeColor;
      console.log("[MACD DEBUG] Using histogram colors - positive:", histogramPositiveColor, "negative:", histogramNegativeColor);

      // Common options for all series to ensure no labels are shown
      const commonSeriesOptions = {
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        title: "",
        priceFormat: {
          type: "price" as const,
          precision: 2,
          minMove: 0.01,
        },
        priceScaleId: this.priceScaleId,
      };

      // Create histogram first
      console.log("[MACD DEBUG] Creating histogram first in pane", paneIndex);
      this.histogramSeries = this.chart.addSeries(
        HistogramSeries,
        {
          ...commonSeriesOptions,
          color: histogramPositiveColor,
        },
        paneIndex
      );

      // Create MACD line
      console.log("[MACD DEBUG] Creating MACD line with the same price scale");
      this.macdLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: macdColor,
          lineWidth: 2,
        },
        paneIndex
      );

      // Create signal line
      console.log("[MACD DEBUG] Creating signal line with the same price scale");
      this.signalLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: signalColor,
          lineWidth: 1,
        },
        paneIndex
      );

      // Configure the price scale for all series
      console.log("[MACD DEBUG] Configuring shared price scale");
      const priceScale = this.macdLineSeries.priceScale();
      priceScale.applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        visible: false,
        entireTextOnly: true,
      });

      // Store references for cleanup
      this.additionalSeries = {
        histogramSeries: this.histogramSeries,
        signalSeries: this.signalLineSeries,
      };

      // Store main series reference
      this.mainSeries = this.macdLineSeries;

      // Apply additional options to ensure visibility settings
      [this.macdLineSeries, this.signalLineSeries, this.histogramSeries].forEach((series) => {
        if (series) {
          series.applyOptions({
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            title: "",
          });
        }
      });

      console.log("[MACD DEBUG] Successfully created all MACD components in pane", paneIndex);
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
