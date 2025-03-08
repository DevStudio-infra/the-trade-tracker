import dotenv from "dotenv";
// Load environment variables first, before any other imports
dotenv.config();

import express from "express";
import { authMiddleware } from "./middleware/auth.middleware";

// Validate required environment variables
const requiredEnvVars = ["CLERK_SECRET_KEY", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Apply middleware
app.use(express.json());

// Public routes go here (before auth middleware)
app.get("/health", (req, res) => res.send("OK"));

// Protected routes
app.use("/api", authMiddleware); // All routes under /api will require authentication

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
