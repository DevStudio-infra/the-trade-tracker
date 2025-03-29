"use client";

import { LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters } from "../../../chart/core/ChartTypes";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { calculateRSI } from "../calculations/rsi";

/**
 * RSI Renderer Options
 */
export interface RSIRendererOptions extends BaseIndicatorOptions {
  parameters: IndicatorParameters & {
    period?: number;
    overboughtLevel?: number;
    oversoldLevel?: number;
    middleLineColor?: string;
    upperLineColor?: string;
    lowerLineColor?: string;
  };
}

/**
 * RSI Indicator Renderer
 *
 * Implements the Relative Strength Index indicator
 * with configurable overbought and oversold levels
 */
export class RSIRenderer extends IndicatorBase {
  private rsiSeries: ISeriesApi<"Line"> | null = null;
  private overboughtSeries: ISeriesApi<"Line"> | null = null;
  private oversoldSeries: ISeriesApi<"Line"> | null = null;
  private middleSeries: ISeriesApi<"Line"> | null = null;
  private priceScaleId: string;

  /**
   * Create a new RSI renderer
   */
  constructor(options: RSIRendererOptions) {
    super({
      ...options,
      name: options.name || `RSI (${options.parameters.period || 14})`,
      type: "RSI",
    });
    this.priceScaleId = `rsi-scale-${options.id}`;
  }

  /**
   * Create the RSI series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Get parameters
      const period = (this.config.parameters.period as number) || 14;
      const overboughtLevel = (this.config.parameters.overboughtLevel as number) || 70;
      const oversoldLevel = (this.config.parameters.oversoldLevel as number) || 30;

      // Get colors
      const rsiColor = this.config.color;
      const middleLineColor = (this.config.parameters.middleLineColor as string) || "#787B86";
      const upperLineColor = (this.config.parameters.upperLineColor as string) || "#FF6D00";
      const lowerLineColor = (this.config.parameters.lowerLineColor as string) || "#00BCD4";

      // Log creation
      console.log(`[RSI] Creating RSI series for ${this.config.id} in pane ${paneIndex}`);

      // Create RSI line
      this.rsiSeries = this.createStandardSeries(
        LineSeries,
        {
          color: rsiColor,
          lineWidth: 2,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
          title: `RSI (${period})`,
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line"> | null;

      // Create overbought level line (typically at 70)
      this.overboughtSeries = this.createStandardSeries(
        LineSeries,
        {
          color: upperLineColor,
          lineWidth: 1,
          lastValueVisible: false,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
          title: `Overbought (${overboughtLevel})`,
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line"> | null;

      // Create oversold level line (typically at 30)
      this.oversoldSeries = this.createStandardSeries(
        LineSeries,
        {
          color: lowerLineColor,
          lineWidth: 1,
          lastValueVisible: false,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
          title: `Oversold (${oversoldLevel})`,
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line"> | null;

      // Create middle line (at 50)
      this.middleSeries = this.createStandardSeries(
        LineSeries,
        {
          color: middleLineColor,
          lineWidth: 1,
          lastValueVisible: false,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
          title: "Middle (50)",
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line"> | null;

      // Store references for later
      this.mainSeries = this.rsiSeries;

      // Store additional series for later reference
      this.additionalSeries = {
        overboughtSeries: this.overboughtSeries,
        oversoldSeries: this.oversoldSeries,
        middleSeries: this.middleSeries,
      };

      // Update config to store series reference
      this.config.series = this.rsiSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[RSI] Successfully created RSI series for ${this.config.id}`);

      return this.rsiSeries;
    } catch (error) {
      console.error(`[RSI] Error creating RSI series for ${this.config.id}:`, error);
      return null;
    }
  }

  /**
   * Update RSI data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.rsiSeries || !this.overboughtSeries || !this.oversoldSeries || !this.middleSeries || candles.length === 0) {
      return;
    }

    try {
      // Extract parameters with defaults
      const period = (this.config.parameters.period as number) || 14;
      const overboughtLevel = (this.config.parameters.overboughtLevel as number) || 70;
      const oversoldLevel = (this.config.parameters.oversoldLevel as number) || 30;

      // Calculate RSI data
      const rsiData = calculateRSI(candles, period);

      // Set data for the RSI line
      this.rsiSeries.setData(rsiData);

      // Create constant level data for overbought, oversold, and middle lines
      const levelData = rsiData.map((point) => ({
        time: point.time,
      }));

      // Set data for the level lines
      this.overboughtSeries.setData(
        levelData.map((point) => ({
          ...point,
          value: overboughtLevel,
        }))
      );

      this.oversoldSeries.setData(
        levelData.map((point) => ({
          ...point,
          value: oversoldLevel,
        }))
      );

      this.middleSeries.setData(
        levelData.map((point) => ({
          ...point,
          value: 50,
        }))
      );

      // Apply autoscale settings for better visualization
      if (this.rsiSeries && typeof this.rsiSeries.priceScale === "function") {
        const priceScale = this.rsiSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0,
        });

        // Apply fixed scale range
        this.rsiSeries.applyOptions({
          autoscaleInfoProvider: () => ({
            priceRange: {
              minValue: 0,
              maxValue: 100,
            },
            margins: {
              above: 0.1,
              below: 0.1,
            },
          }),
        });
      }
    } catch (error) {
      console.error(`[RSI] Error updating RSI data for ${this.config.id}:`, error);
    }
  }

  /**
   * Get the preferred pane index for this indicator type
   */
  getPreferredPaneIndex(): number {
    return -1; // RSI needs a separate pane
  }

  /**
   * Get default parameters for this indicator type
   */
  protected getDefaultParameters(): IndicatorParameters {
    return {
      period: 14,
      overboughtLevel: 70,
      oversoldLevel: 30,
    };
  }
}
