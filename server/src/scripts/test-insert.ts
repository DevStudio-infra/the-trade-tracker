import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // Enable full logging
});

async function testInsert() {
  try {
    console.log("Clearing any existing data...");
    await prisma.capitalComPair.deleteMany({});

    console.log("Inserting a test record...");
    const testRecord = await prisma.capitalComPair.create({
      data: {
        symbol: "EURUSD",
        displayName: "EUR/USD",
        type: "CURRENCIES",
        category: "FOREX",
        minQuantity: 0.01,
        maxQuantity: 999.99,
        precision: 5,
      },
    });
    console.log("Inserted test record:", testRecord);

    console.log("\nTesting batch insert with createMany...");
    const batchResult = await prisma.capitalComPair.createMany({
      data: [
        {
          symbol: "GBPUSD",
          displayName: "GBP/USD",
          type: "CURRENCIES",
          category: "FOREX",
          minQuantity: 0.01,
          maxQuantity: 999.99,
          precision: 5,
        },
        {
          symbol: "USDJPY",
          displayName: "USD/JPY",
          type: "CURRENCIES",
          category: "FOREX",
          minQuantity: 0.01,
          maxQuantity: 999.99,
          precision: 5,
        },
      ],
      skipDuplicates: true,
    });
    console.log("Batch insert result:", batchResult);

    console.log("\nVerifying data in database...");
    const count = await prisma.capitalComPair.count();
    console.log("Total records:", count);

    const allRecords = await prisma.capitalComPair.findMany();
    console.log("All records:", allRecords);
  } catch (error) {
    console.error("Error in test insert:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testInsert()
  .then(() => console.log("Test completed"))
  .catch(console.error);
