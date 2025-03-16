import { createLogger } from "../../utils/logger";
import { startMonthlyPairsValidationJob } from "./monthly-pairs-validation.job";

const logger = createLogger("jobs");

/**
 * Initialize and start all scheduled jobs
 */
export function initializeJobs() {
  logger.info("Initializing scheduled jobs");

  try {
    // Start monthly pairs validation job
    startMonthlyPairsValidationJob();

    logger.info("All scheduled jobs initialized successfully");
  } catch (error) {
    logger.error("Error initializing scheduled jobs:", error);
  }
}

/**
 * Call this function when the application starts
 */
export function startScheduledJobs() {
  logger.info("Starting scheduled jobs");
  initializeJobs();
}
