"use client";

import { LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters } from "../../../chart/core/ChartTypes";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { calculateStochastic } from "../calculations/stochastic";

/**
 * Stochastic Renderer Options
 */
export interface StochasticRendererOptions extends BaseIndicatorOptions {
  parameters: IndicatorParameters & {
    kPeriod?: number;
    dPeriod?: number;
    overboughtLevel?: number;
    oversoldLevel?: number;
    kLineColor?: string;
    dLineColor?: string;
    overboughtLineColor?: string;
    oversoldLineColor?: string;
  };
}

/**
 * Stochastic Oscillator Indicator Renderer
 *
 * Implements the Stochastic Oscillator with %K and %D lines
 * and configurable overbought and oversold levels
 */
export class StochasticRenderer extends IndicatorBase {
  private kSeries: ISeriesApi<"Line"> | null = null;
  private dSeries: ISeriesApi<"Line"> | null = null;
  private overboughtSeries: ISeriesApi<"Line"> | null = null;
  private oversoldSeries: ISeriesApi<"Line"> | null = null;
  private priceScaleId: string;

  /**
   * Create a new Stochastic renderer
   */
  constructor(options: StochasticRendererOptions) {
    super({
      ...options,
      name: options.name || `Stochastic (${options.parameters.kPeriod || 14}, ${options.parameters.dPeriod || 3})`,
      type: "Stochastic",
    });
    this.priceScaleId = `stochastic-scale-${options.id}`;
  }

  /**
   * Create the Stochastic series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Get parameters
      const kPeriod = (this.config.parameters.kPeriod as number) || 14;
      const dPeriod = (this.config.parameters.dPeriod as number) || 3;
      const overboughtLevel = (this.config.parameters.overboughtLevel as number) || 80;
      const oversoldLevel = (this.config.parameters.oversoldLevel as number) || 20;

      // Get colors
      const kLineColor = (this.config.parameters.kLineColor as string) || this.config.color;
      const dLineColor = (this.config.parameters.dLineColor as string) || "#FF6D00";
      const overboughtLineColor = (this.config.parameters.overboughtLineColor as string) || "#787B86";
      const oversoldLineColor = (this.config.parameters.oversoldLineColor as string) || "#787B86";

      // Log creation
      console.log(`[Stochastic] Creating Stochastic series for ${this.config.id} in pane ${paneIndex}`);

      // Create %K line
      this.kSeries = this.chart.addSeries(
        LineSeries,
        {
          color: kLineColor,
          // We use `any` here because the types in lightweight-charts are inconsistent
          // between different versions. In v3, lineWidth is a number, but in v4+ it's an object.
          lineWidth: 2 as any,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
          title: `%K (${kPeriod})`,
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create %D line
      this.dSeries = this.chart.addSeries(
        LineSeries,
        {
          color: dLineColor,
          // We use `any` here because the types in lightweight-charts are inconsistent
          lineWidth: 2 as any,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
          title: `%D (${dPeriod})`,
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create overbought level line
      this.overboughtSeries = this.chart.addSeries(
        LineSeries,
        {
          color: overboughtLineColor,
          // We use `any` here because the types in lightweight-charts are inconsistent
          lineWidth: 1 as any,
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
      ) as ISeriesApi<"Line">;

      // Create oversold level line
      this.oversoldSeries = this.chart.addSeries(
        LineSeries,
        {
          color: oversoldLineColor,
          // We use `any` here because the types in lightweight-charts are inconsistent
          lineWidth: 1 as any,
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
      ) as ISeriesApi<"Line">;

      // Store reference for later
      this.mainSeries = this.kSeries;

      // Store additional series for later reference
      this.additionalSeries = {
        dSeries: this.dSeries,
        overboughtSeries: this.overboughtSeries,
        oversoldSeries: this.oversoldSeries,
      };

      // Update config to store series reference
      this.config.series = this.kSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[Stochastic] Successfully created Stochastic series for ${this.config.id}`);

      return this.kSeries;
    } catch (error) {
      console.error(`[Stochastic] Error creating Stochastic series for ${this.config.id}:`, error);
      return null;
    }
  }

  /**
   * Update Stochastic data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.kSeries || !this.dSeries || !this.overboughtSeries || !this.oversoldSeries || candles.length === 0) {
      return;
    }

    try {
      // Extract parameters with defaults
      const kPeriod = (this.config.parameters.kPeriod as number) || 14;
      const dPeriod = (this.config.parameters.dPeriod as number) || 3;
      const overboughtLevel = (this.config.parameters.overboughtLevel as number) || 80;
      const oversoldLevel = (this.config.parameters.oversoldLevel as number) || 20;

      // Calculate Stochastic data
      const stochasticData = calculateStochastic(candles, kPeriod, dPeriod);

      // Set data for %K and %D lines
      this.kSeries.setData(stochasticData.k);
      this.dSeries.setData(stochasticData.d);

      // Create constant level data for overbought and oversold levels
      let levelData: { time: any }[] = [];

      // Use the same time points as the k line
      if (stochasticData.k.length > 0) {
        levelData = stochasticData.k.map((point) => ({
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
      }

      // Apply autoscale settings for better visualization
      if (this.kSeries && typeof this.kSeries.priceScale === "function") {
        const priceScale = this.kSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0,
        });

        // Apply fixed scale range to ensure 0-100 range
        this.kSeries.applyOptions({
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
      console.error(`[Stochastic] Error updating Stochastic data for ${this.config.id}:`, error);
    }
  }

  /**
   * Get the preferred pane index for this indicator type
   */
  getPreferredPaneIndex(): number {
    return -1; // Stochastic goes in a separate pane
  }

  /**
   * Get default parameters for this indicator type
   */
  protected getDefaultParameters(): IndicatorParameters {
    return {
      kPeriod: 14,
      dPeriod: 3,
      overboughtLevel: 80,
      oversoldLevel: 20,
    };
  }
}
