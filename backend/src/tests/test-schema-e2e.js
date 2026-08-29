import { schemaRegistry } from "../services/import/schemaRegistry.js";
import { embeddingService } from "../services/import/embeddingService.js";
import { semanticMatcher } from "../services/import/semanticMatcher.js";
import { schemaDiffer } from "../services/import/schemaDiffer.js";
import { feedbackLoop } from "../services/import/feedbackLoop.js";
import { driftDetector } from "../services/import/driftDetector.js";
import { calibrator } from "../services/import/calibrator.js";
import { profileSheet, detectEntitiesWithAI, generateMappingsWithAI } from "../services/import/dataProfiler.js";

async function runE2ETestSuite() {
  console.log("================================================================");
  console.log("🚀 STARTING AI AUTO-SCHEMA MATCHING END-TO-END INTEGRATION TEST");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Exact Column Name Matching (100% confidence)
  // -------------------------------------------------------------
  console.log("--- Scenario 1: Exact Column Name Matching ---");
  const exactColumns = ["name", "email", "totalSpend", "isVip"];
  const exactMatchRes = await semanticMatcher.matchColumns(exactColumns, [], 1);
  const emailMatch = exactMatchRes.mappings.find(m => m.sourceColumn === "email");
  const nameMatch = exactMatchRes.mappings.find(m => m.sourceColumn === "name");

  assert(
    emailMatch && emailMatch.targetField === "email" && emailMatch.confidence === 1.0,
    "Exact column 'email' maps with 1.0 confidence",
    JSON.stringify(emailMatch)
  );
  assert(
    nameMatch && nameMatch.targetField === "name" && nameMatch.confidence === 1.0,
    "Exact column 'name' maps with 1.0 confidence",
    JSON.stringify(nameMatch)
  );

  // -------------------------------------------------------------
  // TEST 2: Fuzzy Renamed Columns Matching (>= 0.85 confidence)
  // -------------------------------------------------------------
  console.log("\n--- Scenario 2: Fuzzy Renamed Columns Matching ---");
  const fuzzyColumns = ["cust_email", "cust_name"];
  const fuzzyMatchRes = await semanticMatcher.matchColumns(fuzzyColumns, [], 1);
  const custEmailMatch = fuzzyMatchRes.mappings.find(m => m.sourceColumn === "cust_email");
  const custNameMatch = fuzzyMatchRes.mappings.find(m => m.sourceColumn === "cust_name");

  assert(
    custEmailMatch && custEmailMatch.targetField === "email" && custEmailMatch.confidence >= 0.85,
    "Fuzzy column 'cust_email' maps to Customer.email (>= 0.85)",
    `Got confidence: ${custEmailMatch?.confidence}`
  );
  assert(
    custNameMatch && custNameMatch.targetField === "name" && custNameMatch.confidence >= 0.85,
    "Fuzzy column 'cust_name' maps to Customer.name (>= 0.85)",
    `Got confidence: ${custNameMatch?.confidence}`
  );

  // -------------------------------------------------------------
  // TEST 3: Semantic Synonym Matching via 128-dim Vector Embeddings
  // -------------------------------------------------------------
  console.log("\n--- Scenario 3: Semantic Synonym Vector Matching ---");
  const synonymColumns = ["client_email", "unit_cost", "order_qty"];
  const sampleRows = [
    { client_email: "rohan@enterprise.in", unit_cost: "2499.00", order_qty: "3" },
    { client_email: "priya@shop.com", unit_cost: "1499.50", order_qty: "1" }
  ];
  const synonymMatchRes = await semanticMatcher.matchColumns(synonymColumns, sampleRows, 1);
  const clientEmail = synonymMatchRes.mappings.find(m => m.sourceColumn === "client_email");
  const unitCost = synonymMatchRes.mappings.find(m => m.sourceColumn === "unit_cost");
  const orderQty = synonymMatchRes.mappings.find(m => m.sourceColumn === "order_qty");

  assert(
    clientEmail && clientEmail.targetField === "email" && clientEmail.confidence >= 0.75,
    "Semantic synonym 'client_email' -> 'Customer.email' (>= 0.75)",
    `Got: ${clientEmail?.targetField} with ${clientEmail?.confidence}`
  );
  assert(
    unitCost && unitCost.targetField === "price" && unitCost.confidence >= 0.75,
    "Semantic synonym 'unit_cost' -> 'Product/Order.price' (>= 0.75)",
    `Got: ${unitCost?.targetField} with ${unitCost?.confidence}`
  );
  assert(
    orderQty && orderQty.targetField === "quantity" && orderQty.confidence >= 0.75,
    "Semantic synonym 'order_qty' -> 'Order.quantity' (>= 0.75)",
    `Got: ${orderQty?.targetField} with ${orderQty?.confidence}`
  );

  // -------------------------------------------------------------
  // TEST 4: Schema Drift Detection (Added Columns)
  // -------------------------------------------------------------
  console.log("\n--- Scenario 4: Schema Drift Detection & Diffing ---");
  const srcSchema = {
    fields: [
      { name: "client_email", type: "string" },
      { name: "loyalty_points_balance", type: "float" },
      { name: "membership_tier", type: "string" }
    ]
  };
  const fullTargetSchema = await schemaRegistry.getTargetSchema(1);
  const targetCustomerDef = fullTargetSchema.entities.find(e => e.name === "Customer");
  const mockMappings = [
    { sourceColumn: "client_email", targetField: "email" }
  ];

  const diffResult = schemaDiffer.diff(srcSchema, targetCustomerDef, mockMappings);

  assert(
    diffResult.added.some(f => f.name === "loyalty_points_balance") &&
    diffResult.added.some(f => f.name === "membership_tier"),
    "SchemaDiffer correctly identifies drifted custom columns",
    JSON.stringify(diffResult.added)
  );

  // -------------------------------------------------------------
  // TEST 5: Missing Required Fields Detection
  // -------------------------------------------------------------
  console.log("\n--- Scenario 5: Missing Required Fields Flagging ---");
  assert(
    diffResult.removed.some(f => f.name === "name") && diffResult.compatible === false,
    "SchemaDiffer flags missing required field 'name' and marks compatible: false",
    JSON.stringify(diffResult.removed)
  );

  // -------------------------------------------------------------
  // TEST 6: Auto-Migration SQL Script Generation
  // -------------------------------------------------------------
  console.log("\n--- Scenario 6: Auto-Migration SQL Generation ---");
  const migration = schemaDiffer.generateMigration(diffResult, "Customer", 1);
  assert(
    migration.sql.includes("merchant_schema_extensions") &&
    migration.sql.includes("loyalty_points_balance"),
    "Migration generator produces valid SQL snippet for schema extensions",
    migration.sql
  );

  // -------------------------------------------------------------
  // TEST 7: Confidence Calibration Engine
  // -------------------------------------------------------------
  console.log("\n--- Scenario 7: Confidence Calibration ---");
  const testMappings = [
    { sourceColumn: "client_email", targetField: "email", confidence: 0.88 },
    { sourceColumn: "unknown_col", targetField: "name", confidence: 0.65 }
  ];
  const calibrated = await calibrator.applyCalibration(1, "Customer", testMappings);
  const lowConfItem = calibrated.find(m => m.sourceColumn === "unknown_col");

  assert(
    lowConfItem && lowConfItem.needsReview === true,
    "Calibrator marks low confidence mappings (< threshold) as needsReview: true",
    JSON.stringify(lowConfItem)
  );

  // -------------------------------------------------------------
  // TEST 8: Full AI Profiler + Vector Synthesis Pipeline
  // -------------------------------------------------------------
  console.log("\n--- Scenario 8: LLM AI Profiler with Vector Hints ---");
  const testRows = [
    { client_email: "aditi@enterprise.in", cust_name: "Aditi Rao", total_spent: "45000" },
    { client_email: "karan@retail.com", cust_name: "Karan Mehta", total_spent: "32000" }
  ];
  const profile = profileSheet(testRows, "CustomerImport");
  const entityDetectResult = await detectEntitiesWithAI([profile]);
  
  assert(
    entityDetectResult.entities?.[0]?.targetEntity === "Customer",
    "AI Entity Detection correctly identifies Customer dataset",
    JSON.stringify(entityDetectResult)
  );

  const fullAiMappings = await generateMappingsWithAI([profile], entityDetectResult, 1);
  assert(
    fullAiMappings.mappings?.length >= 2,
    "Enhanced AI Mapper synthesizes vector hints into final mappings",
    JSON.stringify(fullAiMappings.mappings)
  );

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`🎯 INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETestSuite().catch((err) => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});

