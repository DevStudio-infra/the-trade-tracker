import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { createClerkClient } from "@clerk/backend";
import { createLogger } from "../../utils/logger";
import { parse } from "url";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const logger = createLogger("websocket-auth");

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  sessionId: string;
}

export async function wsAuthMiddleware(ws: WebSocket, req: IncomingMessage) {
  try {
    const { query } = parse(req.url || "", true);
    const sessionToken = query.token as string;
    const clientToken = query.clientToken as string;

    if (!sessionToken || !clientToken) {
      logger.warn("Missing authentication tokens");
      ws.close(1008, "Unauthorized");
      return false;
    }

    const session = await clerk.sessions.verifySession(sessionToken, clientToken);

    if (!session) {
      logger.warn("Invalid session");
      ws.close(1008, "Unauthorized");
      return false;
    }

    // Add auth data to WebSocket instance
    (ws as AuthenticatedWebSocket).userId = session.userId;
    (ws as AuthenticatedWebSocket).sessionId = session.id;

    logger.info({
      message: "WebSocket authenticated",
      userId: session.userId,
      sessionId: session.id,
    });

    return true;
  } catch (error) {
    logger.error({
      message: "WebSocket authentication error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    ws.close(1011, "Internal Server Error");
    return false;
  }
}
