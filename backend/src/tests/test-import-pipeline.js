import { prisma } from "../lib/prisma.js";
import { processImportedData } from "../services/import/index.js";

async function testImport() {
  console.log("--- Starting Import Pipeline Diagnostic ---");
  const merchantId = 1;

  // Test 1: Test Customer Bulk Ingestion
  console.log("\n[Test 1] Testing Customer Ingestion...");
  const t0 = Date.now();
  const sampleCustomers = [
    { merchantId, name: "Diagnostic User 1", email: `diag1_${Date.now()}@example.com`, totalOrders: 5, totalSpend: 15000, avgOrderValue: 3000, isVip: true },
    { merchantId, name: "Diagnostic User 2", email: `diag2_${Date.now()}@example.com`, totalOrders: 1, totalSpend: 999, avgOrderValue: 999, isDormant: true },
  ];
  const custRes = await prisma.customer.createMany({ data: sampleCustomers, skipDuplicates: true });
  console.log(`✔ Customers inserted: ${custRes.count} in ${Date.now() - t0}ms`);

  // Test 2: Test Product Ingestion
  console.log("\n[Test 2] Testing Product Ingestion...");
  const t1 = Date.now();
  const sampleProducts = [
    { merchantId, name: `Diagnostic Protein ${Date.now()}`, price: 2499, category: "Supplements", isReplenishable: true, avgCycleDays: 30 },
  ];
  const prodRes = await prisma.product.createMany({ data: sampleProducts, skipDuplicates: true });
  console.log(`✔ Products inserted: ${prodRes.count} in ${Date.now() - t1}ms`);

  // Test 3: Test post-import opportunity engine
  console.log("\n[Test 3] Testing post-import processing...");
  const t2 = Date.now();
  const postResult = await processImportedData(merchantId);
  console.log(`✔ Post-import finished in ${Date.now() - t2}ms. Generated ${postResult.opportunitiesFound} opportunities.`);

  console.log("\n--- All Direct Pipeline Tests Succeeded! ---");
  process.exit(0);
}

testImport().catch((err) => {
  console.error("Diagnostic error:", err);
  process.exit(1);
});

