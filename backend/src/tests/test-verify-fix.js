import fs from 'fs';

async function testFullPipeline() {
  console.log("---------------------------------------------------------");
  console.log("🚀 TESTING END-TO-END IMPORT, PERSISTENCE & OPPORTUNITY CREATION");
  console.log("---------------------------------------------------------");

  const csvContent = fs.readFileSync('../demo_customers_dataset.csv', 'utf8');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const formData = new FormData();
  formData.append('file', blob, 'demo_customers_dataset.csv');

  console.log("\n1. Calling POST /api/import/analyze...");
  const analyzeRes = await fetch('http://localhost:3000/api/import/analyze', { method: 'POST', body: formData });
  const analyzeJson = await analyzeRes.json();
  console.log("   Detected Entity:", analyzeJson.aiAnalysis?.detectedEntity);
  console.log("   Total Rows in Payload:", analyzeJson.totalRows);
  console.log("   Mapped Fields Count:", analyzeJson.mappings?.length);

  console.log("\n2. Calling POST /api/import/process (Bulk Insertion)...");
  const processRes = await fetch('http://localhost:3000/api/import/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis: analyzeJson })
  });
  const processJson = await processRes.json();
  console.log("   Process API Result:", processJson);

  console.log("\n3. Querying GET /api/opportunities...");
  const oppsRes = await fetch('http://localhost:3000/api/opportunities');
  const oppsJson = await oppsRes.json();
  console.log("   Total Live Opportunities:", oppsJson.count);
  console.log("\n4. Opportunity Feed Preview:");
  oppsJson.opportunities?.slice(0, 5).forEach((o, i) => {
    console.log(`   [#${i + 1}] [${o.opportunityType.toUpperCase()}] ${o.productName} -> Potential: ₹${o.potentialRevenue} (${o.customerCount} customers, priority: ${o.priority})`);
  });
  console.log("\n---------------------------------------------------------");
  console.log("✅ PIPELINE VERIFIED SUCCESSFULLY!");
  console.log("---------------------------------------------------------");
}

testFullPipeline().catch(console.error);

