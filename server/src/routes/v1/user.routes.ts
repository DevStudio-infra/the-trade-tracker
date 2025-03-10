import { Router } from "express";
import { validateAuth, rateLimit, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";

const router = Router();
const logger = createLogger("user-routes");

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
              is_demo: data.is_demo || false,
              metadata: {
                created_at: new Date(),
                settings: {
                  leverage: "1:30",
                  default_lot_size: "0.01",
                },
              },
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboarding_completed: true,
        onboarding_step: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      onboarding_completed: user.onboarding_completed,
      current_step: user.onboarding_step,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching onboarding status",
      error: error instanceof Error ? error.message : "Unknown error",
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

export default router;
