import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage<unknown>) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onConnected, onDisconnected, autoReconnect = true, reconnectInterval = 5000 } = options;

  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(async () => {
    try {
      const token = await getToken();
      const clientToken = await getToken({ template: "client_token" });
      if (!token || !clientToken) return;

      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8081"}/ws?token=${token}&clientToken=${clientToken}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        onConnected?.();
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnected?.();
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage<unknown>;
          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("WebSocket connection error:", error);
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      }
    }
  }, [getToken, onConnected, onDisconnected, onMessage, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: WebSocketMessage<unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    disconnect,
    reconnect: connect,
  };
}
