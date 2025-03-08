import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface UserPreferences {
  tradeConfirmation: boolean;
  autoClosePositions: boolean;
  defaultLotSize: number;
  riskPercentage: number;
  notifications: {
    trades: boolean;
    signals: boolean;
    priceAlerts: boolean;
    news: boolean;
  };
  chartDefaults: {
    timeframe: string;
    indicators: string[];
    theme: "light" | "dark" | "system";
  };
}

export interface Credits {
  available: number;
  used: number;
  subscription: "free" | "pro";
  nextRenewal: string;
  history: {
    id: string;
    amount: number;
    type: "usage" | "purchase" | "renewal";
    description: string;
    timestamp: string;
  }[];
}

interface UserStore {
  // Credits Management
  credits: Credits;
  updateCredits: (updates: Partial<Credits>) => void;
  addCreditsHistory: (entry: Credits["history"][0]) => void;
  clearCreditsHistory: () => void;

  // User Preferences
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;

  // Theme Settings
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

const defaultPreferences: UserPreferences = {
  tradeConfirmation: true,
  autoClosePositions: true,
  defaultLotSize: 0.01,
  riskPercentage: 1,
  notifications: {
    trades: true,
    signals: true,
    priceAlerts: true,
    news: false,
  },
  chartDefaults: {
    timeframe: "1h",
    indicators: ["ema", "rsi"],
    theme: "system",
  },
};

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        // Credits Management
        credits: {
          available: 0,
          used: 0,
          subscription: "free",
          nextRenewal: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          history: [],
        },
        updateCredits: (updates) =>
          set((state) => ({
            credits: {
              ...state.credits,
              ...updates,
            },
          })),
        addCreditsHistory: (entry) =>
          set((state) => ({
            credits: {
              ...state.credits,
              history: [entry, ...state.credits.history].slice(0, 100), // Keep last 100 entries
            },
          })),
        clearCreditsHistory: () =>
          set((state) => ({
            credits: {
              ...state.credits,
              history: [],
            },
          })),

        // User Preferences
        preferences: defaultPreferences,
        updatePreferences: (updates) =>
          set((state) => ({
            preferences: {
              ...state.preferences,
              ...updates,
            },
          })),
        resetPreferences: () =>
          set({
            preferences: defaultPreferences,
          }),

        // Theme Settings
        theme: "system",
        setTheme: (theme) => set({ theme }),
      }),
      {
        name: "user-store",
      }
    )
  )
);
