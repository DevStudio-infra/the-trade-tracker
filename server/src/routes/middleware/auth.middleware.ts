import { Request, Response, NextFunction } from "express";
import { createLogger } from "../../utils/logger";
import { prisma } from "../../lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { requireAuth } from "@clerk/express";

const logger = createLogger("auth-middleware");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Extend Express Request type to include user and auth properties
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      auth?: {
        userId: string;
        sessionClaims?: {
          email?: string;
          name?: string;
          [key: string]: any;
        };
      };
    }
  }
}

// Create a type for a request with auth
interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionClaims?: {
      email?: string;
      name?: string;
      [key: string]: any;
    };
  };
}

// Create a custom authentication middleware
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if dev-auth header is present and x-user-id is provided
    if (req.headers["dev-auth"] === "true" && req.headers["x-user-id"]) {
      const userId = req.headers["x-user-id"] as string;
      logger.info("Using user ID from header", { userId });

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
        };
        return next();
      } else {
        // Create a user if it doesn't exist
        const newUser = await prisma.user.create({
          data: {
            id: userId,
            email: `${userId}@example.com`,
            name: `User ${userId}`,
            subscription_plan: "Free",
            credits: 10,
            onboarding_step: 1,
            onboarding_completed: false,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        req.user = {
          id: newUser.id,
          email: newUser.email,
        };
        return next();
      }
    }

    // Use the requireAuth middleware for proper authentication
    const clerkAuth = requireAuth();

    // Apply the Clerk middleware
    clerkAuth(req, res, async (err?: any) => {
      if (err) {
        logger.error("Authentication error:", err);
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // After this point, req.auth should be available from Clerk
      const userId = req.auth?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "User ID not found" });
      }

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        // Auto-create user if not exists
        // Get user info from Clerk
        const clerkUser = await clerk.users.getUser(userId);
        const primaryEmail = clerkUser.emailAddresses.find((email: { id: string; emailAddress: string }) => email.id === clerkUser.primaryEmailAddressId);

        if (!primaryEmail?.emailAddress) {
          logger.error("No primary email found for user", { userId });
          return res.status(400).json({ success: false, message: "No primary email found" });
        }

        const newUser = await prisma.user.create({
          data: {
            id: userId,
            email: primaryEmail.emailAddress,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Unknown User",
            subscription_plan: "Free",
            credits: 10,
            onboarding_step: 1,
            onboarding_completed: false,
            is_active: true,
            created_at: new Date(clerkUser.createdAt),
            updated_at: new Date(),
          },
        });

        req.user = {
          id: newUser.id,
          email: newUser.email,
        };
      } else {
        req.user = {
          id: user.id,
          email: user.email,
        };
      }

      next();
    });
  } catch (error) {
    logger.error("Authentication error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Helper function to get the authenticated user ID
export const getAuthenticatedUserId = (req: Request): string => {
  if (req.user?.id) {
    return req.user.id;
  }
  if (req.auth?.userId) {
    return req.auth.userId;
  }
  throw new Error("No authenticated user ID found");
};

// Rate limiting middleware
export const rateLimit = (limit: number, windowMs: number) => {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = getAuthenticatedUserId(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get user's request timestamps
    const userRequests = requests.get(userId) || [];

    // Filter out old requests
    const recentRequests = userRequests.filter((timestamp) => timestamp > windowStart);

    // Check if user has exceeded rate limit
    if (recentRequests.length >= limit) {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded",
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000),
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
};
