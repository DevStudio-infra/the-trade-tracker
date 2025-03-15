import { Router } from "express";
import { validateAuth, rateLimit, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { BrokerService } from "../../services/broker/broker.service";

const router = Router();
const logger = createLogger("user-routes");
const brokerService = new BrokerService();

// Apply rate limiting to all user routes
const userRateLimit = rateLimit(100, 60 * 1000); // 100 requests per minute

// Get user profile
router.get("/profile", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      logger.warn({
        message: "User not found",
        userId,
      });
      return res.status(404).json({ error: "User not found" });
    }

    logger.info({
      message: "User profile retrieved",
      userId,
    });

    res.json(user);
  } catch (error) {
    logger.error({
      message: "Error retrieving user profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Internal server error" });
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
router.patch("/profile", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { onboarding_step, onboarding_completed } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboarding_step: onboarding_step !== undefined ? onboarding_step : undefined,
        onboarding_completed: onboarding_completed !== undefined ? onboarding_completed : undefined,
      },
      select: {
        id: true,
        onboarding_step: true,
        onboarding_completed: true,
      },
    });

    logger.info({
      message: "User profile updated",
      userId,
      updates: { onboarding_step, onboarding_completed },
    });

    res.json(user);
  } catch (error) {
    logger.error({
      message: "Error updating user profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle onboarding step
router.post("/onboarding/:step", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const step = parseInt(req.params.step, 10);
    const data = req.body;

    // Validate step (now only 4 steps)
    if (isNaN(step) || step < 1 || step > 4) {
      return res.status(400).json({ error: "Invalid onboarding step" });
    }

    // Get current user state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboarding_step: true,
        onboarding_completed: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate step sequence
    if (step !== user.onboarding_step) {
      return res.status(400).json({
        error: "Invalid step sequence",
        currentStep: user.onboarding_step,
      });
    }

    // Process step
    switch (step) {
      case 1: // Profile completion
        await prisma.user.update({
          where: { id: userId },
          data: { onboarding_step: 2 },
        });
        await prisma.userOnboarding.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            step: 2,
            status: "In_Progress",
            data: {
              name: data.name,
              trading_experience: data.trading_experience,
            },
          },
          update: {
            step: 2,
            data: {
              name: data.name,
              trading_experience: data.trading_experience,
            },
          },
        });
        break;

      case 2: // Trading preferences
        await prisma.user.update({
          where: { id: userId },
          data: { onboarding_step: 3 },
        });
        await prisma.userOnboarding.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            step: 3,
            status: "In_Progress",
            data: {
              preferred_markets: data.preferred_markets,
              risk_tolerance: data.risk_tolerance,
            },
          },
          update: {
            step: 3,
            data: {
              preferred_markets: data.preferred_markets,
              risk_tolerance: data.risk_tolerance,
            },
          },
        });
        break;

      case 3: // Optional broker connection
        if (data.skip_broker) {
          // Skip broker connection
          await prisma.user.update({
            where: { id: userId },
            data: { onboarding_step: 4 },
          });
        } else {
          // Connect broker
          await prisma.brokerCredential.create({
            data: {
              user_id: userId,
              broker_name: data.broker_name,
              credentials: data.credentials,
              is_active: true,
            },
          });
          await prisma.user.update({
            where: { id: userId },
            data: { onboarding_step: 4 },
          });
        }
        break;

      case 4: // Complete onboarding
        await prisma.user.update({
          where: { id: userId },
          data: {
            onboarding_completed: true,
            onboarding_step: 4,
          },
        });
        break;
    }

    logger.info({
      message: "Onboarding step completed",
      userId,
      step,
      data: step === 3 ? { skip_broker: data.skip_broker } : data,
    });

    res.json({
      success: true,
      step,
      is_complete: step === 4,
    });
  } catch (error) {
    logger.error({
      message: "Error processing onboarding step",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user onboarding status
router.get("/onboarding-status", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;

    logger.info({
      message: "Getting onboarding status - START",
      userId,
      headers: req.headers,
      auth: (req as AuthenticatedRequest).auth,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboarding_completed: true,
        onboarding_step: true,
      },
    });

    if (!user) {
      logger.warn({
        message: "User not found when fetching onboarding status",
        userId,
        query: "findUnique user",
        prismaSelect: {
          onboarding_completed: true,
          onboarding_step: true,
        },
      });
      return res.status(404).json({ error: "User not found" });
    }

    logger.info({
      message: "Onboarding status retrieved successfully",
      userId,
      onboardingData: {
        onboarding_completed: user.onboarding_completed,
        current_step: user.onboarding_step,
      },
    });

    res.json({
      onboarding_completed: user.onboarding_completed,
      current_step: user.onboarding_step,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching onboarding status",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: (req as AuthenticatedRequest).auth?.userId,
    });
    res.status(500).json({ error: "Internal server error" });
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
router.patch("/settings", validateAuth, userRateLimit, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { name, is_active } = req.body;

    logger.info({
      message: "Updating user settings",
      userId,
      updates: { name, is_active },
      headers: req.headers,
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
      },
    });

    logger.info({
      message: "User settings updated",
      userId,
      updates: { name, is_active },
      result: user,
    });

    res.json(user);
  } catch (error) {
    logger.error({
      message: "Error updating user settings",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
