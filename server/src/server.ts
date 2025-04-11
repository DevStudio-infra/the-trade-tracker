import express from "express";
import cors from "cors";
import { createServer } from "http";
import { createLogger } from "./utils/logger";
import botRoutes from "./routes/trading/bot.routes";
import { startScheduledJobs } from "./services/jobs";
import { startAutomatedTradingPollingJob } from "./services/jobs/automated-trading-polling.job";

const logger = createLogger("server");
const app = express();
const server = createServer(app);

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "dev-auth"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`, {
    service: "app",
  });

  // Enhanced body logging for debugging
  if (req.method !== "GET" && req.body) {
    logger.info(`Request body:`, {
      service: "app-debug",
      body: JSON.stringify(req.body),
      contentType: req.headers["content-type"],
    });
  }

  next();
});

// Routes
logger.info("Registering bot routes at /v1/trading/bot");
app.use("/v1/trading/bot", botRoutes);

// Route not found handler
app.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("Unhandled error:", {
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 8081;

async function startServer() {
  try {
    // Start scheduled jobs
    await startScheduledJobs();

    // Explicitly initialize the automated trading polling job
    logger.info("Initializing automated trading polling jobs");
    await startAutomatedTradingPollingJob();
    logger.info("Automated trading polling initialized successfully");

    // Log registered routes
    logger.info("Registered routes:", {
      routes: app._router.stack
        .filter((r: any) => r.route)
        .map((r: any) => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods),
        })),
    });

    // Start the server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Bot API available at http://localhost:${PORT}/v1/trading/bot`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
