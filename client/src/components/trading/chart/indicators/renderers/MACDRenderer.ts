"use client";

import { HistogramSeries, LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
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
    super(options);
    this.priceScaleId = `macd-scale-${options.id}`;
  }

  /**
   * Create all MACD series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Set default colors if not provided
      const macdColor = this.config.parameters.macdColor || "#2962FF";
      const signalColor = this.config.parameters.signalColor || "#FF6D00";
      const histogramColorPositive = this.config.parameters.histogramColorPositive || "#26A69A";
      const histogramColorNegative = this.config.parameters.histogramColorNegative || "#EF5350";

      // Log creation
      console.log(`[MACD] Creating MACD series for ${this.config.id} in pane ${paneIndex}`);

      // Create histogram first (background)
      this.histogramSeries = this.createStandardSeries(
        HistogramSeries,
        {
          color: histogramColorPositive,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
          title: "MACD Histogram",
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Histogram"> | null;

      // Create MACD line
      this.macdLineSeries = this.createStandardSeries(
        LineSeries,
        {
          color: macdColor,
          lineWidth: 3,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
          title: `MACD (${this.config.parameters.fastPeriod || 12},${this.config.parameters.slowPeriod || 26},${this.config.parameters.signalPeriod || 9})`,
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line"> | null;

      // Create Signal line
      this.signalLineSeries = this.createStandardSeries(
        LineSeries,
        {
          color: signalColor,
          lineWidth: 2,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
          title: "Signal",
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line"> | null;

      // Store series references
      this.mainSeries = this.histogramSeries;

      // Store additional series for later reference
      this.additionalSeries = {
        macdSeries: this.macdLineSeries,
        signalSeries: this.signalLineSeries,
      };

      // Update config to store series references
      this.config.series = this.histogramSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;
      this.config.parameters.additionalSeries = {
        macdSeries: this.macdLineSeries,
        signalSeries: this.signalLineSeries,
      };

      console.log(`[MACD] Successfully created MACD series for ${this.config.id}`);

      return this.histogramSeries;
    } catch (error) {
      console.error(`[MACD] Error creating MACD series for ${this.config.id}:`, error);
      return null;
    }
  }

  /**
   * Update MACD data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.macdLineSeries || !this.signalLineSeries || !this.histogramSeries || candles.length === 0) {
      return;
    }

    try {
      // Extract parameters with defaults
      const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = this.config.parameters;

      // Calculate MACD data
      const macdData = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);

      // Get colors
      const histogramPositiveColor = this.config.parameters.histogramColorPositive || "#26A69A";
      const histogramNegativeColor = this.config.parameters.histogramColorNegative || "#EF5350";

      // Find max absolute value for proper scaling
      let maxAbsValue = 0.0001;
      macdData.macdLine.forEach((point) => {
        maxAbsValue = Math.max(maxAbsValue, Math.abs(point.value));
      });
      macdData.signalLine.forEach((point) => {
        maxAbsValue = Math.max(maxAbsValue, Math.abs(point.value));
      });
      macdData.histogram.forEach((point) => {
        maxAbsValue = Math.max(maxAbsValue, Math.abs(point.value));
      });

      // Add 20% buffer
      maxAbsValue *= 1.2;

      // Set data for all components
      this.macdLineSeries.setData(macdData.macdLine);
      this.signalLineSeries.setData(macdData.signalLine);

      // Create colored histogram
      const coloredHistogram = macdData.histogram.map((item) => ({
        time: item.time,
        value: item.value,
        color: item.value >= 0 ? histogramPositiveColor : histogramNegativeColor,
      }));

      this.histogramSeries.setData(coloredHistogram);

      // Apply autoscale settings for better visualization
      if (this.histogramSeries && typeof this.histogramSeries.priceScale === "function") {
        const priceScale = this.histogramSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0,
          entireTextOnly: true,
        });

        // Apply fixed scale range
        this.histogramSeries.applyOptions({
          autoscaleInfoProvider: () => ({
            priceRange: {
              minValue: -maxAbsValue,
              maxValue: maxAbsValue,
            },
            margins: {
              above: 0.2,
              below: 0.2,
            },
          }),
        });
      }
    } catch (error) {
      console.error(`[MACD] Error updating MACD data for ${this.config.id}:`, error);
    }
  }

  /**
   * Destroy MACD indicator
   * Override parent to ensure all series are removed
   */
  destroy(): void {
    if (!this.chart) return;

    try {
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
    } catch (error) {
      console.error(`[MACD] Error destroying MACD indicator ${this.config.id}:`, error);
    }
  }
}
