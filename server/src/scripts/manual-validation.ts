/**
 * Manual Validation Script
 *
 * This script allows manual triggering of the Capital.com pairs validation
 * and cache refresh process. This is useful for:
 *
 * 1. Initial setup
 * 2. Testing validation
 * 3. Forcing a refresh after issues
 * 4. Administrative tasks
 *
 * Usage: npx ts-node src/scripts/manual-validation.ts
 */

import { PrismaClient } from "@prisma/client";
import { PairsCacheService } from "../services/cache/pairs-cache.service";
import { CapitalPairsValidationService } from "../services/validation/capital-pairs-validation.service";

const prisma = new PrismaClient();
const pairsCache = new PairsCacheService(prisma);
const validationService = new CapitalPairsValidationService(prisma, pairsCache);

async function runManualValidation() {
  console.log("Starting manual validation of Capital.com trading pairs...");
  console.log("This process fetches the latest data from Capital.com API and updates the database");
  const startTime = Date.now();

  try {
    // First validate all pairs
    console.log("\n1. Validating trading pairs from Capital.com API...");
    await validationService.validatePairs();
    console.log("✅ Validation completed successfully");

    // Then refresh all cache categories
    console.log("\n2. Refreshing Redis cache for all categories...");
    await pairsCache.refreshAllCategories();
    console.log("✅ Cache refresh completed");

    // Calculate and display metrics
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nTotal process completed in ${durationSeconds} seconds`);

    // Get pair counts by category
    console.log("\nCurrent pair counts by category:");
    const categories = await prisma.capitalComPair.findMany({
      select: { category: true },
      distinct: ["category"],
    });

    for (const { category } of categories) {
      const count = await prisma.capitalComPair.count({
        where: { category },
      });
      console.log(`- ${category}: ${count} pairs`);
    }

    const totalCount = await prisma.capitalComPair.count();
    console.log(`\nTotal pairs in database: ${totalCount}`);
  } catch (error) {
    console.error("❌ Error during manual validation:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\nProcess complete. Database connection closed.");
  }
}

// Run the script
runManualValidation().catch(console.error);
