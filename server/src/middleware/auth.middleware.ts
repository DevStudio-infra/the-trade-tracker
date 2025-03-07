import { Request, Response, NextFunction } from "express";
import * as clerk from "@clerk/clerk-sdk-node";

const clerkClient = clerk.createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.headers.authorization?.split(" ")[1];

    if (!sessionToken) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    try {
      const session = await clerkClient.sessions.getSession(sessionToken);
      // @ts-ignore - Add user ID to request object
      req.userId = session.userId;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
