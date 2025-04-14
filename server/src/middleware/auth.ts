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
    // For development, accept any request without authentication
    // In a production environment, you would use proper authentication
    if (process.env.NODE_ENV === "development") {
      // Check if user ID is provided in headers
      const userId = req.headers["x-user-id"] as string;

      // Set user from headers or use default for development
      req.user = {
        id: userId || "dev-user-id",
        email: userId ? `${userId}@example.com` : "dev@example.com",
      };

      return next();
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn("No authorization header");
      return res.status(401).json({ error: "No authorization header" });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];
    if (!token) {
      logger.warn("No token provided");
      return res.status(401).json({ error: "No token provided" });
    }

    // TODO: Implement proper JWT validation
    if (token === "development-token") {
      req.user = {
        id: "dev-user-id",
        email: "dev@example.com",
      };
      next();
    } else {
      logger.warn("Invalid token");
      res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    logger.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};
