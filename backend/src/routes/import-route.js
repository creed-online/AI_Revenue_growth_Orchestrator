import express from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { resolveMerchantId } from "../middleware/auth.js";
import { profileSheet, detectEntitiesWithAI, generateMappingsWithAI } from "../services/import/dataProfiler.js";
import { calibrator } from "../services/import/calibrator.js";
import { schemaDiffer } from "../services/import/schemaDiffer.js";
import { schemaRegistry } from "../services/import/schemaRegistry.js";
import { processImportedData } from "../services/import/index.js";
import { scanReplenishmentOpportunities } from "../services/opportunityEngine.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/import/template/:entityType
 */
router.get("/template/:entityType", (req, res) => {
  const { entityType } = req.params;
  let csv = "";
  if (entityType === "customers") csv = "name,email,totalOrders,totalSpend,avgOrderValue,lastPurchaseDate,firstPurchaseDate,isVip,isDiscountSensitive,isDormant\n";
  else if (entityType === "products") csv = "name,price,category,isReplenishable,avgCycleDays\n";
  else if (entityType === "orders") csv = "customerEmail,productName,quantity,price,createdAt\n";
  else return res.status(400).json({ error: "invalid_entity_type" });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${entityType}-template.csv"`);
  res.send(csv);
});

/**
 * POST /api/import/analyze
 * Step 1: Upload CSV -> Parse -> AI Profiling -> AI Mapping -> Calibration -> Drift Detection
 */
router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const file = req.file;
    if (!file) return res.status(400).json({ error: "no_file" });

    // 1. Parse CSV
    const content = file.buffer.toString("utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    
    if (records.length === 0) {
      return res.status(400).json({ error: "empty_file" });
    }

    // 2. Profile Sheet
    const sheetName = file.originalname || "Upload";
    const profile = profileSheet(records, sheetName);

    // 3. AI Entity Detection (Customer vs Product vs Order)
    const entityDetections = await detectEntitiesWithAI([profile]);
    const detectedEntity = entityDetections.entities?.[0];
    
    if (!detectedEntity || detectedEntity.targetEntity === "Unknown") {
      return res.status(400).json({ error: "unknown_entity", message: "AI could not determine if this is Customers, Products, or Orders." });
    }

    const targetEntityName = detectedEntity.targetEntity;

    // 4. Enhanced AI Mapping (Vector + LLM + Few-Shot)
    const aiMappingResult = await generateMappingsWithAI([profile], entityDetections, merchantId);

    // 5. Apply Confidence Calibration (Task 2.4)
    const calibratedMappings = await calibrator.applyCalibration(merchantId, targetEntityName, aiMappingResult.mappings);

    // 6. Drift Detection (Task 1.6 / 2.2)
    const fullSchema = await schemaRegistry.getTargetSchema(merchantId);
    const targetEntityDef = fullSchema.entities.find(e => e.name === targetEntityName);
    const diff = schemaDiffer.diff({ fields: profile.columns }, targetEntityDef, calibratedMappings);
    const suggestedMigration = schemaDiffer.generateMigration(diff, targetEntityName, merchantId);

    // Send everything back to the UI (including full records array for transactional processing)
    res.json({
      merchantId,
      fileName: sheetName,
      totalRows: records.length,
      sampleData: records.slice(0, 5),
      records,
      aiAnalysis: {
        detectedEntity: targetEntityName,
        entityConfidence: detectedEntity.confidence,
        entityReasoning: detectedEntity.reasoning
      },
      schema: {
        sourceColumns: profile.columns,
        targetFields: targetEntityDef.fields,
      },
      mappings: calibratedMappings,
      drift: {
        diff,
        suggestedMigration
      }
    });

  } catch (error) {
    console.error("Analysis failed:", error);
    res.status(500).json({ error: "analysis_failed", message: error.message });
  }
});

/**
 * POST /api/import/process
 * Step 2: Dynamically transform rows, bulk insert into Postgres, save custom fields in metadata,
 * and run the post-import opportunity engine trigger.
 */
router.post("/process", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const payload = req.body.analysis || req.body;
    const { aiAnalysis, mappings = [], records = [], drift } = payload;
    const entityType = aiAnalysis?.detectedEntity || payload.entityType || "Customer";

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "no_records_to_process", message: "No records found in payload." });
    }

    // Mapping lookup: { sourceCol: targetField }
    const mappingMap = {};
    mappings.forEach((m) => {
      if (m.sourceColumn && m.targetField) {
        mappingMap[m.sourceColumn] = m.targetField;
      }
    });

    let insertedCount = 0;

    if (entityType === "Customer") {
      const customersToInsert = records.map((row) => {
        const item = { merchantId };

        // Process mapped fields
        Object.entries(row).forEach(([col, val]) => {
          const targetField = mappingMap[col];
          const rawStr = String(val ?? "").trim();

          if (targetField) {
            switch (targetField) {
              case "name":
                item.name = rawStr || "Unnamed Customer";
                break;
              case "email":
                item.email = rawStr.toLowerCase() || null;
                break;
              case "totalOrders":
                item.totalOrders = parseInt(rawStr) || 0;
                break;
              case "totalSpend":
                item.totalSpend = parseFloat(rawStr.replace(/[$,₹]/g, "")) || 0;
                break;
              case "avgOrderValue":
                item.avgOrderValue = parseFloat(rawStr.replace(/[$,₹]/g, "")) || 0;
                break;
              case "lastPurchaseDate":
                item.lastPurchaseDate = rawStr ? new Date(rawStr) : null;
                break;
              case "firstPurchaseDate":
                item.firstPurchaseDate = rawStr ? new Date(rawStr) : null;
                break;
              case "isVip":
                item.isVip = rawStr === "true" || rawStr === "1" || /^yes$/i.test(rawStr);
                break;
              case "isDiscountSensitive":
                item.isDiscountSensitive = rawStr === "true" || rawStr === "1" || /^yes$/i.test(rawStr);
                break;
              case "isDormant":
                item.isDormant = rawStr === "true" || rawStr === "1" || /^yes$/i.test(rawStr);
                break;
            }
          }
        });

        // Compute default average order value if missing
        if (!item.avgOrderValue && item.totalSpend > 0 && item.totalOrders > 0) {
          item.avgOrderValue = Math.round((item.totalSpend / item.totalOrders) * 100) / 100;
        }

        // Initialize behavioral algorithmic scores
        if (item.isDormant) item.reactivationScore = 0.85;
        if (item.isVip) item.upsellScore = 0.90;
        if (item.isDiscountSensitive) item.crossSellScore = 0.80;

        if (!item.name) item.name = "Customer " + (item.email ? item.email.split("@")[0] : "Account");

        return item;
      });

      const result = await prisma.customer.createMany({
        data: customersToInsert,
        skipDuplicates: true,
      });
      insertedCount = result.count;
    } else if (entityType === "Product") {
      const productsToInsert = records.map((row) => {
        const item = { merchantId };
        Object.entries(row).forEach(([col, val]) => {
          const targetField = mappingMap[col];
          const rawStr = String(val ?? "").trim();

          if (targetField) {
            switch (targetField) {
              case "name":
                item.name = rawStr || "Product Item";
                break;
              case "price":
                item.price = parseFloat(rawStr.replace(/[$,₹]/g, "")) || 0;
                break;
              case "category":
                item.category = rawStr || "General";
                break;
              case "isReplenishable":
                item.isReplenishable = rawStr === "true" || rawStr === "1" || /^yes$/i.test(rawStr);
                break;
              case "avgCycleDays":
                item.avgCycleDays = parseInt(rawStr) || 30;
                break;
            }
          }
        });
        if (!item.name) item.name = "General Product";
        if (item.price === undefined) item.price = 999;
        return item;
      });

      const result = await prisma.product.createMany({
        data: productsToInsert,
        skipDuplicates: true,
      });
      insertedCount = result.count;
    } else if (entityType === "Order") {
      for (const row of records) {
        const emailCol = Object.keys(row).find(k => mappingMap[k] === "customerEmail" || mappingMap[k] === "email" || /email|shopper|customer/i.test(k));
        const email = emailCol ? row[emailCol] : (row.customerEmail || row.email || row.shopper_email);

        const productCol = Object.keys(row).find(k => mappingMap[k] === "productName" || mappingMap[k] === "name" || /product|item|title/i.test(k));
        const productName = productCol ? row[productCol] : (row.productName || row.product || row.item_title);

        const qtyCol = Object.keys(row).find(k => mappingMap[k] === "quantity" || /qty|quantity|count/i.test(k));
        const quantity = parseInt(qtyCol ? row[qtyCol] : (row.quantity || 1)) || 1;

        const priceCol = Object.keys(row).find(k => mappingMap[k] === "price" || /price|amount|cost/i.test(k));
        const price = parseFloat(String(priceCol ? row[priceCol] : (row.price || row.unit_price || 999)).replace(/[$,₹]/g, "")) || 999;

        const dateCol = Object.keys(row).find(k => mappingMap[k] === "createdAt" || /timestamp|date|time|created/i.test(k));
        const rawDate = dateCol ? row[dateCol] : (row.createdAt || row.order_timestamp);
        const createdAt = rawDate ? new Date(rawDate) : new Date();

        if (email && productName) {
          let customer = await prisma.customer.findFirst({ where: { merchantId, email: String(email).trim().toLowerCase() } });
          if (!customer) {
            customer = await prisma.customer.create({
              data: { merchantId, name: String(email).split("@")[0], email: String(email).trim().toLowerCase(), totalOrders: 1, totalSpend: price * quantity, avgOrderValue: price * quantity }
            });
          } else {
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                totalOrders: { increment: 1 },
                totalSpend: { increment: price * quantity },
                lastPurchaseDate: createdAt
              }
            });
          }

          let product = await prisma.product.findFirst({ where: { merchantId, name: String(productName).trim() } });
          if (!product) {
            product = await prisma.product.create({
              data: { merchantId, name: String(productName).trim(), price, isReplenishable: true, avgCycleDays: 30 }
            });
          }

          const order = await prisma.order.create({
            data: { customerId: customer.id, totalAmount: price * quantity, status: "completed", createdAt }
          });

          await prisma.orderItem.create({
            data: { orderId: order.id, productId: product.id, quantity, price }
          });

          insertedCount++;
        }
      }
    }

    // Trigger Opportunity Engine & Post-Import Processing
    const postProcessResult = await processImportedData(merchantId);

    res.json({
      success: true,
      merchantId,
      entityType,
      insertedCount,
      totalRows: records.length,
      opportunitiesGenerated: postProcessResult.opportunitiesFound,
      opportunities: (postProcessResult.opportunities || []).slice(0, 5),
    });
  } catch (error) {
    console.error("Import processing error:", error);
    res.status(500).json({ error: "process_failed", message: error.message });
  }
});

export default router;