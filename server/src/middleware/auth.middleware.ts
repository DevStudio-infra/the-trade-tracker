import { Request, Response, NextFunction } from "express";
import { clerkClient, clerkMiddleware, requireAuth as clerkRequireAuth } from "@clerk/express";
import { createLogger } from "../utils/logger";

const logger = createLogger("auth-middleware");

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

// Export Clerk's requireAuth middleware
export const validateAuth = clerkRequireAuth();

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
