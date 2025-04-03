"use client";

import { ISeriesApi, SeriesType, LineSeries, HistogramSeries } from "lightweight-charts";
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
      console.log(`[MACD DEBUG] Creating MACD series in pane ${paneIndex}`);

      // Set default colors
      const macdColor = (this.config.parameters.macdColor as string) || "#2962FF";
      const signalColor = (this.config.parameters.signalColor as string) || "#FF6D00";
      const histogramPositiveColor = (this.config.parameters.histogramColorPositive as string) || "#26A69A";

      // Generate a unique ID for this specific MACD instance
      this.priceScaleId = `macd-${this.config.id}-scale`;

      console.log(`[MACD DEBUG] Using price scale ID: ${this.priceScaleId} for all MACD components`);

      // Common options for all series
      const commonOptions = {
        priceFormat: {
          type: "custom" as const,
          minMove: 0.0001,
          formatter: (price: number) => price.toFixed(4),
        },
        priceScaleId: this.priceScaleId,
        priceScale: {
          position: "left",
        },
      };

      // Create histogram first
      this.histogramSeries = this.chart.addSeries(
        HistogramSeries,
        {
          ...commonOptions,
          title: "MACD Histogram",
          color: histogramPositiveColor,
          base: 0,
          lastValueVisible: true,
        },
        paneIndex
      ) as ISeriesApi<"Histogram">;

      // Create MACD line
      this.macdLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonOptions,
          title: "MACD",
          color: macdColor,
          lineWidth: 2,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          priceLineVisible: false,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create signal line
      this.signalLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonOptions,
          title: "Signal",
          color: signalColor,
          lineWidth: 1,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          priceLineVisible: false,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Configure the price scale for all series
      if (this.macdLineSeries) {
        const priceScale = this.macdLineSeries.priceScale();
        priceScale.applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          mode: 0, // Normal mode for MACD
          alignLabels: true,
          borderVisible: true,
          borderColor: "rgba(197, 203, 206, 0.3)",
          textColor: "rgba(255, 255, 255, 0.5)",
          visible: true,
          autoScale: true,
        });
      }

      // Store references for cleanup
      this.additionalSeries = {
        histogramSeries: this.histogramSeries,
        signalSeries: this.signalLineSeries,
      };

      // Store main series reference
      this.mainSeries = this.macdLineSeries;

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
    // MACD should always be in its own pane like RSI and Stochastic
    return -1;
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

      // Update price scale to fit the data with better scaling
      if (this.macdLineSeries) {
        const priceScale = this.macdLineSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0, // Percentage mode for better scaling
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });
      }

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
