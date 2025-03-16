import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define popular pairs by category
const popularPairs = {
  FOREX: [
    "EURUSD", // Euro/US Dollar
    "GBPUSD", // British Pound/US Dollar
    "USDJPY", // US Dollar/Japanese Yen
    "AUDUSD", // Australian Dollar/US Dollar
    "USDCHF", // US Dollar/Swiss Franc
    "USDCAD", // US Dollar/Canadian Dollar
    "NZDUSD", // New Zealand Dollar/US Dollar
    "EURGBP", // Euro/British Pound
    "EURJPY", // Euro/Japanese Yen
  ],
  CRYPTOCURRENCIES: [
    "BTCUSD", // Bitcoin/US Dollar
    "ETHUSD", // Ethereum/US Dollar
    "XRPUSD", // Ripple/US Dollar
    "LTCUSD", // Litecoin/US Dollar
    "ADAUSD", // Cardano/US Dollar
    "DOGEUSD", // Dogecoin/US Dollar
    "SOLUSD", // Solana/US Dollar
  ],
  INDICES: [
    "US30", // Dow Jones Industrial Average
    "SPX500", // S&P 500
    "US100", // Nasdaq 100
    "UK100", // FTSE 100
    "DE40", // DAX 40
    "JP225", // Nikkei 225
  ],
  COMMODITIES: [
    "XAUUSD", // Gold
    "XAGUSD", // Silver
    "OILUSD", // Crude Oil
    "NATGAS", // Natural Gas
  ],
  SHARES: [
    "AAPL", // Apple
    "MSFT", // Microsoft
    "AMZN", // Amazon
    "GOOGL", // Google
    "META", // Meta (Facebook)
    "TSLA", // Tesla
    "NVDA", // NVIDIA
  ],
  ETF: [
    "SPY", // SPDR S&P 500 ETF
    "QQQ", // Invesco QQQ Trust
    "VTI", // Vanguard Total Stock Market ETF
    "GLD", // SPDR Gold Shares
  ],
};

async function checkPopularPairs() {
  console.log("Checking for popular trading pairs in the database...\n");

  const results: Record<string, { found: string[]; missing: string[] }> = {};

  for (const [category, pairs] of Object.entries(popularPairs)) {
    const found: string[] = [];
    const missing: string[] = [];

    console.log(`Checking ${pairs.length} popular ${category} pairs...`);

    for (const symbol of pairs) {
      const pair = await prisma.capitalComPair.findFirst({
        where: {
          symbol: {
            equals: symbol,
            mode: "insensitive",
          },
          category: category,
        },
      });

      if (pair) {
        found.push(symbol);
      } else {
        missing.push(symbol);
      }
    }

    results[category] = { found, missing };

    console.log(`✅ Found: ${found.length}/${pairs.length} (${Math.round((found.length / pairs.length) * 100)}%)`);
    if (found.length > 0) {
      console.log(`   ${found.join(", ")}`);
    }

    console.log(`❌ Missing: ${missing.length}/${pairs.length} (${Math.round((missing.length / pairs.length) * 100)}%)`);
    if (missing.length > 0) {
      console.log(`   ${missing.join(", ")}`);
    }

    console.log();
  }

  // Calculate overall percentage
  let totalFound = 0;
  let totalPairs = 0;

  Object.values(results).forEach((result) => {
    totalFound += result.found.length;
    totalPairs += result.found.length + result.missing.length;
  });

  const overallPercentage = Math.round((totalFound / totalPairs) * 100);

  console.log(`Overall coverage: ${totalFound}/${totalPairs} popular pairs found (${overallPercentage}%)`);
}

checkPopularPairs()
  .then(() => console.log("Done checking popular pairs"))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
