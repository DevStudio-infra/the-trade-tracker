import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface PriceUpdate {
  pair: string;
  bid: number;
  ask: number;
  timestamp: number;
}

interface WebSocketStore {
  // Connection State
  status: ConnectionStatus;
  lastError: string | null;
  reconnectAttempts: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;

  // Connection Management
  connect: () => void;
  disconnect: () => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  resetReconnectAttempts: () => void;

  // Subscriptions
  subscribedPairs: string[];
  subscribe: (pair: string) => void;
  unsubscribe: (pair: string) => void;
  clearSubscriptions: () => void;

  // Price Data
  prices: { [key: string]: PriceUpdate | undefined };
  updatePrice: (update: PriceUpdate) => void;
  clearPrices: () => void;

  // WebSocket Instance
  socket: WebSocket | null;
  setSocket: (socket: WebSocket | null) => void;
}

export const useWebSocketStore = create<WebSocketStore>()(
  devtools((set) => ({
    // Connection State
    status: "disconnected",
    lastError: null,
    reconnectAttempts: 0,
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 5,

    // Connection Management
    connect: () => {
      set({ status: "connecting" });
      try {
        const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "");

        socket.onopen = () => {
          set((state) => {
            // Resubscribe to pairs
            state.subscribedPairs.forEach((pair) => {
              socket.send(JSON.stringify({ type: "subscribe", pair }));
            });

            return {
              status: "connected",
              socket,
              lastError: null,
              reconnectAttempts: 0,
            };
          });
        };

        socket.onclose = () => {
          set((state) => {
            // Attempt reconnection if not manually disconnected
            if (state.status !== "disconnected") {
              if (state.reconnectAttempts < state.maxReconnectAttempts) {
                setTimeout(() => state.connect(), state.reconnectInterval);
                return {
                  status: "connecting",
                  socket: null,
                  reconnectAttempts: state.reconnectAttempts + 1,
                };
              } else {
                return {
                  status: "error",
                  socket: null,
                  lastError: "Max reconnection attempts reached",
                };
              }
            }
            return { status: "disconnected", socket: null };
          });
        };

        socket.onerror = (error) => {
          set({
            status: "error",
            lastError: error.type,
          });
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "price") {
              set((state) => ({
                prices: {
                  ...state.prices,
                  [data.pair]: {
                    pair: data.pair,
                    bid: data.bid,
                    ask: data.ask,
                    timestamp: data.timestamp,
                  },
                },
              }));
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        set({ socket });
      } catch (error) {
        set({
          status: "error",
          lastError: error instanceof Error ? error.message : "Failed to connect",
        });
      }
    },

    disconnect: () => {
      set((state) => {
        state.socket?.close();
        return {
          status: "disconnected",
          socket: null,
          subscribedPairs: [],
        };
      });
    },

    setStatus: (status) => set({ status }),
    setError: (error) => set({ lastError: error }),
    resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

    // Subscriptions
    subscribedPairs: [],
    subscribe: (pair) =>
      set((state) => {
        if (state.subscribedPairs.includes(pair)) return state;

        state.socket?.send(JSON.stringify({ type: "subscribe", pair }));

        return {
          subscribedPairs: [...state.subscribedPairs, pair],
        };
      }),

    unsubscribe: (pair) =>
      set((state) => {
        state.socket?.send(JSON.stringify({ type: "unsubscribe", pair }));

        return {
          subscribedPairs: state.subscribedPairs.filter((p) => p !== pair),
          prices: {
            ...state.prices,
            [pair]: undefined,
          },
        };
      }),

    clearSubscriptions: () =>
      set((state) => {
        state.subscribedPairs.forEach((pair) => {
          state.socket?.send(JSON.stringify({ type: "unsubscribe", pair }));
        });

        return {
          subscribedPairs: [],
          prices: {},
        };
      }),

    // Price Data
    prices: {},
    updatePrice: (update) =>
      set((state) => ({
        prices: {
          ...state.prices,
          [update.pair]: update,
        },
      })),
    clearPrices: () => set({ prices: {} }),

    // WebSocket Instance
    socket: null,
    setSocket: (socket) => set({ socket }),
  }))
);
