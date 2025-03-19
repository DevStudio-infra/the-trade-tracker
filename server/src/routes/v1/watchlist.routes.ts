import { Router } from "express";
import { authenticateUser } from "../../routes/middleware/auth.middleware";
import { createLogger } from "../../utils/logger";
import { prisma } from "../../lib/prisma";

const router = Router();
const logger = createLogger("watchlist-routes");

// Get user's watchlist items
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const watchlistItems = await prisma.watchlistItem.findMany({
      where: { user_id: userId },
      orderBy: { added_at: "desc" },
    });

    return res.json(watchlistItems);
  } catch (error) {
    logger.error("Error fetching watchlist:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Add item to watchlist
router.post("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { symbol, notes } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    // Check if already in watchlist
    const existingItem = await prisma.watchlistItem.findFirst({
      where: {
        user_id: userId,
        symbol,
      },
    });

    if (existingItem) {
      return res.status(409).json({ error: "Symbol already in watchlist" });
    }

    // Add to watchlist
    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        user_id: userId,
        symbol,
        notes: notes || null,
        added_at: new Date(),
      },
    });

    return res.status(201).json(watchlistItem);
  } catch (error) {
    logger.error("Error adding to watchlist:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Remove from watchlist
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if item exists and belongs to user
    const watchlistItem = await prisma.watchlistItem.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!watchlistItem) {
      return res.status(404).json({ error: "Watchlist item not found" });
    }

    // Delete the item
    await prisma.watchlistItem.delete({
      where: {
        id,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error("Error removing from watchlist:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
