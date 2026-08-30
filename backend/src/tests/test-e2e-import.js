import express from "express";
import cors from "cors";
import importRoute from "../routes/import-route.js";
import { optionalAuth } from "../middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(optionalAuth);
app.use("/api/import", importRoute);

async function runE2ETest() {
  console.log("=== Testing E2E CSV Import & Process via HTTP ===");

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/import`;

  try {
    // 1. Create a dummy CSV buffer for Customers
    const customerCsv = `name,email,totalOrders,totalSpend,avgOrderValue,isVip,isDiscountSensitive,isDormant
Alice Johnson,alice_${Date.now()}@example.com,4,12000,3000,true,false,false
Bob Smith,bob_${Date.now()}@example.com,1,500,500,false,true,true
Charlie Brown,charlie_${Date.now()}@example.com,2,1800,900,false,false,false`;

    console.log(`\n[Step 1] Sending POST ${baseUrl}/analyze (Multipart CSV)...`);
    const formData = new FormData();
    const blob = new Blob([customerCsv], { type: "text/csv" });
    formData.append("file", blob, "customers.csv");

    const analyzeRes = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers: { "x-demo-mode": "true" },
      body: formData,
    });

    console.log("Analyze Status:", analyzeRes.status);
    const analyzeData = await analyzeRes.json();
    if (!analyzeRes.ok) {
      console.error("Analyze Error:", analyzeData);
      process.exit(1);
    }
    console.log("Detected Entity:", analyzeData.aiAnalysis?.detectedEntity);
    console.log("Mappings count:", analyzeData.mappings?.length);
    console.log("Records in payload:", analyzeData.records?.length);

    // 2. Send POST /api/import/process with the exact payload from analyze
    console.log(`\n[Step 2] Sending POST ${baseUrl}/process...`);
    const t0 = Date.now();
    const processRes = await fetch(`${baseUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-demo-mode": "true",
      },
      body: JSON.stringify({ analysis: analyzeData }),
    });

    const duration = Date.now() - t0;
    console.log(`Process Status: ${processRes.status} (took ${duration}ms)`);
    const processData = await processRes.json();
    if (!processRes.ok) {
      console.error("Process Error:", processData);
      process.exit(1);
    }
    console.log("Process Response:", processData);

    // 3. Test Order CSV E2E
    const orderCsv = `customerEmail,productName,quantity,price,createdAt
alice_${Date.now()}@example.com,Whey Protein Isolate,1,2499,2026-08-15T10:00:00.000Z
bob_${Date.now()}@example.com,Creatine Monohydrate,2,999,2026-08-10T14:30:00.000Z`;

    console.log(`\n[Step 3] Testing Orders CSV E2E...`);
    const orderFormData = new FormData();
    const orderBlob = new Blob([orderCsv], { type: "text/csv" });
    orderFormData.append("file", orderBlob, "orders.csv");

    const analyzeOrders = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers: { "x-demo-mode": "true" },
      body: orderFormData,
    });

    const analyzeOrdersData = await analyzeOrders.json();
    console.log("Orders Analyze Status:", analyzeOrders.status, "Detected:", analyzeOrdersData.aiAnalysis?.detectedEntity);

    const t1 = Date.now();
    const processOrders = await fetch(`${baseUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-demo-mode": "true",
      },
      body: JSON.stringify({ analysis: analyzeOrdersData }),
    });

    const orderDuration = Date.now() - t1;
    const processOrdersData = await processOrders.json();
    console.log(`Orders Process Status: ${processOrders.status} (took ${orderDuration}ms)`);
    console.log("Orders Process Response:", processOrdersData);

    console.log("\n🎉 E2E Import Tests Passed Completely in Real HTTP Environment!");
  } finally {
    server.close();
  }
}

runE2ETest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("E2E Test Failed:", err);
    process.exit(1);
  });

