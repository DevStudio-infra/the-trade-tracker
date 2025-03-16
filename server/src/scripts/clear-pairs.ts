import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearPairs() {
  try {
    console.log("Clearing all pairs from the database...");
    const deleteCount = await prisma.capitalComPair.deleteMany({});
    console.log(`Deleted ${deleteCount.count} pairs from the database`);
  } catch (error) {
    console.error("Error clearing pairs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearPairs()
  .then(() => console.log("Database cleared successfully"))
  .catch(console.error);
