import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "./auth.middleware";

export const validateCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).auth.userId;

    // Get user's current credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    // Check if user has enough credits (2 credits required for signal operations)
    if (user.credits < 2) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSUFFICIENT_CREDITS",
          message: "Not enough credits to perform this operation",
          details: {
            current_credits: user.credits,
            required_credits: 2,
          },
        },
      });
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: { credits: user.credits - 2 },
    });

    // Log credit transaction
    await prisma.creditTransaction.create({
      data: {
        userId,
        creditsUsed: 2,
        action: req.path.includes("confirm") ? "Confirmation" : "Signal_Detection",
        balanceBefore: user.credits,
        balanceAfter: user.credits - 2,
        metadata: {
          endpoint: req.path,
          method: req.method,
        },
      },
    });

    next();
  } catch (error) {
    console.error("Credits middleware error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "CREDITS_ERROR",
        message: "Failed to validate credits",
      },
    });
  }
};
