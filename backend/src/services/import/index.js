import { parseFile, extractSheets, getFilePreview, detectFileType } from "./fileParser.js";
import { profileData, detectEntitiesWithAI, generateMappingsWithAI } from "./dataProfiler.js";
import { compileRecordsByEntity, normalizeRow } from "./schemaMapper.js";
import { 
  validateImportData, 
  buildLookupMaps, 
  resolveRelationships, 
  previewImport 
} from "./validator.js";
import { prisma } from "../../lib/prisma.js";
import { scanReplenishmentOpportunities } from "../opportunityEngine.js";
import { calculateReplenishmentInfo } from "../replenishment-intervalService.js";
import { getAllCustomerDiscountClassifications } from "../discountClassifier.js";
import { ensureDefaultPolicy } from "../policyEngine.js";
import { initializeScheduler } from "../schedulerService.js";

export async function analyzeImport(file, merchantId) {
  const type = detectFileType(file);
  if (!type) {
    throw new Error(`Unsupported file type: ${file.mimetype || file.originalname}`);
  }

  const parsed = await parseFile(file);
  const profiles = profileData(parsed);
  const previews = getFilePreview(parsed);

  const entityDetection = await detectEntitiesWithAI(profiles.sheets);
  const mappings = await generateMappingsWithAI(profiles.sheets, entityDetection);

  const entityDetections = entityDetection.entities.filter(e => e.targetEntity !== "Unknown");
  
  return {
    fileType: type,
    sheets: profiles.sheets.map(s => ({
      name: s.name,
      rowCount: s.rowCount,
      columns: s.columns.map(c => c.name),
    })),
    previews,
    entityDetection: entityDetections,
    mappings: mappings.mappings || [],
    unmappedColumns: mappings.unmappedColumns || [],
    warnings: mappings.warnings || [],
    confidenceSummary: summarizeConfidence(mappings.mappings || []),
  };
}

function summarizeConfidence(mappings) {
  const byEntity = {};
  for (const m of mappings) {
    if (!m.targetEntity) continue;
    if (!byEntity[m.targetEntity]) byEntity[m.targetEntity] = { high: 0, medium: 0, low: 0 };
    if (m.confidence >= 0.9) byEntity[m.targetEntity].high++;
    else if (m.confidence >= 0.7) byEntity[m.targetEntity].medium++;
    else byEntity[m.targetEntity].low++;
  }
  return byEntity;
}

export async function validateAndPreviewImport(merchantId, records, mappings) {
  const validation = await validateImportData(merchantId, records, mappings);
  const lookupMaps = await buildLookupMaps(merchantId, mappings);
  const { resolved, unresolved } = await resolveRelationships(records, mappings, lookupMaps);

  return {
    validation,
    relationships: {
      resolved: resolved.length,
      unresolved: unresolved.length,
      details: unresolved.slice(0, 10),
    },
    preview: resolved.slice(0, 10),
  };
}

export async function confirmImport(merchantId, records, mappings) {
  const lookupMaps = await buildLookupMaps(merchantId, mappings);
  const { resolved, unresolved } = await resolveRelationships(records, mappings, lookupMaps);

  if (unresolved.length > 0) {
    throw new Error(`${unresolved.length} records have unresolved relationships (missing customers/products)`);
  }

  const entityRecords = compileRecordsByEntity(resolved, mappings);

  const results = {
    customersImported: 0,
    productsImported: 0,
    ordersImported: 0,
    orderItemsImported: 0,
    duplicatesSkipped: 0,
  };

  if (entityRecords.Customer?.length) {
    const customerData = entityRecords.Customer.map(r => ({
      merchantId,
      name: r.name,
      email: r.email,
      totalOrders: r.totalOrders || 0,
      totalSpend: r.totalSpend || 0,
      avgOrderValue: r.avgOrderValue || 0,
      lastPurchaseDate: r.lastPurchaseDate,
      firstPurchaseDate: r.firstPurchaseDate,
      isVip: r.isVip || false,
      isDiscountSensitive: r.isDiscountSensitive || false,
      isDormant: r.isDormant || false,
    }));

    const result = await prisma.customer.createMany({
      data: customerData,
      skipDuplicates: true,
    });
    results.customersImported = result.count;
    results.duplicatesSkipped += customerData.length - result.count;
  }

  if (entityRecords.Product?.length) {
    const productData = entityRecords.Product.map(r => ({
      merchantId,
      name: r.name,
      price: r.price,
      category: r.category,
      isReplenishable: r.isReplenishable || false,
      avgCycleDays: r.avgCycleDays,
    }));

    const result = await prisma.product.createMany({
      data: productData,
      skipDuplicates: true,
    });
    results.productsImported = result.count;
    results.duplicatesSkipped += productData.length - result.count;
  }

  if (entityRecords.Order?.length) {
    const orderData = entityRecords.Order.map(r => ({
      customerId: r.customerId,
      totalAmount: r.price * (r.quantity || 1),
      status: "completed",
      createdAt: r.createdAt || new Date(),
    }));

    const ordersResult = await prisma.order.createMany({
      data: orderData,
      skipDuplicates: true,
    });
    results.ordersImported = ordersResult.count;

    const createdOrders = await prisma.order.findMany({
      where: {
        customerId: { in: [...new Set(orderData.map(o => o.customerId))] },
        createdAt: { in: [...new Set(orderData.map(o => o.createdAt))] },
        totalAmount: { in: [...new Set(orderData.map(o => o.totalAmount))] },
      },
      select: { id: true, customerId: true, createdAt: true, totalAmount: true },
    });

    const orderMap = new Map();
    for (const o of createdOrders) {
      const key = `${o.customerId}-${o.createdAt.toISOString()}-${o.totalAmount}`;
      orderMap.set(key, o.id);
    }

    const orderItemsData = [];
    for (const r of entityRecords.Order) {
      const key = `${r.customerId}-${r.createdAt}-${r.price * (r.quantity || 1)}`;
      const orderId = orderMap.get(key);
      if (orderId) {
        orderItemsData.push({
          orderId,
          productId: r.productId,
          quantity: r.quantity || 1,
          price: r.price,
        });
      }
    }

    if (orderItemsData.length > 0) {
      const itemsResult = await prisma.orderItem.createMany({
        data: orderItemsData,
        skipDuplicates: true,
      });
      results.orderItemsImported = itemsResult.count;
    }
  }

  return results;
}

export async function processImportedData(merchantId) {
  const safeMerchantId = Number(merchantId) || 1;
  console.log(`[Import Process] Starting post-import pipeline for merchant ${safeMerchantId}`);

  // Step 1: Calculate AI discount classifications
  try {
    await getAllCustomerDiscountClassifications(safeMerchantId);
    console.log(`[Import Process] Calculated discount classifications`);
  } catch (err) {
    console.warn("[Import Process] Discount classification calculation skipped:", err.message);
  }

  // Step 3: Ensure policy guardrails are provisioned
  try {
    await ensureDefaultPolicy(safeMerchantId);
    console.log(`[Import Process] Merchant policy guardrails ensured`);
  } catch (err) {
    console.warn("[Import Process] Policy verification skipped:", err.message);
  }

  // Step 4: Run Unified Multi-Strategy Opportunity Engine
  let opportunities = [];
  try {
    opportunities = await scanReplenishmentOpportunities(safeMerchantId);
    console.log(`[Import Process] Generated ${opportunities.length} live opportunities`);
  } catch (err) {
    console.warn("[Import Process] Opportunity scanning error:", err.message);
  }

  // Step 5: Initialize automated scheduler
  try {
    initializeScheduler();
  } catch (err) {
    console.warn("[Import Process] Scheduler initialization skipped:", err.message);
  }

  return {
    success: true,
    message: "Post-import pipeline complete. Opportunities generated.",
    opportunitiesFound: opportunities.length,
    opportunities,
  };
}