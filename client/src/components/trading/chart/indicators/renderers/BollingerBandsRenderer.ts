"use client";

import { LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters } from "../../../chart/core/ChartTypes";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { calculateBollingerBands } from "../calculations/bollinger";

/**
 * Bollinger Bands Renderer Options
 */
export interface BollingerBandsRendererOptions extends BaseIndicatorOptions {
  parameters: IndicatorParameters & {
    period?: number;
    stdDev?: number;
    middleBandColor?: string;
    upperBandColor?: string;
    lowerBandColor?: string;
    priceScaleId?: string;
  };
}

/**
 * Bollinger Bands Indicator Renderer
 *
 * Implements the Bollinger Bands indicator with middle, upper, and lower bands
 */
export class BollingerBandsRenderer extends IndicatorBase {
  private middleBandSeries: ISeriesApi<"Line"> | null = null;
  private upperBandSeries: ISeriesApi<"Line"> | null = null;
  private lowerBandSeries: ISeriesApi<"Line"> | null = null;
  private priceScaleId: string;

  /**
   * Create a new Bollinger Bands renderer
   */
  constructor(options: BollingerBandsRendererOptions) {
    super({
      ...options,
      name: options.name || `Bollinger Bands (${options.parameters.period || 20}, ${options.parameters.stdDev || 2})`,
      type: "BollingerBands",
    });

    // Create a unique price scale ID for this instance
    this.priceScaleId = `bbands-${options.id}-scale`;
  }

  /**
   * Create the Bollinger Bands series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Get parameters
      const period = (this.config.parameters.period as number) || 20;
      const stdDev = (this.config.parameters.stdDev as number) || 2;

      // Get colors
      const middleBandColor = (this.config.parameters.middleBandColor as string) || this.config.color;
      const upperBandColor = (this.config.parameters.upperBandColor as string) || "#FF6D00";
      const lowerBandColor = (this.config.parameters.lowerBandColor as string) || "#2962FF";

      // Use price scale ID from parameters if provided, otherwise use the one from constructor
      if (this.config.parameters.priceScaleId) {
        this.priceScaleId = this.config.parameters.priceScaleId as string;
      }

      // Log creation
      console.log(`[BB] Creating Bollinger Bands series for ${this.config.id} in pane ${paneIndex} with price scale ID: ${this.priceScaleId}`);

      // Create the common options for all bands
      const commonSeriesOptions = {
        priceFormat: {
          type: "price" as const,
          precision: 4,
          minMove: 0.0001,
        },
        lastValueVisible: true,
        // For main pane, we want to share the price scale with candlesticks
        priceScaleId: paneIndex === 0 ? "right" : this.priceScaleId,
      };

      // Create the middle band line series (SMA)
      this.middleBandSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: middleBandColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 2 as any,
          title: `BB Middle (${period})`,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create the upper band line series
      this.upperBandSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: upperBandColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 1 as any,
          title: `BB Upper (${stdDev}σ)`,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create the lower band line series
      this.lowerBandSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: lowerBandColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 1 as any,
          title: `BB Lower (${stdDev}σ)`,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Store reference for later
      this.mainSeries = this.middleBandSeries;

      // Store additional series for later reference
      this.additionalSeries = {
        upperBandSeries: this.upperBandSeries,
        lowerBandSeries: this.lowerBandSeries,
      };

      // Update config to store series reference
      this.config.series = this.middleBandSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[BB] Successfully created Bollinger Bands series for ${this.config.id}`);

      return this.middleBandSeries;
    } catch (error) {
      console.error(`[BB] Error creating Bollinger Bands series for ${this.config.id}:`, error);
      return null;
    }
  }

  /**
   * Update Bollinger Bands data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.middleBandSeries || !this.upperBandSeries || !this.lowerBandSeries || candles.length === 0) {
      return;
    }

    try {
      // Extract parameters with defaults
      const period = (this.config.parameters.period as number) || 20;
      const stdDev = (this.config.parameters.stdDev as number) || 2;

      // Calculate Bollinger Bands data
      const bbData = calculateBollingerBands(candles, period, stdDev);

      // Set the data for each series
      this.middleBandSeries.setData(bbData.middle);
      this.upperBandSeries.setData(bbData.upper);
      this.lowerBandSeries.setData(bbData.lower);

      // Apply autoscale settings for better visualization
      if (this.middleBandSeries && typeof this.middleBandSeries.priceScale === "function") {
        const priceScale = this.middleBandSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0,
        });
      }
    } catch (error) {
      console.error(`[BB] Error updating Bollinger Bands data for ${this.config.id}:`, error);
    }
  }

  /**
   * Get the preferred pane index for this indicator type
   */
  getPreferredPaneIndex(): number {
    // If a pane index is specified in the configuration, use it
    if (typeof this.config.parameters.paneIndex === "number") {
      return this.config.parameters.paneIndex as number;
    }

    // Default to main chart (pane 0)
    return 0;
  }

  /**
   * Get default parameters for this indicator type
   */
  protected getDefaultParameters(): IndicatorParameters {
    return {
      period: 20,
      stdDev: 2,
    };
  }
}
