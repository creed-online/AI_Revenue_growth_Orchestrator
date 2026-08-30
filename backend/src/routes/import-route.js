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

      // Overwrite previous customer records with the latest uploaded dataset
      try {
        const existingCusts = await prisma.customer.findMany({ where: { merchantId }, select: { id: true } });
        const custIds = existingCusts.map((c) => c.id);
        if (custIds.length > 0) {
          const existingOrders = await prisma.order.findMany({ where: { customerId: { in: custIds } }, select: { id: true } });
          const ordIds = existingOrders.map((o) => o.id);
          if (ordIds.length > 0) {
            await prisma.orderItem.deleteMany({ where: { orderId: { in: ordIds } } });
            await prisma.order.deleteMany({ where: { id: { in: ordIds } } });
          }
          await prisma.notificationSend.deleteMany({ where: { customerId: { in: custIds } } });
          await prisma.customer.deleteMany({ where: { id: { in: custIds } } });
        }
      } catch (delErr) {
        console.warn("[Import] Clean customer replace warning:", delErr.message);
      }

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

      // Overwrite previous products with the latest uploaded catalog
      try {
        const existingProds = await prisma.product.findMany({ where: { merchantId }, select: { id: true } });
        const prodIds = existingProds.map((p) => p.id);
        if (prodIds.length > 0) {
          await prisma.orderItem.deleteMany({ where: { productId: { in: prodIds } } });
          await prisma.product.deleteMany({ where: { id: { in: prodIds } } });
        }
      } catch (delErr) {
        console.warn("[Import] Clean product replace warning:", delErr.message);
      }

      const result = await prisma.product.createMany({
        data: productsToInsert,
        skipDuplicates: true,
      });
      insertedCount = result.count;
    } else if (entityType === "Order") {
      // Overwrite previous orders with the latest uploaded order dataset
      try {
        const existingCusts = await prisma.customer.findMany({ where: { merchantId }, select: { id: true } });
        const custIds = existingCusts.map((c) => c.id);
        if (custIds.length > 0) {
          const existingOrders = await prisma.order.findMany({ where: { customerId: { in: custIds } }, select: { id: true } });
          const ordIds = existingOrders.map((o) => o.id);
          if (ordIds.length > 0) {
            await prisma.orderItem.deleteMany({ where: { orderId: { in: ordIds } } });
            await prisma.order.deleteMany({ where: { id: { in: ordIds } } });
          }
        }
      } catch (delErr) {
        console.warn("[Import] Clean order replace warning:", delErr.message);
      }

      // 1. Fetch all existing customers and products for this merchant in 2 fast queries
      const [existingCustomers, existingProducts] = await Promise.all([
        prisma.customer.findMany({ where: { merchantId } }),
        prisma.product.findMany({ where: { merchantId } }),
      ]);

      const customerMap = new Map(existingCustomers.map((c) => [c.email?.toLowerCase(), c]));
      const productMap = new Map(existingProducts.map((p) => [p.name?.trim().toLowerCase(), p]));

      // 2. Identify missing customers and products to create in bulk
      const missingCustomers = [];
      const missingCustomerEmails = new Set();
      const missingProducts = [];
      const missingProductNames = new Set();

      for (const row of records) {
        const emailCol = Object.keys(row).find((k) => mappingMap[k] === "customerEmail" || mappingMap[k] === "email" || /email|shopper|customer/i.test(k));
        const email = String(emailCol ? row[emailCol] : (row.customerEmail || row.email || row.shopper_email) || "").trim().toLowerCase();

        const productCol = Object.keys(row).find((k) => mappingMap[k] === "productName" || mappingMap[k] === "name" || /product|item|title/i.test(k));
        const productName = String(productCol ? row[productCol] : (row.productName || row.product || row.item_title) || "").trim();

        if (email && !customerMap.has(email) && !missingCustomerEmails.has(email)) {
          missingCustomerEmails.add(email);
          missingCustomers.push({
            merchantId,
            name: email.split("@")[0],
            email,
            totalOrders: 0,
            totalSpend: 0,
            avgOrderValue: 0,
          });
        }

        if (productName && !productMap.has(productName.toLowerCase()) && !missingProductNames.has(productName.toLowerCase())) {
          missingProductNames.add(productName.toLowerCase());
          missingProducts.push({
            merchantId,
            name: productName,
            price: 999,
            isReplenishable: true,
            avgCycleDays: 30,
          });
        }
      }

      if (missingCustomers.length > 0) {
        await prisma.customer.createMany({ data: missingCustomers, skipDuplicates: true });
        const refreshedCustomers = await prisma.customer.findMany({ where: { merchantId } });
        refreshedCustomers.forEach((c) => customerMap.set(c.email?.toLowerCase(), c));
      }

      if (missingProducts.length > 0) {
        await prisma.product.createMany({ data: missingProducts, skipDuplicates: true });
        const refreshedProducts = await prisma.product.findMany({ where: { merchantId } });
        refreshedProducts.forEach((p) => productMap.set(p.name?.trim().toLowerCase(), p));
      }

      // 3. Prepare bulk orders and order items in memory
      const ordersToInsert = [];
      const itemMeta = [];
      const customerStatsMap = new Map();

      for (const row of records) {
        const emailCol = Object.keys(row).find((k) => mappingMap[k] === "customerEmail" || mappingMap[k] === "email" || /email|shopper|customer/i.test(k));
        const email = String(emailCol ? row[emailCol] : (row.customerEmail || row.email || row.shopper_email) || "").trim().toLowerCase();

        const productCol = Object.keys(row).find((k) => mappingMap[k] === "productName" || mappingMap[k] === "name" || /product|item|title/i.test(k));
        const productName = String(productCol ? row[productCol] : (row.productName || row.product || row.item_title) || "").trim();

        const qtyCol = Object.keys(row).find((k) => mappingMap[k] === "quantity" || /qty|quantity|count/i.test(k));
        const quantity = parseInt(qtyCol ? row[qtyCol] : (row.quantity || 1)) || 1;

        const priceCol = Object.keys(row).find((k) => mappingMap[k] === "price" || /price|amount|cost/i.test(k));
        const price = parseFloat(String(priceCol ? row[priceCol] : (row.price || row.unit_price || 999)).replace(/[$,₹]/g, "")) || 999;

        const dateCol = Object.keys(row).find((k) => mappingMap[k] === "createdAt" || /timestamp|date|time|created/i.test(k));
        const rawDate = dateCol ? row[dateCol] : (row.createdAt || row.order_timestamp);
        const createdAt = rawDate ? new Date(rawDate) : new Date();

        const customer = customerMap.get(email);
        const product = productMap.get(productName.toLowerCase());

        if (customer && product) {
          const totalAmount = price * quantity;
          ordersToInsert.push({
            customerId: customer.id,
            totalAmount,
            status: "completed",
            createdAt,
          });
          itemMeta.push({ productId: product.id, quantity, price });

          // Accumulate customer lifetime stats in memory
          if (!customerStatsMap.has(customer.id)) {
            customerStatsMap.set(customer.id, {
              id: customer.id,
              totalOrders: 0,
              totalSpend: 0,
              lastPurchaseDate: createdAt,
              firstPurchaseDate: createdAt,
            });
          }
          const cStats = customerStatsMap.get(customer.id);
          cStats.totalOrders += 1;
          cStats.totalSpend += totalAmount;
          if (createdAt > cStats.lastPurchaseDate) cStats.lastPurchaseDate = createdAt;
          if (createdAt < cStats.firstPurchaseDate) cStats.firstPurchaseDate = createdAt;
        }
      }

      // 4. Execute high-throughput bulk insertions in chunks of 2,000
      const chunkSize = 2000;
      for (let i = 0; i < ordersToInsert.length; i += chunkSize) {
        const orderChunk = ordersToInsert.slice(i, i + chunkSize);
        const metaChunk = itemMeta.slice(i, i + chunkSize);

        const createdOrders = await prisma.order.createManyAndReturn({
          data: orderChunk,
          select: { id: true },
        });

        const itemsToInsert = createdOrders.map((order, idx) => ({
          orderId: order.id,
          productId: metaChunk[idx].productId,
          quantity: metaChunk[idx].quantity,
          price: metaChunk[idx].price,
        }));

        await prisma.orderItem.createMany({
          data: itemsToInsert,
        });

        insertedCount += createdOrders.length;
      }

      // 5. Bulk update customer aggregated behavioral metrics
      const customerUpdateBatches = Array.from(customerStatsMap.values());
      const updateChunkSize = 50;
      for (let i = 0; i < customerUpdateBatches.length; i += updateChunkSize) {
        const uChunk = customerUpdateBatches.slice(i, i + updateChunkSize);
        await Promise.all(
          uChunk.map((cs) => {
            const avgOrderValue = cs.totalOrders > 0 ? Math.round((cs.totalSpend / cs.totalOrders) * 100) / 100 : 0;
            const daysSinceLast = (Date.now() - new Date(cs.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24);
            const isVip = cs.totalSpend >= 10000 || cs.totalOrders >= 4;
            const isDormant = daysSinceLast >= 45;

            return prisma.customer.update({
              where: { id: cs.id },
              data: {
                totalOrders: cs.totalOrders,
                totalSpend: cs.totalSpend,
                avgOrderValue,
                lastPurchaseDate: cs.lastPurchaseDate,
                firstPurchaseDate: cs.firstPurchaseDate,
                isVip,
                isDormant,
                upsellScore: isVip ? 0.92 : 0.4,
                reactivationScore: isDormant ? 0.88 : 0.2,
              },
            });
          })
        );
      }

      // Automatically run time-window campaign attribution asynchronously in the background
      setImmediate(async () => {
        try {
          const { attributeUnattributedOrders } = await import("../services/attributionService.js");
          await attributeUnattributedOrders(merchantId, 14, 50);
        } catch (attrErr) {
          console.warn("[Import] Background attribution hook failed:", attrErr.message);
        }
      });
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