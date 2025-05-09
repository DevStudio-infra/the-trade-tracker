// Monthly pairs validation job
import { PrismaClient } from "@prisma/client";
import { CronJob } from "cron";
import { createLogger } from "../../utils/logger";
import { PairsCacheService } from "../cache/pairs-cache.service";
import { CapitalPairsValidationService } from "../validation/capital-pairs-validation.service";

const logger = createLogger("monthly-pairs-validation");
const prisma = new PrismaClient();
const pairsCache = new PairsCacheService(prisma);
const validationService = new CapitalPairsValidationService(prisma, pairsCache);

/**
 * Monthly job to validate trading pairs
 * Runs on the first day of each month at 2:00 AM
 */
export const monthlyPairsValidationJob = new CronJob(
  "0 2 1 * *", // At 02:00 on day-of-month 1
  async () => {
    logger.info("Starting monthly trading pairs validation job");

    try {
      await validationService.validatePairs();
      logger.info("Monthly trading pairs validation completed successfully");
    } catch (error) {
      logger.error("Error in monthly trading pairs validation:", error);
    }
  },
  null, // onComplete
  false, // start
  "UTC" // timezone
);

/**
 * Start the job
 */
export function startMonthlyPairsValidationJob() {
  try {
    monthlyPairsValidationJob.start();
    logger.info("Monthly trading pairs validation job scheduled");
  } catch (error) {
    logger.error("Error starting validation job:", error);
  }
}

/**
 * Stop the job
 */
export function stopMonthlyPairsValidationJob() {
  try {
    monthlyPairsValidationJob.stop();
    logger.info("Monthly trading pairs validation job stopped");
  } catch (error) {
    logger.error("Error stopping validation job:", error);
  }
}
