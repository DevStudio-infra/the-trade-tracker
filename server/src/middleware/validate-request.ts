import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { createLogger } from "../utils/logger";

const logger = createLogger("validate-request");

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Log the incoming data before validation
      logger.info("Validating request:", {
        path: req.path,
        method: req.method,
        contentType: req.headers["content-type"],
        bodyKeys: req.body ? Object.keys(req.body) : [],
        bodyContent: req.body ? JSON.stringify(req.body) : "undefined",
      });

      // Validate just the body instead of the entire request structure
      await schema.parseAsync(req.body);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request validation failed:", { service: "validate-request", errors: error.errors });
        res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      } else {
        logger.error("Unexpected validation error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
};
