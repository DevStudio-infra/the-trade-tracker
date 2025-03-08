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
        subscriptionPlan: true,
        credits: true,
        onboardingCompleted: true,
        onboardingStep: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            trades: true,
            signals: true,
            brokerCredentials: true,
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
    const { onboardingStep, onboardingCompleted } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStep: onboardingStep !== undefined ? onboardingStep : undefined,
        onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : undefined,
      },
      select: {
        id: true,
        onboardingStep: true,
        onboardingCompleted: true,
      },
    });

    logger.info({
      message: "User profile updated",
      userId,
      updates: { onboardingStep, onboardingCompleted },
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
        onboardingStep: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate step sequence
    if (step !== user.onboardingStep) {
      return res.status(400).json({
        error: "Invalid step sequence",
        currentStep: user.onboardingStep,
      });
    }

    // Process step
    switch (step) {
      case 1: // Profile completion
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: data.name,
            tradingExperience: data.tradingExperience,
            onboardingStep: 2,
          },
        });
        break;

      case 2: // Trading preferences
        await prisma.user.update({
          where: { id: userId },
          data: {
            preferredMarkets: data.preferredMarkets,
            riskTolerance: data.riskTolerance,
            onboardingStep: 3,
          },
        });
        break;

      case 3: // Optional broker connection
        if (data.skipBroker) {
          // Skip broker connection
          await prisma.user.update({
            where: { id: userId },
            data: { onboardingStep: 4 },
          });
        } else {
          // Connect broker
          await prisma.brokerCredential.create({
            data: {
              userId,
              brokerName: data.brokerName,
              credentials: data.credentials,
              isDemo: data.isDemo || false,
              metadata: {
                createdAt: new Date(),
                settings: {
                  leverage: "1:30",
                  defaultLotSize: "0.01",
                },
              },
            },
          });
          await prisma.user.update({
            where: { id: userId },
            data: { onboardingStep: 4 },
          });
        }
        break;

      case 4: // Complete onboarding
        await prisma.user.update({
          where: { id: userId },
          data: {
            onboardingCompleted: true,
            onboardingStep: 4,
          },
        });
        break;
    }

    logger.info({
      message: "Onboarding step completed",
      userId,
      step,
      data: step === 3 ? { skipBroker: data.skipBroker } : data,
    });

    res.json({
      success: true,
      step,
      isComplete: step === 4,
    });
  } catch (error) {
    logger.error({
      message: "Error processing onboarding step",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
