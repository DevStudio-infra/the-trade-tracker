"use client";

import { ISeriesApi, SeriesType, SeriesDefinition, SeriesPartialOptionsMap } from "lightweight-charts";
import { ChartApiWithPanes, FormattedCandle, IndicatorConfig, IndicatorParameters, IndicatorType, indicatorDefaults } from "../../../chart/core/ChartTypes";
import { BaseIndicator, BaseIndicatorOptions } from "./types";

/**
 * Base class for all indicators
 *
 * IMPORTANT LIMITATION:
 * Currently, there is an issue with the lightweight-charts v5 pane system where
 * multiple oscillator indicators returning -1 for getPreferredPaneIndex() still
 * end up in the same pane. As a temporary workaround, we are restricting the system
 * to only allow:
 * 1. Multiple indicators in the main chart pane (index 0)
 * 2. Single oscillator indicator in a separate pane
 *
 * This limitation is tracked in the todo list and will be addressed in a future update.
 * See /.cursor/rules/todo.mdc for more details.
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
    // If a pane index is specified in the configuration, use it
    if (typeof this.config.parameters.paneIndex === "number") {
      return this.config.parameters.paneIndex as number;
    }

    // By default, oscillators and other indicators that need their own pane
    // should return -1 to request a new pane
    const oscillatorTypes = ["RSI", "MACD", "Stochastic"];
    if (oscillatorTypes.includes(this.config.type)) {
      return -1;
    }

    // Overlay indicators go on the main chart (pane 0)
    return 0;
  }

  /**
   * Get default parameters for this indicator type
   */
  protected getDefaultParameters(): IndicatorParameters {
    const type = this.config?.type || "SMA";
    if (!type || !indicatorDefaults[type as keyof typeof indicatorDefaults]) {
      console.warn(`Unknown indicator type: ${type}, using defaults for SMA`);
      return indicatorDefaults["SMA"].defaultParameters || {};
    }
    return indicatorDefaults[type as keyof typeof indicatorDefaults]?.defaultParameters || {};
  }

  /**
   * Create a standard series with common configuration
   */
  protected createStandardSeries<T extends SeriesType>(seriesConstructor: SeriesDefinition<T>, options: SeriesPartialOptionsMap[T], paneIndex: number): ISeriesApi<T> | null {
    if (!this.chart) return null;

    try {
      // For main chart pane (pane 0), use the same price scale as the main series
      const priceScaleId = paneIndex === 0 ? "right" : options.priceScaleId || "left";

      // Create the series
      const series = this.chart.addSeries(
        seriesConstructor,
        {
          ...options,
          priceScaleId,
          overlay: paneIndex === 0,
        } as SeriesPartialOptionsMap[T],
        paneIndex
      );

      // Configure the price scale
      const priceScale = series.priceScale();
      if (priceScale) {
        priceScale.applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          borderVisible: true,
          borderColor: "rgba(197, 203, 206, 0.3)",
          visible: true,
          autoScale: true,
          mode: paneIndex === 0 ? 0 : 1,
        });
      }

      return series as ISeriesApi<T>;
    } catch (error) {
      console.error(`Error creating series:`, error);
      return null;
    }
  }
}
