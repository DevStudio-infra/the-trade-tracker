import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

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

interface TradingStore {
  // Broker State
  selectedBroker: string;
  selectedBrokerCredential: string | null;
  setSelectedBroker: (broker: string) => void;
  setSelectedBrokerCredential: (credentialId: string | null) => void;

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
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
}

export const useTradingStore = create<TradingStore>()(
  devtools(
    persist(
      (set) => ({
        // Broker State
        selectedBroker: "binance",
        selectedBrokerCredential: null,
        setSelectedBroker: (broker) => set({ selectedBroker: broker }),
        setSelectedBrokerCredential: (credentialId) => set({ selectedBrokerCredential: credentialId }),

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
        selectedPair: "EURUSD",
        setSelectedPair: (pair) => set({ selectedPair: pair }),
      }),
      {
        name: "trading-store",
      }
    )
  )
);
