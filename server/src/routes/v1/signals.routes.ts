import { Router } from "express";
import { SignalDetectionService } from "../../services/ai/signal-detection/signal-detection.service";
import { ConfirmationService } from "../../services/ai/confirmation/confirmation.service";
import { validateCredits } from "../../middleware/credits.middleware";
import { validateAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { prisma } from "../../lib/prisma";

const router = Router();
const signalDetection = new SignalDetectionService();
const confirmation = new ConfirmationService();

// Signal Detection Endpoint
router.post("/analyze", validateAuth, validateCredits, (req, res) => {
  const { pair, timeframe, strategies } = req.body;
  const userId = (req as AuthenticatedRequest).auth.userId;

  signalDetection
    .detectSignal({
      pair,
      timeframe,
      strategies,
      chartImage: Buffer.from([]),
      candles: [],
    })
    .then((signal) => {
      res.json({
        success: true,
        data: signal,
      });
    })
    .catch((error) => {
      console.error("Signal detection error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SIGNAL_DETECTION_ERROR",
          message: "Failed to generate trading signal",
        },
      });
    });
});

// Signal Confirmation Endpoint
router.post("/confirm/:signalId", validateAuth, validateCredits, (req, res) => {
  const { signalId } = req.params;
  const userId = (req as AuthenticatedRequest).auth.userId;

  // 1. Fetch the original signal from database
  prisma.signal
    .findFirst({
      where: {
        id: signalId,
        userId,
        status: "PENDING_CONFIRMATION",
      },
      include: {
        botInstance: {
          select: {
            strategyId: true,
          },
        },
      },
    })
    .then((signal) => {
      if (!signal) {
        throw new Error("Signal not found or not pending confirmation");
      }

      // 2. Get higher timeframe and proceed with confirmation
      const higherTimeframe = confirmation.getHigherTimeframe(signal.timeframe);
      return confirmation.confirmSignal({
        signalId,
        pair: signal.pair,
        userTimeframe: signal.timeframe,
        higherTimeframe,
        originalSignal: {
          type: signal.signalType as "BUY" | "SELL",
          confidence: signal.confidence,
          strategy: signal.botInstance.strategyId,
          stopLoss: signal.stopLoss.toNumber(),
          takeProfit: signal.takeProfit.toNumber(),
        },
        timestamp: Date.now(),
      });
    })
    .then((result) => {
      res.json({
        success: true,
        data: result,
      });
    })
    .catch((error) => {
      console.error("Signal confirmation error:", error);
      res.status(error.message === "Signal not found or not pending confirmation" ? 404 : 500).json({
        success: false,
        error: {
          code: error.message === "Signal not found or not pending confirmation" ? "SIGNAL_NOT_FOUND" : "SIGNAL_CONFIRMATION_ERROR",
          message: error.message,
        },
      });
    });
});

// Signal History Endpoint
router.get("/history", validateAuth, (req, res) => {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const { page = 1, limit = 20, status } = req.query;

  const where = {
    userId,
    ...(status ? { status: String(status) } : {}),
  };

  Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      include: {
        evaluations: {
          select: {
            evalType: true,
            chartImageUrl: true,
            llmResponse: true,
          },
        },
        botInstance: {
          select: {
            strategyId: true,
          },
        },
      },
    }),
    prisma.signal.count({ where }),
  ])
    .then(([signals, total]) => {
      res.json({
        success: true,
        data: {
          signals,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            total_pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    })
    .catch((error) => {
      console.error("Signal history error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SIGNAL_HISTORY_ERROR",
          message: "Failed to fetch signal history",
        },
      });
    });
});

export const signalsRoutes = router;
