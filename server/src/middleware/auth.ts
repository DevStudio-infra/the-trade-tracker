import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";

const logger = createLogger("auth");

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Remove dev mode: always require x-user-id header
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      logger.warn("Missing x-user-id header");
      return res.status(401).json({ error: "Missing x-user-id header" });
    }
    req.user = {
      id: userId,
      email: `${userId}@example.com`, // Optionally, fetch real email if needed
    };
    return next();
  } catch (error) {
    logger.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};
