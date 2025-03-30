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

      // Use the price scale ID provided in parameters
      if (this.config.parameters.priceScaleId) {
        this.priceScaleId = this.config.parameters.priceScaleId as string;
      }
      console.log(`[Stochastic] Using price scale ID: ${this.priceScaleId} in pane ${paneIndex}`);

      // Determine the pane type for proper configuration
      const isInMainPane = paneIndex === 0;
      const isInVolumPane = paneIndex === 1;
      const isInDedicatedPane = !isInMainPane && !isInVolumPane;

      console.log(`[Stochastic] Pane configuration: mainPane=${isInMainPane}, volumePane=${isInVolumPane}, dedicatedPane=${isInDedicatedPane}`);

      // CRITICAL FIX: Create all series in the same synchronized operation
      // to ensure they're all placed in exactly the same pane

      // Define shared options for all series - optimized for each pane type
      const sharedSeriesOptions = {
        priceScaleId: this.priceScaleId,
        priceFormat: {
          type: "price" as const,
          precision: 2,
          minMove: 0.01,
        },
        // Configure based on pane type
        overlay: isInMainPane || isInVolumPane, // Use overlay mode for main and volume panes
        lastValueVisible: true,

        // For any pane, use explicit scale configuration for Stochastic (0-100 scale)
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
      };

      // CRITICAL FIX: Use a more explicit approach to build the series
      // Store all series creation parameters to ensure synchronized creation
      const seriesParams = [
        // K line (main series)
        {
          type: "k",
          options: {
            ...sharedSeriesOptions,
            color: kLineColor,
            title: `%K (${kPeriod})`,
            lineWidth: 2,
            priceLineVisible: false,
          },
        },
        // Overbought line
        {
          type: "overbought",
          options: {
            ...sharedSeriesOptions,
            color: overboughtLineColor,
            title: "", // No title for level lines
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
        },
        // Oversold line
        {
          type: "oversold",
          options: {
            ...sharedSeriesOptions,
            color: oversoldLineColor,
            title: "", // No title for level lines
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
        },
        // D line
        {
          type: "d",
          options: {
            ...sharedSeriesOptions,
            color: dLineColor,
            title: `%D (${dPeriod})`,
            lineWidth: 2,
            priceLineVisible: false,
            crosshairMarkerVisible: true,
          },
        },
      ];

      // CRITICAL FIX: Create all series at once in a synchronized block
      console.log(`[Stochastic] Creating all Stochastic series in pane ${paneIndex} with synchronized approach`);

      let kSeries: ISeriesApi<SeriesType> | null = null;
      let overboughtSeries: ISeriesApi<SeriesType> | null = null;
      let oversoldSeries: ISeriesApi<SeriesType> | null = null;
      let dSeries: ISeriesApi<SeriesType> | null = null;

      try {
        // Create all series in one synchronized block to ensure they're in the same pane
        if (this.chart) {
          // Create K line first (main series) - CRITICAL: Use this as the anchor for all other series
          kSeries = this.chart.addSeries(
            LineSeries,
            // Use type assertion that matches what the API expects
            seriesParams[0].options as any,
            paneIndex
          );
          console.log(`[Stochastic] Successfully created K line (anchor series) in pane ${paneIndex}`);
          this.kSeries = kSeries as ISeriesApi<"Line">;

          // Create the overbought line AFTER the K line is created
          overboughtSeries = this.chart.addSeries(
            LineSeries,
            // Use type assertion that matches what the API expects
            seriesParams[1].options as any,
            paneIndex
          );
          console.log(`[Stochastic] Successfully created Overbought line in pane ${paneIndex}`);
          this.overboughtSeries = overboughtSeries as ISeriesApi<"Line">;

          // Create the oversold line AFTER the overbought line is created
          oversoldSeries = this.chart.addSeries(
            LineSeries,
            // Use type assertion that matches what the API expects
            seriesParams[2].options as any,
            paneIndex
          );
          console.log(`[Stochastic] Successfully created Oversold line in pane ${paneIndex}`);
          this.oversoldSeries = oversoldSeries as ISeriesApi<"Line">;

          // Create the D line AFTER the oversold line is created
          dSeries = this.chart.addSeries(
            LineSeries,
            // Use type assertion that matches what the API expects
            seriesParams[3].options as any,
            paneIndex
          );
          console.log(`[Stochastic] Successfully created D line in pane ${paneIndex}`);
          this.dSeries = dSeries as ISeriesApi<"Line">;

          // CRITICAL VERIFICATION: Verify all series are in the same pane
          console.log(`[Stochastic] Verification - All series created in pane ${paneIndex}`);
        }
      } catch (err) {
        console.error(`[Stochastic] Error creating synchronized series set: ${err}`);
        // If we fail, attempt cleanup
        if (kSeries && this.chart) this.chart.removeSeries(kSeries);
        if (overboughtSeries && this.chart) this.chart.removeSeries(overboughtSeries);
        if (oversoldSeries && this.chart) this.chart.removeSeries(oversoldSeries);
        if (dSeries && this.chart) this.chart.removeSeries(dSeries);

        this.kSeries = null;
        this.overboughtSeries = null;
        this.oversoldSeries = null;
        this.dSeries = null;

        return null;
      }

      // Set initial data for overbought/oversold level lines if we have candle data
      const data = this._getStoredData();
      if (data && data.length > 0) {
        const firstTime = data[0].time;
        const lastTime = data[data.length - 1].time;

        if (this.overboughtSeries) {
          this.overboughtSeries.setData([
            { time: firstTime, value: overboughtLevel },
            { time: lastTime, value: overboughtLevel },
          ]);
        }

        if (this.oversoldSeries) {
          this.oversoldSeries.setData([
            { time: firstTime, value: oversoldLevel },
            { time: lastTime, value: oversoldLevel },
          ]);
        }
      }

      // Configure price scale explicitly - based on pane type
      try {
        if (kSeries) {
          const priceScale = kSeries.priceScale();
          if (priceScale) {
            // Different configurations based on pane type
            if (isInMainPane) {
              // For main pane, optimize Stochastic as an overlay
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
              // CRITICAL FIX: Use very specific margins to ensure indicator displays properly
              priceScale.applyOptions({
                scaleMargins: {
                  // Position ABOVE volume bars with careful margins
                  top: 0.05, // Very small margin at top
                  bottom: 0.5, // Leave bottom half for volume
                },
                visible: true,
                autoScale: false,
                mode: 2, // Entire range mode
              });

              // CRITICAL FIX: Configure kSeries for better visibility in volume pane
              if (this.kSeries) {
                this.kSeries.applyOptions({
                  lastValueVisible: true,
                  priceLineVisible: false,
                  baseLineVisible: false,
                  // Make line more prominent in the volume pane
                  lineWidth: 2,
                });
              }

              // CRITICAL FIX: Configure dSeries for better visibility in volume pane
              if (this.dSeries) {
                this.dSeries.applyOptions({
                  lastValueVisible: true,
                  priceLineVisible: false,
                  baseLineVisible: false,
                  // Make line more prominent in the volume pane
                  lineWidth: 2,
                });
              }
            } else {
              // For a dedicated pane, use full range
              priceScale.applyOptions({
                scaleMargins: {
                  top: 0.1,
                  bottom: 0.1,
                },
                visible: true,
                autoScale: false,
                mode: 2, // Entire range mode
              });
            }
            console.log(`[Stochastic] Configured price scale for ${this.config.id} in pane ${paneIndex}`);
          }
        }
      } catch (err) {
        console.error(`[Stochastic] Error configuring price scale: ${err}`);
      }

      // Calculate and set data if we have chart data already
      if (data && data.length > 0 && this.kSeries && this.dSeries) {
        this.updateData(data);
      }

      // Store the main series for the renderer to reference
      this.mainSeries = kSeries;

      // Store pane index and series in config for future reference
      this.config.series = kSeries || undefined;
      this.config.paneIndex = paneIndex;

      // Return the main series (K line)
      return kSeries;
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
   * Get the preferred pane index for the indicator
   */
  getPreferredPaneIndex(): number {
    // If a pane index is specified in the configuration, use it
    if (typeof this.config.parameters.paneIndex === "number") {
      return this.config.parameters.paneIndex as number;
    }

    // CRITICAL FIX: Always use pane 1 (volume pane) for Stochastic
    // This ensures all Stochastic indicators go in the same pane
    return 1;
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
