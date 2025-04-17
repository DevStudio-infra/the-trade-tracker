import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";
import { validateAuth } from "./auth.middleware";

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

export const authenticateUser = validateAuth;
