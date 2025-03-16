import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPairs() {
  try {
    console.log("Checking for pairs in the database...");

    // Get distinct categories
    const categories = await prisma.capitalComPair.findMany({
      select: { category: true },
      distinct: ["category"],
    });

    console.log(`Found ${categories.length} categories:`);
    console.log(categories.map((c) => c.category));

    // Count total pairs
    const totalCount = await prisma.capitalComPair.count();
    console.log(`Total pairs in database: ${totalCount}`);

    // Count pairs by category
    for (const { category } of categories) {
      const count = await prisma.capitalComPair.count({
        where: { category },
      });
      console.log(`${category}: ${count} pairs`);
    }

    // Get a sample of pairs from each category
    for (const { category } of categories) {
      const pairs = await prisma.capitalComPair.findMany({
        where: { category },
        take: 3,
      });
      console.log(`\nSample pairs from ${category}:`);
      console.log(pairs);
    }
  } catch (error) {
    console.error("Error checking pairs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPairs()
  .then(() => console.log("Done checking pairs"))
  .catch(console.error);
