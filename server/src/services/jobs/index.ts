import { createLogger } from "../../utils/logger";
import { startMonthlyPairsValidationJob } from "./monthly-pairs-validation.job";
import { startAutomatedTradingPollingJob } from "./automated-trading-polling.job";

const logger = createLogger("jobs");

/**
 * Initialize all scheduled jobs
 */
export async function initializeJobs(): Promise<void> {
  try {
    logger.info("Initializing scheduled jobs...");

    // Start monthly pairs validation job
    startMonthlyPairsValidationJob();

    // Start automated trading polling
    await startAutomatedTradingPollingJob();

    logger.info("All scheduled jobs initialized successfully");
  } catch (error) {
    logger.error("Error initializing scheduled jobs:", error);
    throw error;
  }
}

/**
 * Start all scheduled jobs
 */
export async function startScheduledJobs(): Promise<void> {
  try {
    await initializeJobs();
  } catch (error) {
    logger.error("Failed to start scheduled jobs:", error);
    throw error;
  }
}
