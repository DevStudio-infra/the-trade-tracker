import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface Signal {
  id: string;
  pair: string;
  type: "buy" | "sell";
  timeframe: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  strategy: string;
  confidence: number;
  status: "pending" | "executed" | "cancelled" | "expired";
  chartConfig?: ChartConfig;
  createdAt: string;
  expiresAt: string;
}

export interface ChartConfig {
  indicators: {
    type: string;
    settings: Record<string, number | string | boolean>;
    visible: boolean;
  }[];
  timeframe: string;
  chartType: "candlestick" | "line" | "area";
  theme: "light" | "dark";
  overlays: {
    type: string;
    data: Array<{
      timestamp: number;
      value: number;
      label?: string;
    }>;
    visible: boolean;
  }[];
}

interface SignalsStore {
  // Active Signals
  signals: Signal[];
  addSignal: (signal: Signal) => void;
  updateSignal: (id: string, updates: Partial<Signal>) => void;
  removeSignal: (id: string) => void;

  // Signal History
  signalHistory: Signal[];
  addToHistory: (signal: Signal) => void;
  clearHistory: () => void;

  // Chart Configurations
  chartConfigs: Record<string, ChartConfig>;
  updateChartConfig: (pair: string, config: Partial<ChartConfig>) => void;
  resetChartConfig: (pair: string) => void;

  // Default Chart Settings
  defaultChartConfig: ChartConfig;
  updateDefaultConfig: (config: Partial<ChartConfig>) => void;
}

const defaultConfig: ChartConfig = {
  indicators: [
    {
      type: "ema",
      settings: { period: 20 },
      visible: true,
    },
    {
      type: "rsi",
      settings: { period: 14 },
      visible: true,
    },
  ],
  timeframe: "1h",
  chartType: "candlestick",
  theme: "dark",
  overlays: [],
};

export const useSignalsStore = create<SignalsStore>()(
  devtools(
    persist(
      (set) => ({
        // Active Signals
        signals: [],
        addSignal: (signal) =>
          set((state) => ({
            signals: [...state.signals, signal],
          })),
        updateSignal: (id, updates) =>
          set((state) => ({
            signals: state.signals.map((signal) => (signal.id === id ? { ...signal, ...updates } : signal)),
          })),
        removeSignal: (id) =>
          set((state) => ({
            signals: state.signals.filter((signal) => signal.id !== id),
          })),

        // Signal History
        signalHistory: [],
        addToHistory: (signal) =>
          set((state) => ({
            signalHistory: [signal, ...state.signalHistory].slice(0, 100), // Keep last 100 signals
          })),
        clearHistory: () => set({ signalHistory: [] }),

        // Chart Configurations
        chartConfigs: {},
        updateChartConfig: (pair, config) =>
          set((state) => ({
            chartConfigs: {
              ...state.chartConfigs,
              [pair]: {
                ...state.chartConfigs[pair],
                ...config,
              },
            },
          })),
        resetChartConfig: (pair) =>
          set((state) => ({
            chartConfigs: {
              ...state.chartConfigs,
              [pair]: defaultConfig,
            },
          })),

        // Default Chart Settings
        defaultChartConfig: defaultConfig,
        updateDefaultConfig: (config) =>
          set((state) => ({
            defaultChartConfig: {
              ...state.defaultChartConfig,
              ...config,
            },
          })),
      }),
      {
        name: "signals-store",
      }
    )
  )
);
