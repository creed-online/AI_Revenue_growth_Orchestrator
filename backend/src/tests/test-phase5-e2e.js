import fs from 'fs';

async function runEndToEndVerification() {
  console.log("=================================================================");
  console.log("🏁 PHASE 5: COMPLETE END-TO-END DATA PIPELINE VALIDATION SUITE");
  console.log("=================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = "") {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // TEST 1: Ingest demo_customers_dataset.csv
  console.log("👉 Test Suite 1: Customer Ingestion & Behavioral Classification");
  const customerCsv = fs.readFileSync('../demo_customers_dataset.csv', 'utf8');
  const custBlob = new Blob([customerCsv], { type: 'text/csv' });
  const custFormData = new FormData();
  custFormData.append('file', custBlob, 'demo_customers_dataset.csv');

  const custAnalyzeRes = await fetch('http://localhost:3000/api/import/analyze', { method: 'POST', body: custFormData });
  const custAnalyze = await custAnalyzeRes.json();
  assert(custAnalyze.aiAnalysis?.detectedEntity === 'Customer', "AI correctly profiles Customer CSV", `Detected: ${custAnalyze.aiAnalysis?.detectedEntity}`);
  assert(custAnalyze.totalRows > 0, "Analyzed rows present", `${custAnalyze.totalRows} rows`);

  const custProcessRes = await fetch('http://localhost:3000/api/import/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis: custAnalyze })
  });
  const custProcess = await custProcessRes.json();
  assert(custProcess.success === true, "Transactional customer bulk insertion succeeds", `Inserted: ${custProcess.insertedCount}`);
  assert(custProcess.opportunitiesGenerated > 0, "Post-import pipeline immediately generates opportunities", `Total: ${custProcess.opportunitiesGenerated}`);

  // TEST 2: Ingest demo_orders_dataset.csv
  console.log("\n👉 Test Suite 2: Order & Transactional Ingestion");
  const orderCsv = fs.readFileSync('../demo_orders_dataset.csv', 'utf8');
  const orderBlob = new Blob([orderCsv], { type: 'text/csv' });
  const orderFormData = new FormData();
  orderFormData.append('file', orderBlob, 'demo_orders_dataset.csv');

  const orderAnalyzeRes = await fetch('http://localhost:3000/api/import/analyze', { method: 'POST', body: orderFormData });
  const orderAnalyze = await orderAnalyzeRes.json();
  assert(orderAnalyze.aiAnalysis?.detectedEntity === 'Order', "AI correctly profiles Order CSV", `Detected: ${orderAnalyze.aiAnalysis?.detectedEntity}`);

  const orderProcessRes = await fetch('http://localhost:3000/api/import/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis: orderAnalyze })
  });
  const orderProcess = await orderProcessRes.json();
  assert(orderProcess.success === true, "Order transactional ingestion links customer, order & items", `Processed: ${orderProcess.insertedCount} orders`);

  // TEST 3: Multi-Strategy Opportunity Engine Verification
  console.log("\n👉 Test Suite 3: Unified Multi-Strategy Opportunity Feed");
  const oppsRes = await fetch('http://localhost:3000/api/opportunities');
  const opps = await oppsRes.json();
  assert(opps.count > 0, "Opportunities feed returns live opportunities", `Count: ${opps.count}`);
  assert(opps.summary?.totalPotentialRevenue > 0, "Summary aggregates live potential revenue", `₹${opps.summary?.totalPotentialRevenue?.toLocaleString('en-IN')}`);
  assert(opps.summary?.reactivationCount > 0, "Reactivation strategy active", `${opps.summary?.reactivationCount} dormant cohort`);
  assert(opps.summary?.upsellCount > 0, "VIP Upsell strategy active", `${opps.summary?.upsellCount} VIP cohort`);
  assert(opps.summary?.promoCount > 0, "Discount sensitivity strategy active", `${opps.summary?.promoCount} promo cohort`);
  assert(opps.summary?.replenishmentCount > 0, "Replenishment cycle strategy active", `${opps.summary?.replenishmentCount} product cycles`);

  // TEST 4: Single Opportunity Detail & Discount Simulator
  console.log("\n👉 Test Suite 4: Single Opportunity Lookup & Simulation Engine");
  const upsellRes = await fetch('http://localhost:3000/api/opportunities/upsell');
  const upsellJson = await upsellRes.json();
  assert(upsellRes.status === 200, "Lookup by opportunity type 'upsell' succeeds", upsellJson.opportunity?.productName);

  const simRes = await fetch('http://localhost:3000/api/opportunities/upsell/simulate', { method: 'POST' });
  const simJson = await simRes.json();
  assert(simRes.status === 200, "Campaign discount simulator models 0%, 5%, 10% tiers", `Recommended Tier: ${simJson.simulation?.recommendedTier}%`);
  assert(simJson.simulation?.scenarios?.length === 3, "Simulation includes all 3 margin-safe scenarios", `Projected Net: ₹${simJson.simulation?.recommendedScenario?.netRevenue}`);

  console.log("\n=================================================================");
  console.log(`📊 FINAL SCORE: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log("=================================================================");
}

runEndToEndVerification().catch(console.error);

