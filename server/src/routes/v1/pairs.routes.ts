import express from "express";
import { getPairsByCategory, searchPairs, getCategories } from "../../controllers/v1/pairs.controller";

const router = express.Router();

// Get all categories
router.get("/categories", getCategories);

// Search pairs
router.get("/search", searchPairs);

// Get pairs by category
router.get("/:category", getPairsByCategory);

export default router;
