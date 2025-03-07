import { Request, Response, NextFunction } from "express";
import { Clerk } from "@clerk/backend";
import { createLogger } from "../utils/logger";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY environment variable");
}

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });
const logger = createLogger("auth-middleware");

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionId: string;
    session: any; // Clerk Session type
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.headers.authorization?.split(" ")[1];
    const clientToken = req.headers["x-clerk-client-token"] as string;

    if (!sessionToken) {
      logger.warn("No session token provided");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await clerk.sessions.verifySession(sessionToken, clientToken);

    if (!session) {
      logger.warn("Invalid session token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Add auth data to request
    (req as AuthenticatedRequest).auth = {
      userId: session.userId,
      sessionId: session.id,
      session,
    };

    logger.info({
      message: "User authenticated",
      userId: session.userId,
      sessionId: session.id,
    });

    next();
  } catch (error) {
    logger.error({
      message: "Authentication error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Rate limiting middleware based on user ID
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return function (req: Request, res: Response, next: NextFunction) {
    const userId = (req as AuthenticatedRequest).auth?.userId;

    if (!userId) {
      return next();
    }

    const now = Date.now();
    const userRequests = requests.get(userId) || { count: 0, resetTime: now + windowMs };

    // Reset count if window has passed
    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + windowMs;
    }

    if (userRequests.count >= maxRequests) {
      logger.warn({
        message: "Rate limit exceeded",
        userId,
        maxRequests,
        windowMs,
      });
      return res.status(429).json({ error: "Too many requests" });
    }

    userRequests.count++;
    requests.set(userId, userRequests);

    next();
  };
}
