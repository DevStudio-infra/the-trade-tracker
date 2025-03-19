import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { validateCredits } from "../middleware/credits.middleware";
import { TradeExecutionService } from "../../services/trading/trade-execution.service";
import { createLogger } from "../../utils/logger";
import { prisma } from "../../lib/prisma";

const router = Router();
const logger = createLogger("trading-routes");
const tradeExecutionService = new TradeExecutionService();

/**
 * Execute a trade based on a signal
 */
router.post("/execute", authenticateUser, validateCredits(5), async (req, res) => {
  try {
    const { signalId, credentialId, riskPercent } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!signalId || !credentialId) {
      return res.status(400).json({ success: false, message: "signalId and credentialId are required" });
    }

    // Use a default risk of 1% if not specified
    const risk = riskPercent || 1;

    // Execute the trade
    const result = await tradeExecutionService.executeTrade({
      userId,
      signalId,
      credentialId,
      riskPercent: risk,
    });

    // After successful execution, subtract credits
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: req.creditsInfo?.required || 5,
        },
      },
    });

    // Log credit usage
    await prisma.creditTransaction.create({
      data: {
        userId,
        creditsUsed: req.creditsInfo?.required || 5,
        action: "EXECUTE_TRADE",
        balanceBefore: req.creditsInfo?.available || 0,
        balanceAfter: (req.creditsInfo?.available || 0) - (req.creditsInfo?.required || 5),
        metadata: {
          signalId,
          tradeId: result.tradeId,
          pair: result.pair,
        },
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error("Error executing trade:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to execute trade",
    });
  }
});

/**
 * Get open positions for the user
 */
router.get("/positions", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const positions = await tradeExecutionService.getOpenPositions(userId);
    return res.status(200).json(positions);
  } catch (error) {
    logger.error("Error getting positions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get positions",
    });
  }
});

/**
 * Close a position
 */
router.post("/close-position", authenticateUser, async (req, res) => {
  try {
    const { tradeId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!tradeId) {
      return res.status(400).json({ success: false, message: "tradeId is required" });
    }

    const result = await tradeExecutionService.closePosition(userId, tradeId);
    return res.status(200).json(result);
  } catch (error) {
    logger.error("Error closing position:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to close position",
    });
  }
});

/**
 * Get trade history for a user
 */
router.get("/history", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt((req.query.limit as string) || "10");
    const offset = parseInt((req.query.offset as string) || "0");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Get all trades, both open and closed
    const trades = await prisma.trade.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.trade.count({
      where: {
        userId,
      },
    });

    // Transform trades data
    const tradeHistory = trades.map((trade) => ({
      id: trade.id,
      pair: trade.pair,
      entryPrice: parseFloat(trade.entryPrice.toString()),
      exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice.toString()) : null,
      quantity: parseFloat(trade.quantity.toString()),
      profitLoss: trade.profitLoss ? parseFloat(trade.profitLoss.toString()) : null,
      riskPercent: parseFloat(trade.riskPercent.toString()),
      createdAt: trade.createdAt,
      closedAt: trade.closedAt,
      status: trade.closedAt ? "CLOSED" : "OPEN",
    }));

    return res.status(200).json({
      trades: tradeHistory,
      total: totalCount,
    });
  } catch (error) {
    logger.error("Error getting trade history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get trade history",
    });
  }
});

export default router;
