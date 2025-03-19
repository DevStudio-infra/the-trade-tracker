import { Router } from "express";
import userRoutes from "./v1/user.routes";
import brokerRoutes from "./v1/broker.routes";
import pairsRoutes from "./v1/pairs.routes";
import watchlistRoutes from "./v1/watchlist.routes";
import tradingRoutes from "./v1/trading.routes";
import { chartAnalysisRoutes } from "./v1/ai/chart-analysis.routes";

const router = Router();

// API v1 routes
router.use("/user", userRoutes);
router.use("/broker", brokerRoutes);
router.use("/pairs", pairsRoutes);
router.use("/watchlist", watchlistRoutes);
router.use("/trading", tradingRoutes);

// AI routes
router.use("/ai", chartAnalysisRoutes);

export default router;
