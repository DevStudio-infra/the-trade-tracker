import { Request, Response, NextFunction } from "express";
import { createLogger } from "../../utils/logger";
import { prisma } from "../../lib/prisma";

const logger = createLogger("credits-middleware");

// Extend Express Request type to include creditsInfo property
declare global {
  namespace Express {
    interface Request {
      creditsInfo?: {
        available: number;
        required: number;
      };
    }
  }
}

/**
 * Middleware to validate if user has enough credits
 * @param requiredCredits Number of credits required for the operation
 */
export const validateCredits = (requiredCredits: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Get user's current credits
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, subscription_plan: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Free tier for AI features check
      let creditsNeeded = requiredCredits;

      // If user has premium subscription, reduce or waive credit requirement
      if (user.subscription_plan === "premium") {
        creditsNeeded = Math.max(0, requiredCredits - 1); // Premium users get 1 credit free per operation
      }

      // Check if user has enough credits
      if (user.credits < creditsNeeded) {
        return res.status(402).json({
          success: false,
          message: "Insufficient credits",
          credits: {
            available: user.credits,
            required: creditsNeeded,
            missing: creditsNeeded - user.credits,
          },
        });
      }

      // Set credits info in request for later use
      req.creditsInfo = {
        available: user.credits,
        required: creditsNeeded,
      };

      next();
    } catch (error) {
      logger.error("Error in credits middleware:", error);
      res.status(500).json({
        success: false,
        message: "Error checking credits",
      });
    }
  };
};
