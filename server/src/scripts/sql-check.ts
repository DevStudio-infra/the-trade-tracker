import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log("Checking if the capital_com_pairs table exists...");
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'capital_com_pairs'
      );
    `;
    console.log("Table exists:", tableExists);

    console.log("\nGetting table structure...");
    const tableStructure = await prisma.$queryRaw`
      SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'capital_com_pairs';
    `;
    console.log(tableStructure);

    console.log("\nCounting rows in the table...");
    const rowCount = await prisma.$queryRaw`
      SELECT COUNT(*) FROM "capital_com_pairs";
    `;
    console.log("Row count:", rowCount);

    console.log("\nGetting sample data...");
    const sampleData = await prisma.$queryRaw`
      SELECT * FROM "capital_com_pairs" LIMIT 10;
    `;
    console.log(sampleData);
  } catch (error) {
    console.error("Error executing SQL queries:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase()
  .then(() => console.log("\nDone checking database"))
  .catch(console.error);
