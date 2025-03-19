import { Request, Response, NextFunction } from "express";
import { createLogger } from "../../utils/logger";
import { prisma } from "../../lib/prisma";
import { clerkClient, ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

const logger = createLogger("auth-middleware");

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
    // Use the ClerkExpressRequireAuth middleware first
    const clerkAuth = ClerkExpressRequireAuth();

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
        const clerkUser = await clerkClient.users.getUser(userId);

        const newUser = await prisma.user.create({
          data: {
            id: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress || "unknown@example.com",
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Unknown User",
            onboarding_step: 1,
            onboarding_completed: false,
            is_active: true,
            credits: 10, // Give new users 10 free credits
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
    logger.error("Error in authentication middleware:", error);
    res.status(500).json({ success: false, message: "Authentication error" });
  }
};
