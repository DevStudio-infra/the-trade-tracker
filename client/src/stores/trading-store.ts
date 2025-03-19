import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { BrokerConnection } from "@/lib/api";

export interface Position {
  id: string;
  pair: string;
  side: "buy" | "sell";
  size: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  pnlPercentage: number;
  timestamp: string;
}

export interface Order {
  id: string;
  pair: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  size: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  status: "pending" | "filled" | "cancelled";
  timestamp: string;
}

export interface WatchlistItem {
  pair: string;
  price: number;
  change24h: number;
  alerts?: {
    price: number;
    condition: "above" | "below";
  }[];
}

// New interface for AI trading configuration
export interface AITradingConfig {
  // Analysis options
  analysisOnly: boolean; // true = analysis only, false = analysis + execution
  customPrompt: string; // custom text to add to the prompt
  selectedStrategyId: string | null; // strategy to use for analysis

  // Scheduling options
  scheduledAnalysis: boolean; // true = run analysis on schedule
  backgroundService: boolean; // true = run as background service, false = run in browser
  analysisInterval: number; // minutes between analyses

  // Execution options
  riskPercentage: number; // percentage of account to risk per trade
  maxOpenPositions: number; // maximum number of open positions
  confirmationRequired: boolean; // require user confirmation before execution
}

interface TradingStore {
  // Broker State
  selectedBroker: BrokerConnection | null;
  setSelectedBroker: (broker: BrokerConnection | null) => void;

  // Positions
  positions: Position[];
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string) => void;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;

  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (pair: string) => void;
  updateWatchlistItem: (pair: string, updates: Partial<WatchlistItem>) => void;

  // Selected Trading Pair
  selectedPair: string | null;
  setSelectedPair: (pair: string | null) => void;

  // AI Trading Configuration
  aiTradingConfig: AITradingConfig;
  updateAITradingConfig: (updates: Partial<AITradingConfig>) => void;
  resetAITradingConfig: () => void;
}

// Default AI trading configuration
const defaultAITradingConfig: AITradingConfig = {
  analysisOnly: true,
  customPrompt: "",
  selectedStrategyId: null,
  scheduledAnalysis: false,
  backgroundService: false,
  analysisInterval: 60, // 1 hour
  riskPercentage: 1, // 1% risk per trade
  maxOpenPositions: 3,
  confirmationRequired: true,
};

export const useTradingStore = create<TradingStore>()(
  devtools(
    persist(
      (set) => ({
        // Broker State
        selectedBroker: null,
        setSelectedBroker: (broker) => set({ selectedBroker: broker }),

        // Positions
        positions: [],
        addPosition: (position) =>
          set((state) => ({
            positions: [...state.positions, position],
          })),
        updatePosition: (id, updates) =>
          set((state) => ({
            positions: state.positions.map((pos) => (pos.id === id ? { ...pos, ...updates } : pos)),
          })),
        closePosition: (id) =>
          set((state) => ({
            positions: state.positions.filter((pos) => pos.id !== id),
          })),

        // Orders
        orders: [],
        addOrder: (order) =>
          set((state) => ({
            orders: [...state.orders, order],
          })),
        updateOrder: (id, updates) =>
          set((state) => ({
            orders: state.orders.map((order) => (order.id === id ? { ...order, ...updates } : order)),
          })),
        cancelOrder: (id) =>
          set((state) => ({
            orders: state.orders.filter((order) => order.id !== id),
          })),

        // Watchlist
        watchlist: [],
        addToWatchlist: (item) =>
          set((state) => ({
            watchlist: [...state.watchlist, item],
          })),
        removeFromWatchlist: (pair) =>
          set((state) => ({
            watchlist: state.watchlist.filter((item) => item.pair !== pair),
          })),
        updateWatchlistItem: (pair, updates) =>
          set((state) => ({
            watchlist: state.watchlist.map((item) => (item.pair === pair ? { ...item, ...updates } : item)),
          })),

        // Selected Trading Pair
        selectedPair: null,
        setSelectedPair: (pair) => set({ selectedPair: pair }),

        // AI Trading Configuration
        aiTradingConfig: defaultAITradingConfig,
        updateAITradingConfig: (updates) =>
          set((state) => ({
            aiTradingConfig: { ...state.aiTradingConfig, ...updates },
          })),
        resetAITradingConfig: () => set({ aiTradingConfig: defaultAITradingConfig }),
      }),
      {
        name: "trading-store",
      }
    )
  )
);
