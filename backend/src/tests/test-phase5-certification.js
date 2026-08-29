import fs from 'fs';
import { prisma } from '../lib/prisma.js';

async function runPhase5Certification() {
  console.log("================================================================================");
  console.log("🏆 PHASE 5: COMPREHENSIVE CERTIFICATION & PRODUCTION VALIDATION SUITE");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, meta = "") {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${meta ? '→ ' + meta : ''}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${meta ? '→ ' + meta : ''}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 1: System Baseline & Database Connectivity
  // ---------------------------------------------------------------------------
  console.log("👉 SECTION 1: System Baseline & Database Health");
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: 1 } });
    assert(!!merchant, "Merchant ID 1 exists in PostgreSQL", `Merchant: ${merchant?.name || merchant?.email}`);
  } catch (err) {
    assert(false, "PostgreSQL connection failed", err.message);
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: Task 5.1 — Customer Dataset Ingestion & Auto-Mapping
  // ---------------------------------------------------------------------------
  console.log("\n👉 SECTION 2: Task 5.1 — Customer Dataset Ingestion & Post-Import Trigger");
  const customerCsv = fs.readFileSync('../demo_customers_dataset.csv', 'utf8');
  const custBlob = new Blob([customerCsv], { type: 'text/csv' });
  const custFormData = new FormData();
  custFormData.append('file', custBlob, 'demo_customers_dataset.csv');

  // Step 2.1: Semantic Analyzer
  const custAnalyzeRes = await fetch('http://localhost:3000/api/import/analyze', { method: 'POST', body: custFormData });
  const custAnalyzeJson = await custAnalyzeRes.json();
  assert(custAnalyzeRes.status === 200, "Analyze Customer CSV returned HTTP 200");
  assert(custAnalyzeJson.aiAnalysis?.detectedEntity === 'Customer', "AI correctly profiled entity as 'Customer'", `Confidence: ${(custAnalyzeJson.aiAnalysis?.entityConfidence * 100).toFixed(0)}%`);
  assert(custAnalyzeJson.mappings?.length >= 5, "Generated multi-column mappings", `${custAnalyzeJson.mappings?.length} fields mapped`);

  // Step 2.2: Process & Insert
  const custProcessRes = await fetch('http://localhost:3000/api/import/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis: custAnalyzeJson })
  });
  const custProcessJson = await custProcessRes.json();
  assert(custProcessRes.status === 200, "Process Customer CSV returned HTTP 200");
  assert(custProcessJson.success === true, "Transactional customer bulk insertion succeeded");
  assert(custProcessJson.insertedCount >= 10, "10 Customer records inserted", `Count: ${custProcessJson.insertedCount}`);
  assert(custProcessJson.opportunitiesGenerated > 0, "Post-import pipeline triggered live opportunity generation", `Generated: ${custProcessJson.opportunitiesGenerated}`);

  // Step 2.3: Direct Database Validation
  const dbCustomerCount = await prisma.customer.count({ where: { merchantId: 1 } });
  assert(dbCustomerCount >= 10, "Prisma verified Customer rows in PostgreSQL database", `Total in DB: ${dbCustomerCount}`);

  // ---------------------------------------------------------------------------
  // SECTION 3: Task 5.2 — Order Dataset Ingestion & Relational Linking
  // ---------------------------------------------------------------------------
  console.log("\n👉 SECTION 3: Task 5.2 — Order Dataset Ingestion & Relational Integrity");
  const orderCsv = fs.readFileSync('../demo_orders_dataset.csv', 'utf8');
  const orderBlob = new Blob([orderCsv], { type: 'text/csv' });
  const orderFormData = new FormData();
  orderFormData.append('file', orderBlob, 'demo_orders_dataset.csv');

  // Step 3.1: Order Analyzer
  const orderAnalyzeRes = await fetch('http://localhost:3000/api/import/analyze', { method: 'POST', body: orderFormData });
  const orderAnalyzeJson = await orderAnalyzeRes.json();
  assert(orderAnalyzeRes.status === 200, "Analyze Order CSV returned HTTP 200");
  assert(orderAnalyzeJson.aiAnalysis?.detectedEntity === 'Order', "AI correctly profiled entity as 'Order'");

  // Step 3.2: Process Orders
  const orderProcessRes = await fetch('http://localhost:3000/api/import/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis: orderAnalyzeJson })
  });
  const orderProcessJson = await orderProcessRes.json();
  assert(orderProcessRes.status === 200, "Process Order CSV returned HTTP 200");
  assert(orderProcessJson.success === true, "Order ingestion succeeded", `Orders processed: ${orderProcessJson.insertedCount}`);

  // Step 3.3: Direct Relational Linkage Verification
  const dbOrderCount = await prisma.order.count();
  const dbOrderItemCount = await prisma.orderItem.count();
  assert(dbOrderCount > 0 && dbOrderItemCount > 0, "Prisma verified Order and OrderItem linkages in PostgreSQL", `Orders: ${dbOrderCount}, Items: ${dbOrderItemCount}`);

  // ---------------------------------------------------------------------------
  // SECTION 4: Multi-Strategy Opportunity Engine & API Querying
  // ---------------------------------------------------------------------------
  console.log("\n👉 SECTION 4: Multi-Strategy Opportunity Engine");
  const oppsRes = await fetch('http://localhost:3000/api/opportunities');
  const oppsJson = await oppsRes.json();

  assert(oppsRes.status === 200, "GET /api/opportunities returned HTTP 200");
  assert(oppsJson.count >= 4, "Feed contains opportunities across all growth levers", `Count: ${oppsJson.count}`);
  assert(oppsJson.summary?.totalPotentialRevenue > 0, "Summary aggregates live potential revenue", `Total: ₹${oppsJson.summary?.totalPotentialRevenue?.toLocaleString('en-IN')}`);
  assert(oppsJson.summary?.reactivationCount > 0, "Dormant Reactivation strategy verified", `${oppsJson.summary?.reactivationCount} cohort`);
  assert(oppsJson.summary?.upsellCount > 0, "VIP Upsell strategy verified", `${oppsJson.summary?.upsellCount} cohort`);
  assert(oppsJson.summary?.promoCount > 0, "Discount Sensitivity strategy verified", `${oppsJson.summary?.promoCount} cohort`);
  assert(oppsJson.summary?.replenishmentCount > 0, "Replenishment Cycle strategy verified", `${oppsJson.summary?.replenishmentCount} product cycles`);

  // Filtering checks
  const reactFilterRes = await fetch('http://localhost:3000/api/opportunities?type=reactivation');
  const reactFilterJson = await reactFilterRes.json();
  assert(reactFilterJson.opportunities?.every(o => o.opportunityType === 'reactivation'), "Filtered GET ?type=reactivation returns only reactivation campaigns");

  const highPrioRes = await fetch('http://localhost:3000/api/opportunities?priority=high');
  const highPrioJson = await highPrioRes.json();
  assert(highPrioJson.opportunities?.every(o => o.priority === 'high'), "Filtered GET ?priority=high returns only high priority campaigns");

  // ---------------------------------------------------------------------------
  // SECTION 5: Single Opportunity Lookups & Simulation Modeling
  // ---------------------------------------------------------------------------
  console.log("\n👉 SECTION 5: Single Opportunity Lookups & Discount Simulator");
  const upsellLookupRes = await fetch('http://localhost:3000/api/opportunities/upsell');
  const upsellLookupJson = await upsellLookupRes.json();
  assert(upsellLookupRes.status === 200, "Single lookup for 'upsell' returns HTTP 200", upsellLookupJson.opportunity?.productName);

  const simRes = await fetch('http://localhost:3000/api/opportunities/upsell/simulate', { method: 'POST' });
  const simJson = await simRes.json();
  assert(simRes.status === 200, "POST /api/opportunities/upsell/simulate returned HTTP 200");
  assert(simJson.simulation?.scenarios?.length === 3, "Simulation contains 0%, 5%, 10% discount tiers", `Recommended Tier: ${simJson.simulation?.recommendedTier}%`);
  assert(simJson.simulation?.recommendedScenario?.netRevenue > 0, "Simulated positive net revenue projection", `Net Rev: ₹${simJson.simulation?.recommendedScenario?.netRevenue}`);

  // ---------------------------------------------------------------------------
  // SECTION 6: Custom Schema Extensions & Target Schema Introspection
  // ---------------------------------------------------------------------------
  console.log("\n👉 SECTION 6: Schema Extension & Drift Handling");
  const extendRes = await fetch('http://localhost:3000/api/schema/extend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entityName: 'Customer',
      fields: [
        { name: 'loyalty_tier_level', type: 'String', description: 'Gold/Silver/Platinum status' },
        { name: 'referral_code', type: 'String', description: 'Customer referral identifier' }
      ]
    })
  });
  const extendJson = await extendRes.json();
  assert(extendRes.status === 200, "POST /api/schema/extend returned HTTP 200", `Extended: ${Object.keys(extendJson.extension?.customFields || {}).join(', ')}`);

  const targetSchemaRes = await fetch('http://localhost:3000/api/schema/target');
  const targetSchemaJson = await targetSchemaRes.json();
  const customerDef = targetSchemaJson.entities?.find(e => e.name === 'Customer');
  const hasCustomField = customerDef?.fields?.some(f => f.name === 'loyalty_tier_level' && f.isCustom);
  assert(hasCustomField, "Target schema introspects registered custom extensions dynamically");

  // ---------------------------------------------------------------------------
  // FINAL SCORECARD
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`🏁 CERTIFICATION RESULT: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(0)}%)`);
  console.log("================================================================================\n");

  if (passedTests === totalTests) {
    console.log("🌟 ALL CERTIFICATION CRITERIA MET WITH 100% PASS RATE! 🚀\n");
  } else {
    console.error("⚠️ SOME TESTS FAILED. REVIEW LOGS ABOVE.\n");
  }
}

runPhase5Certification().catch(console.error);

