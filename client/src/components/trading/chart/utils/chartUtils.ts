import { ColorType } from "lightweight-charts";
import { ChartColors } from "./chartTypes";
import type { ChartInstanceRef } from "./chartTypes";

// Chart colors for light/dark themes
export const chartColors = {
  light: {
    background: "#FFFFFF",
    text: "#333333",
    grid: "#EAEAEA",
    borderColor: "#DDDDDD",
    upColor: "#26A69A",
    downColor: "#EF5350",
    wickUpColor: "#26A69A",
    wickDownColor: "#EF5350",
    volumeUp: "rgba(38, 166, 154, 0.5)",
    volumeDown: "rgba(239, 83, 80, 0.5)",
  },
  dark: {
    background: "#1E222D",
    text: "#DDD",
    grid: "#2B2B43",
    borderColor: "#2B2B43",
    upColor: "#4CAF50",
    downColor: "#FF5252",
    wickUpColor: "#4CAF50",
    wickDownColor: "#FF5252",
    volumeUp: "rgba(76, 175, 80, 0.5)",
    volumeDown: "rgba(255, 82, 82, 0.5)",
  },
};

// Function to get chart colors based on theme
export const getChartColors = (theme: string): ChartColors => {
  return theme === "dark" ? chartColors.dark : chartColors.light;
};

// Function to create basic chart options based on colors
export const createChartOptions = (colors: ChartColors, width: number, height: number = 500) => {
  return {
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.text,
      fontSize: 12,
    },
    grid: {
      vertLines: { color: colors.grid },
      horzLines: { color: colors.grid },
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 10,
      barSpacing: 8,
      fixLeftEdge: true,
      fixRightEdge: true,
      borderColor: colors.borderColor,
    },
    rightPriceScale: {
      borderColor: colors.borderColor,
      entireTextOnly: true,
    },
    width: width,
    height: height,
  };
};

// Function to force chart reflow - use when chart doesn't render properly
export const forceChartReflow = (chartInstance: ChartInstanceRef, chartContainerRef: React.RefObject<HTMLDivElement>) => {
  if (!chartInstance || !chartInstance.chart) return;

  // Force a chart reflow by slightly modifying options and fitting content
  const chart = chartInstance.chart;

  // Apply resize trick
  const container = chartContainerRef.current;
  if (container) {
    const currentWidth = container.clientWidth;

    // First apply a slightly different width
    chart.applyOptions({ width: currentWidth - 1 });

    // Then revert to original width
    setTimeout(() => {
      chart.applyOptions({ width: currentWidth });
      chart.timeScale().fitContent();
    }, 10);
  }
};

// Helper function for better formatted date/time tooltip
export const formatTooltipTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formattedDate} ${formattedTime}`;
};
