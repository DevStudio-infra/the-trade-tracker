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

  /**
   * Create a new Bollinger Bands renderer
   */
  constructor(options: BollingerBandsRendererOptions) {
    super({
      ...options,
      name: options.name || `Bollinger Bands (${options.parameters.period || 20}, ${options.parameters.stdDev || 2})`,
      type: "BollingerBands",
    });
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

      // Log creation
      console.log(`[BB] Creating Bollinger Bands series for ${this.config.id} in pane ${paneIndex}`);

      // Create the middle band line series (SMA)
      this.middleBandSeries = this.chart.addSeries(
        LineSeries,
        {
          color: middleBandColor,
          // We use `any` here because the types in lightweight-charts are inconsistent
          // between different versions. In v3, lineWidth is a number, but in v4+ it's an object.
          lineWidth: 2 as any,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
          title: `BB Middle (${period})`,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create the upper band line series
      this.upperBandSeries = this.chart.addSeries(
        LineSeries,
        {
          color: upperBandColor,
          // We use `any` here because the types in lightweight-charts are inconsistent
          lineWidth: 1 as any,
          lastValueVisible: false,
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
          title: `BB Upper (${stdDev}σ)`,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create the lower band line series
      this.lowerBandSeries = this.chart.addSeries(
        LineSeries,
        {
          color: lowerBandColor,
          // We use `any` here because the types in lightweight-charts are inconsistent
          lineWidth: 1 as any,
          lastValueVisible: false,
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
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
    return 0; // Bollinger Bands go on the main price chart (pane 0)
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
