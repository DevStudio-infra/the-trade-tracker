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

const logger = createLogger("app");

// Create Express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://your-production-domain.com"] // Replace with your production domain
      : ["http://localhost:3000"], // Next.js dev server
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-clerk-client-token"],
  credentials: true,
};

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(limiter);

// Routes
app.use("/v1/user", userRouter);
app.use("/v1/subscription", subscriptionRouter);
app.use("/v1/broker", brokerRouter);
app.use("/v1/strategies", strategyRouter);

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
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
