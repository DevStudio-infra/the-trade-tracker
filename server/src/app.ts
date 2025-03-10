import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupWebSocketServer } from "./websocket/server";
import { createLogger } from "./utils/logger";
import { rateLimit } from "express-rate-limit";
import userRouter from "./routes/v1/user.routes";
import subscriptionRouter from "./routes/v1/subscription.routes";
import brokerRouter from "./routes/v1/broker.routes";
import strategyRouter from "./routes/v1/strategies.routes";
import webhookRouter from "./routes/v1/webhook.routes";

const logger = createLogger("app");

// Create Express app
const app = express();

// Trust proxy - required for Fly.io, but only trust Fly's proxy
app.set("trust proxy", "loopback, linklocal, uniquelocal");

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? [
          "https://the-trade-tracker.vercel.app", // Your frontend domain
          "https://api.clerk.com", // Clerk's domain
          "https://clerk.com", // Clerk's domain
        ]
      : ["http://localhost:3000"], // Next.js dev server
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-clerk-client-token", "svix-id", "svix-timestamp", "svix-signature"],
  credentials: true,
};

// Simplified rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  // Use a basic key generator that works with proxies
  keyGenerator: (req) => {
    return req.ip || "anonymous";
  },
  skip: (req) => {
    // Skip rate limiting for health checks and webhooks
    return req.path === "/v1/health" || req.path.startsWith("/v1/webhooks/");
  },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(limiter);

// Health check endpoint
app.get("/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/v1/user", userRouter);
app.use("/v1/subscription", subscriptionRouter);
app.use("/v1/broker", brokerRouter);
app.use("/v1/strategies", strategyRouter);
app.use("/v1/webhooks", webhookRouter);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({
    message: "Unhandled error",
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: "Internal server error",
  });
});

// Start server
const PORT = parseInt(process.env.PORT || "8080", 10);
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT}`);
});
