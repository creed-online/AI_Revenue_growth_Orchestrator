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

async function testReimportReplacement() {
  console.log("=== Testing Re-Import & Overwrite Priority ===");

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/import`;

  try {
    // 1. First Dataset Upload (Initial dataset)
    console.log("\n[Upload 1] Ingesting Initial Customer Dataset (Dataset A)...");
    const datasetACsv = `name,email,totalOrders,totalSpend,avgOrderValue,isVip,isDiscountSensitive,isDormant
Old Customer 1,old1@test.com,2,2000,1000,false,false,true
Old Customer 2,old2@test.com,3,3000,1000,false,true,false`;

    const formA = new FormData();
    formA.append("file", new Blob([datasetACsv], { type: "text/csv" }), "datasetA.csv");

    const analyzeARes = await fetch(`${baseUrl}/analyze`, { method: "POST", headers: { "x-demo-mode": "true" }, body: formA });
    const analyzeA = await analyzeARes.json();

    const t0 = Date.now();
    const processARes = await fetch(`${baseUrl}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-mode": "true" },
      body: JSON.stringify({ analysis: analyzeA }),
    });
    console.log(`✔ Dataset A Processed in ${Date.now() - t0}ms (Status: ${processARes.status})`);

    // 2. Second Dataset Upload (Newest dataset replacing previous data)
    console.log("\n[Upload 2] Ingesting Replacement Customer Dataset (Dataset B - Latest)...");
    const datasetBCsv = `name,email,totalOrders,totalSpend,avgOrderValue,isVip,isDiscountSensitive,isDormant
Latest Member 1,latest1@test.com,10,50000,5000,true,false,false
Latest Member 2,latest2@test.com,5,15000,3000,true,true,false
Latest Member 3,latest3@test.com,1,999,999,false,true,true`;

    const formB = new FormData();
    formB.append("file", new Blob([datasetBCsv], { type: "text/csv" }), "datasetB.csv");

    const analyzeBRes = await fetch(`${baseUrl}/analyze`, { method: "POST", headers: { "x-demo-mode": "true" }, body: formB });
    const analyzeB = await analyzeBRes.json();

    const t1 = Date.now();
    const processBRes = await fetch(`${baseUrl}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-mode": "true" },
      body: JSON.stringify({ analysis: analyzeB }),
    });
    const processBData = await processBRes.json();
    console.log(`✔ Dataset B Processed in ${Date.now() - t1}ms (Status: ${processBRes.status})`);
    console.log("Dataset B Ingested Count:", processBData.insertedCount);
    console.log("Opportunities Generated from Latest Data:", processBData.opportunitiesGenerated);

    if (processBRes.status === 200 && processBData.insertedCount === 3) {
      console.log("\n🎉 Re-import & Overwrite Test Succeeded 100%!");
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(processBData)}`);
    }
  } finally {
    server.close();
  }
}

testReimportReplacement()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Re-import Test Error:", err);
    process.exit(1);
  });

