import { Router } from "express";
import { validateAuth, rateLimit, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { BrokerService } from "../../services/broker/broker.service";
import { authenticateUser, getAuthenticatedUserId } from "../middleware/auth.middleware";
import { z } from "zod";

const router = Router();
const logger = createLogger("user-routes");
const brokerService = new BrokerService();

// Apply rate limiting to all user routes
const userRateLimit = rateLimit(100, 15 * 60 * 1000); // 100 requests per 15 minutes

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  subscription_plan: z.enum(["Free", "Pro", "Enterprise"]).optional(),
  credits: z.number().int().min(0).optional(),
  onboarding_step: z.number().int().min(1).max(5).optional(),
  onboarding_completed: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const updateSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications_enabled: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
});

// Get user profile
router.get("/profile", authenticateUser, userRateLimit, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscription_plan: true,
        credits: true,
        onboarding_step: true,
        onboarding_completed: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      logger.error("User not found", { userId });
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Create user profile (fallback for webhook failures)
router.post("/profile", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Create user with basic info
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: "pending@email.com", // This will be updated by the webhook in production
        subscription_plan: "Free",
        credits: 10,
        onboarding_step: 1,
        onboarding_completed: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        subscription_plan: true,
        credits: true,
        onboarding_completed: true,
        onboarding_step: true,
        is_active: true,
        created_at: true,
        _count: {
          select: {
            trades: true,
            signals: true,
            broker_credentials: true,
          },
        },
      },
    });

    logger.info({
      message: "User created through fallback endpoint",
      userId,
    });

    res.json(user);
  } catch (error) {
    logger.error({
      message: "Error creating user through fallback endpoint",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
router.patch("/profile", authenticateUser, userRateLimit, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: validation.error.errors,
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: validation.data,
      select: {
        id: true,
        email: true,
        name: true,
        subscription_plan: true,
        credits: true,
        onboarding_step: true,
        onboarding_completed: true,
        is_active: true,
        updated_at: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Error updating user profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Handle onboarding step
router.post("/onboarding/:step", authenticateUser, userRateLimit, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const step = parseInt(req.params.step, 10);

    if (isNaN(step) || step < 1 || step > 5) {
      return res.status(400).json({ success: false, message: "Invalid onboarding step" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboarding_step: step,
        onboarding_completed: step === 5,
      },
      select: {
        onboarding_step: true,
        onboarding_completed: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Error updating onboarding step:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get user onboarding status
router.get("/onboarding-status", authenticateUser, userRateLimit, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboarding_step: true,
        onboarding_completed: true,
      },
    });

    if (!user) {
      logger.error("User not found", { userId });
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Error fetching onboarding status:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update user onboarding status
router.post("/onboarding", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { step, completed, data } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboarding_step: step,
        onboarding_completed: completed,
        onboarding: {
          upsert: {
            create: {
              step,
              status: completed ? "Completed" : "In_Progress",
              data,
            },
            update: {
              step,
              status: completed ? "Completed" : "In_Progress",
              data,
            },
          },
        },
      },
    });

    res.json({
      onboarding_completed: user.onboarding_completed,
      current_step: user.onboarding_step,
    });
  } catch (error) {
    logger.error({
      message: "Error updating onboarding status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user settings
router.get("/settings", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    logger.info({
      message: "Getting user settings - START",
      userId,
      headers: req.headers,
      auth: (req as AuthenticatedRequest).auth,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
        broker_credentials: true,
      },
    });

    if (!user) {
      logger.warn({
        message: "User not found when fetching settings",
        userId,
        query: "findUnique user",
      });
      return res.status(404).json({ error: "User not found" });
    }

    // Map broker credentials through the broker service to decrypt them
    const mappedBrokerCredentials = user.broker_credentials.map((cred) => brokerService["mapToBrokerConnection"](cred));

    const responseData = {
      ...user,
      broker_credentials: mappedBrokerCredentials,
    };

    logger.info({
      message: "User settings retrieved successfully",
      userId,
      userData: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        broker_credentials_count: user.broker_credentials.length,
      },
    });

    res.json(responseData);
  } catch (error) {
    logger.error({
      message: "Error retrieving user settings",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: (req as AuthenticatedRequest).auth?.userId,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user settings
router.patch("/settings", authenticateUser, userRateLimit, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const validation = updateSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: validation.error.errors,
      });
    }

    const settings = await prisma.userSettings.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        ...validation.data,
      },
      update: validation.data,
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error("Error updating user settings:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get user watchlist
router.get("/watchlist", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;

    logger.info({
      message: "Getting user watchlist",
      userId,
    });

    const watchlistItems = await prisma.watchlistItem.findMany({
      where: { user_id: userId },
      orderBy: { added_at: "desc" },
    });

    logger.info({
      message: "User watchlist retrieved successfully",
      userId,
      watchlistItemCount: watchlistItems.length,
    });

    res.json(watchlistItems);
  } catch (error) {
    logger.error({
      message: "Error retrieving user watchlist",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: (req as AuthenticatedRequest).auth?.userId,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add item to watchlist
router.post("/watchlist", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { symbol, broker_id } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    // Check subscription limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscription_plan: true },
    });

    const watchlistCount = await prisma.watchlistItem.count({
      where: { user_id: userId },
    });

    const limit = user?.subscription_plan?.toLowerCase() === "pro" ? 50 : 10;

    if (watchlistCount >= limit) {
      return res.status(403).json({
        error: "Watchlist limit reached",
        limit,
        current: watchlistCount,
      });
    }

    // Try to find existing item first
    const existingItem = await prisma.watchlistItem.findFirst({
      where: {
        user_id: userId,
        symbol: symbol,
      },
    });

    let watchlistItem;

    if (existingItem) {
      // Update existing item
      watchlistItem = await prisma.watchlistItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          broker_id,
          added_at: new Date(), // Update timestamp when re-adding
        },
      });

      logger.info({
        message: "Watchlist item updated",
        userId,
        symbol,
        broker_id,
        itemId: watchlistItem.id,
      });
    } else {
      // Create new item
      watchlistItem = await prisma.watchlistItem.create({
        data: {
          user_id: userId,
          symbol,
          broker_id,
        },
      });

      logger.info({
        message: "New watchlist item created",
        userId,
        symbol,
        broker_id,
        itemId: watchlistItem.id,
      });
    }

    res.json(watchlistItem);
  } catch (error) {
    logger.error({
      message: "Error adding item to watchlist",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: (req as AuthenticatedRequest).auth?.userId,
      requestBody: req.body,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove item from watchlist
router.delete("/watchlist/:symbol", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { symbol } = req.params;

    // Try to find the item first
    const item = await prisma.watchlistItem.findFirst({
      where: {
        user_id: userId,
        symbol: symbol,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found in watchlist" });
    }

    // Then delete it
    await prisma.watchlistItem.delete({
      where: {
        id: item.id,
      },
    });

    logger.info({
      message: "Item removed from watchlist",
      userId,
      symbol,
      itemId: item.id,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({
      message: "Error removing item from watchlist",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: (req as AuthenticatedRequest).auth?.userId,
      symbol: req.params.symbol,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
