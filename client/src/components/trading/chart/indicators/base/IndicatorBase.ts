"use client";

import { ISeriesApi, SeriesType } from "lightweight-charts";
import { ChartApiWithPanes, FormattedCandle, IndicatorConfig, IndicatorParameters, IndicatorType, indicatorDefaults } from "../../../chart/core/ChartTypes";
import { BaseIndicator, BaseIndicatorOptions, SeriesConstructor, SeriesCreationOptions } from "./types";

/**
 * Abstract base class for all indicators
 */
export abstract class IndicatorBase implements BaseIndicator {
  protected chart: ChartApiWithPanes | null = null;
  protected config: IndicatorConfig;
  protected mainSeries: ISeriesApi<SeriesType> | null = null;
  protected additionalSeries: { [key: string]: ISeriesApi<SeriesType> | null } = {};

  /**
   * Create a new indicator instance
   */
  constructor(options: BaseIndicatorOptions) {
    // Create configuration with defaults
    this.config = {
      id: options.id,
      type: options.type,
      name: options.name || options.type,
      color: options.color || "#2196F3",
      visible: options.visible !== undefined ? options.visible : true,
      parameters: {
        ...this.getDefaultParameters(),
        ...options.parameters,
      },
    };
  }

  /**
   * Initialize the indicator with a chart instance
   */
  initialize(chart: ChartApiWithPanes, config?: Partial<IndicatorConfig>): void {
    this.chart = chart;

    // Update config if provided
    if (config) {
      this.config = {
        ...this.config,
        ...config,
        parameters: {
          ...this.config.parameters,
          ...(config.parameters || {}),
        },
      };
    }
  }

  /**
   * Create the main series for this indicator
   * Each indicator implementation must override this
   */
  abstract createSeries(paneIndex: number): ISeriesApi<SeriesType> | null;

  /**
   * Update indicator data
   * Each indicator implementation must override this
   */
  abstract updateData(candles: FormattedCandle[]): void;

  /**
   * Destroy the indicator - remove series and clean up
   */
  destroy(): void {
    if (!this.chart) return;

    // Remove main series
    if (this.mainSeries) {
      this.chart.removeSeries(this.mainSeries);
      this.mainSeries = null;
    }

    // Remove additional series
    Object.values(this.additionalSeries).forEach((series) => {
      if (series) {
        this.chart?.removeSeries(series);
      }
    });

    this.additionalSeries = {};
    this.chart = null;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): IndicatorConfig {
    return this.config;
  }

  /**
   * Get current configuration
   * @deprecated Use getConfiguration instead
   */
  getConfig(): IndicatorConfig {
    return this.config;
  }

  /**
   * Update indicator parameters
   */
  setParameters(params: IndicatorParameters): void {
    this.config.parameters = {
      ...this.config.parameters,
      ...params,
    };
  }

  /**
   * Set indicator visibility
   */
  setVisible(visible: boolean): void {
    this.config.visible = visible;

    // Update series visibility
    if (this.mainSeries) {
      this.mainSeries.applyOptions({
        visible,
      });
    }

    // Update additional series visibility
    Object.values(this.additionalSeries).forEach((series) => {
      if (series) {
        series.applyOptions({
          visible,
        });
      }
    });
  }

  /**
   * Check if indicator is visible
   */
  isVisible(): boolean {
    return this.config.visible;
  }

  /**
   * Get indicator type
   */
  getType(): IndicatorType {
    return this.config.type as IndicatorType;
  }

  /**
   * Get indicator ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get indicator name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get the preferred pane index for this indicator type
   */
  getPreferredPaneIndex(): number {
    return indicatorDefaults[this.config.type as keyof typeof indicatorDefaults]?.defaultPane || 0;
  }

  /**
   * Get default parameters for this indicator type
   */
  protected getDefaultParameters(): IndicatorParameters {
    return indicatorDefaults[this.config.type as keyof typeof indicatorDefaults]?.defaultParameters || {};
  }

  /**
   * Helper to create a series with standard options
   */
  protected createStandardSeries<T extends SeriesType>(SeriesClass: SeriesConstructor<T>, options: SeriesCreationOptions, paneIndex: number): ISeriesApi<T> | null {
    if (!this.chart) return null;

    try {
      // Create the series with the chart
      const series = this.chart.addSeries(
        SeriesClass,
        {
          color: options.color || this.config.color,
          lineWidth: options.lineWidth ? { value: options.lineWidth, scaleWith: false } : undefined,
          lastValueVisible: options.lastValueVisible !== undefined ? options.lastValueVisible : true,
          priceFormat: options.priceFormat
            ? {
                type: options.priceFormat.type as "price" | "volume" | "percent",
                precision: options.priceFormat.precision,
                minMove: options.priceFormat.minMove,
              }
            : {
                type: "price",
                precision: 4,
                minMove: 0.0001,
              },
          title: options.title,
          priceScaleId: options.priceScaleId,
        },
        paneIndex
      );

      // Apply autoscale provider if provided
      if (options.autoscaleInfoProvider && typeof series.applyOptions === "function") {
        series.applyOptions({
          autoscaleInfoProvider: options.autoscaleInfoProvider,
        });
      }

      return series as ISeriesApi<T>;
    } catch (error) {
      console.error(`Error creating series for ${this.config.type} indicator:`, error);
      return null;
    }
  }
}
