"use client";

import { LineSeries, ISeriesApi, SeriesType, Time } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters, ChartApiWithPanes, IndicatorConfig } from "../../../chart/core/ChartTypes";
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
  private chartData: FormattedCandle[] = [];

  /**
   * Create a new Stochastic renderer
   */
  constructor(options: StochasticRendererOptions) {
    super({
      ...options,
      name: options.name || `Stochastic (${options.parameters.kPeriod || 14}, ${options.parameters.dPeriod || 3})`,
      type: "Stochastic",
    });
    console.log("[Stochastic] Creating StochasticRenderer with options:", {
      id: options.id,
      name: options.name || `Stochastic (${options.parameters.kPeriod || 14}, ${options.parameters.dPeriod || 3})`,
      type: "Stochastic",
      parameters: options.parameters,
    });
    this.priceScaleId = `stochastic-scale-${options.id}`;
  }

  /**
   * Initialize the indicator with the chart instance
   */
  initialize(chart: ChartApiWithPanes, config: IndicatorConfig): void {
    console.log(`[Stochastic] Initializing StochasticRenderer with chart: ${!!chart} config: ${config.id}`);
    this.chart = chart;
    this.config = config;

    // Store references
    if (config.parameters && config.parameters.paneIndex !== undefined) {
      this.config.paneIndex = config.parameters.paneIndex as number;
    }

    // If priceScaleId is provided, use it
    if (config.parameters && config.parameters.priceScaleId) {
      this.priceScaleId = config.parameters.priceScaleId as string;
    }
  }

  /**
   * Create the Stochastic series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) {
      console.error(`[Stochastic] Cannot create series without chart instance for ${this.config.id}`);
      return null;
    }

    try {
      // Get parameters
      const kPeriod = (this.config.parameters.kPeriod as number) || 14;
      const dPeriod = (this.config.parameters.dPeriod as number) || 3;
      const overboughtLevel = (this.config.parameters.overboughtLevel as number) || 80;
      const oversoldLevel = (this.config.parameters.oversoldLevel as number) || 20;

      // Get colors
      const kLineColor = (this.config.parameters.kLineColor as string) || "#2962FF"; // Blue
      const dLineColor = (this.config.parameters.dLineColor as string) || "#FF6D00"; // Orange
      const overboughtLineColor = (this.config.parameters.overboughtLineColor as string) || "#787B86";
      const oversoldLineColor = (this.config.parameters.oversoldLineColor as string) || "#787B86";

      console.log(`[Stochastic] Creating Stochastic series in pane ${paneIndex}`);

      // Common options for all series
      const commonSeriesOptions = {
        priceFormat: {
          type: "price" as const,
          precision: 2,
          minMove: 0.01,
        },
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      };

      // Create K line (main series)
      this.kSeries = this.createStandardSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: kLineColor,
          lineWidth: 2,
          title: `%K (${kPeriod})`,
          priceLineVisible: true,
          priceLineColor: kLineColor,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create D line
      this.dSeries = this.createStandardSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: dLineColor,
          lineWidth: 2,
          title: `%D (${dPeriod})`,
          priceLineVisible: true,
          priceLineColor: dLineColor,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create overbought level line
      this.overboughtSeries = this.createStandardSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: overboughtLineColor,
          lineWidth: 1,
          title: `Overbought (${overboughtLevel})`,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create oversold level line
      this.oversoldSeries = this.createStandardSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: oversoldLineColor,
          lineWidth: 1,
          title: `Oversold (${oversoldLevel})`,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Configure the price scale for all series
      if (this.kSeries) {
        const priceScale = this.kSeries.priceScale();
        priceScale.applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          mode: 1, // Percentage mode
          alignLabels: true,
          borderVisible: true,
          borderColor: "rgba(197, 203, 206, 0.3)",
          textColor: "rgba(255, 255, 255, 0.5)",
          visible: true,
          autoScale: true,
        });
      }

      // Store references
      this.mainSeries = this.kSeries;
      this.additionalSeries = {
        dSeries: this.dSeries,
        overboughtSeries: this.overboughtSeries,
        oversoldSeries: this.oversoldSeries,
      };

      // Update config
      this.config.series = this.kSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[Stochastic] Successfully created Stochastic series`);
      return this.kSeries;
    } catch (error) {
      console.error(`[Stochastic] Error creating Stochastic series:`, error);
      return null;
    }
  }

  /**
   * Helper method to safely get stored data
   * @private
   */
  private _getStoredData() {
    // Access the field that stores the candle data, which might have different names
    // Try common field names that might store the data
    if (Array.isArray(this.chartData) && this.chartData.length > 0) {
      return this.chartData;
    }

    // Access potential 'data' property with safe type assertion
    const self = this as unknown as { data?: FormattedCandle[] };
    if (Array.isArray(self.data) && self.data.length > 0) {
      return self.data;
    }

    // If we don't have any data yet, return null
    return null;
  }

  /**
   * Update Stochastic data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.kSeries || !this.dSeries || !this.overboughtSeries || !this.oversoldSeries || candles.length === 0) {
      console.warn(`[Stochastic] Cannot update Stochastic data: missing series or empty candles for ${this.config.id}`, {
        hasKSeries: !!this.kSeries,
        hasDSeries: !!this.dSeries,
        hasOverboughtSeries: !!this.overboughtSeries,
        hasOversoldSeries: !!this.oversoldSeries,
        candlesLength: candles.length,
      });
      return;
    }

    try {
      // Extract parameters with defaults
      const kPeriod = (this.config.parameters.kPeriod as number) || 14;
      const dPeriod = (this.config.parameters.dPeriod as number) || 3;
      const overboughtLevel = (this.config.parameters.overboughtLevel as number) || 80;
      const oversoldLevel = (this.config.parameters.oversoldLevel as number) || 20;

      console.log(`[Stochastic] Calculating Stochastic data for ${this.config.id} with ${candles.length} candles`);

      // Calculate Stochastic data
      const stochasticData = calculateStochastic(candles, kPeriod, dPeriod);

      // Log data points for debugging
      console.log(`[Stochastic] Calculated data for ${this.config.id}: K=${stochasticData.k.length} points, D=${stochasticData.d.length} points`);

      // Set data for %K and %D lines
      this.kSeries.setData(stochasticData.k);
      this.dSeries.setData(stochasticData.d);

      // Create constant level data for overbought and oversold levels
      let levelData: { time: Time }[] = [];

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

        console.log(`[Stochastic] Set level data for ${this.config.id} with ${levelData.length} points`);
      }

      // Verify all series are using the same price scale
      if (this.kSeries && this.dSeries && this.overboughtSeries && this.oversoldSeries) {
        const kScaleId = this.kSeries.options().priceScaleId;
        const dScaleId = this.dSeries.options().priceScaleId;
        const overboughtScaleId = this.overboughtSeries.options().priceScaleId;
        const oversoldScaleId = this.oversoldSeries.options().priceScaleId;

        console.log(`[Stochastic] VERIFICATION after data - All series priceScaleIds:`, {
          kScaleId,
          dScaleId,
          overboughtScaleId,
          oversoldScaleId,
        });
      }

      // Force re-application of price scale settings after data is loaded
      // This helps ensure proper rendering with correct scale
      if (this.kSeries && typeof this.kSeries.priceScale === "function") {
        const priceScale = this.kSeries.priceScale();
        if (priceScale) {
          // Re-apply price scale options to force update
          priceScale.applyOptions({
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
            visible: true,
            autoScale: false,
            mode: 0,
            entireTextOnly: false,
          });

          console.log(`[Stochastic] Reapplied price scale options after data update for ${this.config.id}`);

          // Request the chart to update the layout
          if (this.chart && typeof this.chart.applyOptions === "function") {
            // Trigger a layout update by slightly adjusting options
            setTimeout(() => {
              if (this.chart) {
                this.chart.applyOptions({});
              }
            }, 10);
          }
        }
      }
    } catch (error) {
      console.error(`[Stochastic] Error updating Stochastic data for ${this.config.id}:`, error);
    }
  }

  /**
   * Get the preferred pane index for this indicator
   */
  getPreferredPaneIndex(): number {
    return -1; // Stochastic always needs its own pane
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

  /**
   * Destroy the indicator and cleanup resources
   */
  destroy(): void {
    console.log(`[Stochastic] Destroying indicator ${this.config.id}`);

    try {
      // Remove main series from chart
      if (this.chart && this.kSeries) {
        this.chart.removeSeries(this.kSeries);
        this.kSeries = null;
        console.log(`[Stochastic] Removed K series for ${this.config.id}`);
      }

      // Remove D series from chart
      if (this.chart && this.dSeries) {
        this.chart.removeSeries(this.dSeries);
        this.dSeries = null;
        console.log(`[Stochastic] Removed D series for ${this.config.id}`);
      }

      // Remove overbought series from chart
      if (this.chart && this.overboughtSeries) {
        this.chart.removeSeries(this.overboughtSeries);
        this.overboughtSeries = null;
        console.log(`[Stochastic] Removed overbought series for ${this.config.id}`);
      }

      // Remove oversold series from chart
      if (this.chart && this.oversoldSeries) {
        this.chart.removeSeries(this.oversoldSeries);
        this.oversoldSeries = null;
        console.log(`[Stochastic] Removed oversold series for ${this.config.id}`);
      }

      // Clear references in config
      if (this.config) {
        this.config.series = undefined;
        this.config.paneIndex = undefined;
      }

      // Clear references in additional series
      this.additionalSeries = {};

      // Clear chart reference
      this.chart = null;

      console.log(`[Stochastic] Successfully destroyed indicator ${this.config.id}`);
    } catch (error) {
      console.error(`[Stochastic] Error destroying indicator ${this.config.id}:`, error);
    }
  }
}
