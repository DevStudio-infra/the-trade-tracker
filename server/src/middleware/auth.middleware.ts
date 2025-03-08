import { Request, Response, NextFunction } from "express";
import { createClerkClient } from "@clerk/backend";
import { createLogger } from "../utils/logger";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
const logger = createLogger("auth-middleware");

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionId: string;
  };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.headers.authorization?.split(" ")[1];
    const clientToken = req.headers["x-clerk-client-token"] as string;

    if (!sessionToken || !clientToken) {
      return res.status(401).json({ error: "Unauthorized - Missing tokens" });
    }

    const session = await clerk.sessions.verifySession(sessionToken, clientToken);

    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    (req as AuthenticatedRequest).auth = {
      userId: session.userId,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

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
