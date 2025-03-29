/**
 * Utility functions for series manipulation
 */

import { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { ChartApiWithPanes } from "../../core/ChartTypes";

/**
 * Safely remove a series from a chart
 */
export function removeSeries(chart: IChartApi | ChartApiWithPanes | null, series: ISeriesApi<SeriesType> | null): void {
  if (!chart || !series) return;

  try {
    chart.removeSeries(series);
  } catch (error) {
    console.error("Error removing series:", error);
  }
}
