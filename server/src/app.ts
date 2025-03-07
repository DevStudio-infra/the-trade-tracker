import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupWebSocketServer } from "./websocket/server";
import { createLogger } from "./utils/logger";
import { rateLimit } from "express-rate-limit";
import userRouter from "./routes/v1/user.routes";

const logger = createLogger("app");

// Create Express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Routes
app.use("/v1/user", userRouter);

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
