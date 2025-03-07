import { Server } from "http";
import { WebSocketServer } from "ws";
import { createLogger } from "../utils/logger";
import { wsAuthMiddleware, AuthenticatedWebSocket } from "./middleware/auth.middleware";

const logger = createLogger("websocket-server");

interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests
  server.on("upgrade", async (request, socket, head) => {
    try {
      wss.handleUpgrade(request, socket, head, async (ws) => {
        const isAuthenticated = await wsAuthMiddleware(ws, request);
        if (isAuthenticated) {
          wss.emit("connection", ws, request);
        }
      });
    } catch (error) {
      logger.error({
        message: "WebSocket upgrade error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      socket.destroy();
    }
  });

  // Handle client connections
  wss.on("connection", (ws: AuthenticatedWebSocket) => {
    logger.info({
      message: "Client connected",
      userId: ws.userId,
      sessionId: ws.sessionId,
    });

    // Handle incoming messages
    ws.on("message", async (data: string) => {
      try {
        const message = JSON.parse(data) as WebSocketMessage;

        // Handle different message types
        switch (message.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          // Add more message handlers here

          default:
            logger.warn({
              message: "Unknown message type",
              type: message.type,
              userId: ws.userId,
            });
        }
      } catch (error) {
        logger.error({
          message: "Message handling error",
          error: error instanceof Error ? error.message : "Unknown error",
          userId: ws.userId,
        });
      }
    });

    // Handle client disconnection
    ws.on("close", () => {
      logger.info({
        message: "Client disconnected",
        userId: ws.userId,
        sessionId: ws.sessionId,
      });
    });
  });

  return wss;
}
