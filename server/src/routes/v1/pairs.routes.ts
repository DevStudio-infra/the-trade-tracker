import express from "express";
import { getPairsByCategory, searchPairs, getCategories, validatePairs } from "../../controllers/v1/pairs.controller";
import { validateAuth } from "../../middleware/auth.middleware";

const router = express.Router();

// Get all categories
router.get("/categories", getCategories);

// Search pairs
router.get("/search", searchPairs);

// Get pairs by category
router.get("/:category", getPairsByCategory);

// Manual validation endpoint (admin only)
router.post("/validate", validateAuth, validatePairs);

export default router;
