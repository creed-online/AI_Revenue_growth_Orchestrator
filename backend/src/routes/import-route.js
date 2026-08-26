import express from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { requireMerchantAccess } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/import/template/:entityType — download CSV template
 */
router.get("/template/:entityType", requireMerchantAccess, (req, res) => {
  const { entityType } = req.params;
  let csv = "";
  let filename = "";

  if (entityType === "customers") {
    csv = "name,email,totalOrders,totalSpend,avgOrderValue,lastPurchaseDate,firstPurchaseDate,isVip,isDiscountSensitive,isDormant\n";
    csv += '"John Doe","john@example.com",5,25000,5000,"2024-01-15","2023-06-01",false,true,false\n';
    csv += '"Jane Smith","jane@example.com",10,50000,5000,"2024-01-10","2023-01-15",true,false,false\n';
    filename = "customers-template.csv";
  } else if (entityType === "products") {
    csv = "name,price,category,isReplenishable,avgCycleDays\n";
    csv += '"Protein Powder",2999,"Supplements",true,30\n';
    csv += '"Yoga Mat",1499,"Equipment",false,\n';
    csv += '"Creatine",1999,"Supplements",true,60\n';
    filename = "products-template.csv";
  } else if (entityType === "orders") {
    csv = "customerEmail,productName,quantity,price,createdAt\n";
    csv += '"john@example.com","Protein Powder",2,2999,"2024-01-15"\n';
    csv += '"jane@example.com","Yoga Mat",1,1499,"2024-01-10"\n';
    filename = "orders-template.csv";
  } else {
    return res.status(400).json({ error: "invalid_entity_type" });
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

/**
 * POST /api/import/csv — upload & preview
 * body: file (multipart), entityType (customers|products|orders)
 */
router.post("/csv", requireMerchantAccess, upload.single("file"), async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const { entityType } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "no_file" });
    if (!["customers", "products", "orders"].includes(entityType)) {
      return res.status(400).json({ error: "invalid_entity_type" });
    }

    const content = file.buffer.toString("utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    const { valid, errors, preview } = await validateAndTransform(entityType, records, merchantId);

    res.json({ entityType, totalRows: records.length, validCount: valid.length, errors, preview: preview.slice(0, 10) });
  } catch (error) {
    console.error("CSV preview error:", error);
    res.status(500).json({ error: "preview_failed" });
  }
});

/**
 * POST /api/import/confirm — confirm & persist
 * body: { entityType, records: [...] }
 */
router.post("/confirm", requireMerchantAccess, async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const { entityType, records } = req.body;

    if (!entityType || !Array.isArray(records)) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    let result;
    if (entityType === "customers") result = await importCustomers(merchantId, records);
    else if (entityType === "products") result = await importProducts(merchantId, records);
    else if (entityType === "orders") result = await importOrders(merchantId, records);
    else return res.status(400).json({ error: "invalid_entity_type" });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Import confirm error:", error);
    res.status(500).json({ error: "import_failed" });
  }
});

async function validateAndTransform(entityType, records, merchantId) {
  const valid = [];
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    try {
      let transformed;
      if (entityType === "customers") {
        transformed = transformCustomer(row, merchantId);
      } else if (entityType === "products") {
        transformed = transformProduct(row, merchantId);
      } else if (entityType === "orders") {
        transformed = await transformOrder(row, merchantId);
      }
      valid.push({ rowNum, data: transformed });
    } catch (err) {
      errors.push({ rowNum, error: err.message, row });
    }
  }

  return { valid, errors, preview: valid.map(v => v.data) };
}

function transformCustomer(row, merchantId) {
  if (!row.name?.trim()) throw new Error("Missing required field: name");
  return {
    merchantId,
    name: row.name.trim(),
    email: row.email?.trim().toLowerCase() || null,
    totalOrders: parseInt(row.totalOrders) || 0,
    totalSpend: parseFloat(row.totalSpend) || 0,
    avgOrderValue: parseFloat(row.avgOrderValue) || 0,
    lastPurchaseDate: row.lastPurchaseDate ? new Date(row.lastPurchaseDate) : null,
    firstPurchaseDate: row.firstPurchaseDate ? new Date(row.firstPurchaseDate) : null,
    isVip: row.isVip === "true" || row.isVip === "1",
    isDiscountSensitive: row.isDiscountSensitive === "true" || row.isDiscountSensitive === "1",
    isDormant: row.isDormant === "true" || row.isDormant === "1",
  };
}

function transformProduct(row, merchantId) {
  if (!row.name?.trim()) throw new Error("Missing required field: name");
  const price = parseFloat(row.price);
  if (isNaN(price)) throw new Error("Invalid price");
  return {
    merchantId,
    name: row.name.trim(),
    price,
    category: row.category?.trim() || null,
    isReplenishable: row.isReplenishable === "true" || row.isReplenishable === "1",
    avgCycleDays: row.avgCycleDays ? parseInt(row.avgCycleDays) : null,
  };
}

async function transformOrder(row, merchantId) {
  if (!row.customerEmail?.trim()) throw new Error("Missing customerEmail");
  if (!row.productName?.trim()) throw new Error("Missing productName");

  const customer = await prisma.customer.findFirst({
    where: { merchantId, email: row.customerEmail.trim().toLowerCase() },
  });
  if (!customer) throw new Error(`Customer not found: ${row.customerEmail}`);

  const product = await prisma.product.findFirst({
    where: { merchantId, name: row.productName.trim() },
  });
  if (!product) throw new Error(`Product not found: ${row.productName}`);

  return {
    customerId: customer.id,
    productId: product.id,
    quantity: parseInt(row.quantity) || 1,
    price: parseFloat(row.price) || product.price,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

async function importCustomers(merchantId, records) {
  const result = await prisma.customer.createMany({ data: records.map(r => r.data) });
  return { createdCustomers: result.count };
}

async function importProducts(merchantId, records) {
  const result = await prisma.product.createMany({ data: records.map(r => r.data) });
  return { createdProducts: result.count };
}

async function importOrders(merchantId, records) {
  let createdOrders = 0, createdItems = 0;
  for (const { data } of records) {
    const { customerId, productId, quantity, price, createdAt } = data;
    const totalAmount = price * quantity;
    const order = await prisma.order.create({
      data: { customerId, totalAmount, status: "completed", createdAt },
    });
    await prisma.orderItem.create({
      data: { orderId: order.id, productId, quantity, price },
    });
    createdOrders++; createdItems++;
  }
  return { createdOrders, createdItems };
}

export default router;