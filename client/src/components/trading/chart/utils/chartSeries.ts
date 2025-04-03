import { ISeriesApi, CandlestickSeriesPartialOptions, HistogramSeriesPartialOptions, DeepPartial, PriceFormat } from "lightweight-charts";
import { ChartApiWithPanes } from "../core/ChartTypes";
import { formatCandlesForChart, formatCandlesForVolume } from "./candles";
import { getCandlestickSeriesOptions, getVolumeSeriesOptions } from "./chartOptions";
import { Candle } from "@/lib/api";

export interface ChartSeries {
  candlestickSeries: ISeriesApi<"Candlestick">;
  volumeSeries: ISeriesApi<"Histogram">;
}

export const createChartSeries = (chart: ChartApiWithPanes, isDarkMode: boolean): ChartSeries => {
  const candlestickSeries = chart.addCandlestickSeries({
    ...getCandlestickSeriesOptions(isDarkMode),
  } as CandlestickSeriesPartialOptions);

  const volumeSeries = chart.addHistogramSeries({
    ...getVolumeSeriesOptions(isDarkMode),
    priceFormat: {
      type: "volume" as const,
      precision: 0,
      minMove: 1,
    } as DeepPartial<PriceFormat>,
  } as HistogramSeriesPartialOptions);

  return {
    candlestickSeries,
    volumeSeries,
  };
};

export const updateChartData = (series: ChartSeries, candles: Candle[]): void => {
  if (!candles.length) return;

  const candleData = formatCandlesForChart(candles);
  const volumeData = formatCandlesForVolume(candles);

  series.candlestickSeries.setData(candleData);
  series.volumeSeries.setData(volumeData);
};

export const updateSeriesOptions = (series: ChartSeries, isDarkMode: boolean): void => {
  series.candlestickSeries.applyOptions(getCandlestickSeriesOptions(isDarkMode));
  series.volumeSeries.applyOptions({
    ...getVolumeSeriesOptions(isDarkMode),
    priceFormat: {
      type: "volume" as const,
      precision: 0,
      minMove: 1,
    } as DeepPartial<PriceFormat>,
  } as HistogramSeriesPartialOptions);
};

export const removeSeries = (chart: ChartApiWithPanes, series: ChartSeries): void => {
  chart.removeSeries(series.candlestickSeries);
  chart.removeSeries(series.volumeSeries);
};
