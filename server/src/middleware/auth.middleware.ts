import { Request, Response, NextFunction } from "express";
import { clerkClient, clerkMiddleware, requireAuth as clerkRequireAuth } from "@clerk/express";
import { createLogger } from "../utils/logger";

const logger = createLogger("auth-middleware");

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

// Enhanced authentication middleware with logging
export const validateAuth = (req: Request, res: Response, next: NextFunction) => {
  logger.info({
    message: "Authentication attempt",
    path: req.path,
    headers: {
      authorization: req.headers.authorization ? "Present" : "Missing",
      "clerk-client-token": req.headers["x-clerk-client-token"] ? "Present" : "Missing",
    },
  });

  const authMiddleware = clerkRequireAuth();

  authMiddleware(req, res, (err) => {
    if (err) {
      logger.error({
        message: "Authentication failed",
        path: req.path,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    logger.info({
      message: "Authentication successful",
      path: req.path,
      userId: (req as AuthenticatedRequest).auth?.userId,
    });

    next();
  });
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
