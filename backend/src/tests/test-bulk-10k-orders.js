import { prisma } from "../lib/prisma.js";

async function testBulk10kOrders() {
  console.log("=== Testing High-Volume 10,000 Order Ingestion Benchmark ===");
  const merchantId = 1;

  // 1. Prepare 10,000 simulated order records
  const count = 10000;
  console.log(`Generating ${count} order rows in memory...`);
  const simulatedRows = [];
  for (let i = 0; i < count; i++) {
    simulatedRows.push({
      email: `customer_${i % 200}@enterprise-demo.com`,
      productName: `Product Catalog Item ${(i % 20) + 1}`,
      quantity: 1,
      price: 1499,
      createdAt: new Date(Date.now() - (i % 60) * 86400000).toISOString(),
    });
  }

  const t0 = Date.now();

  // 2. Pre-fetch or upsert customers & products in bulk
  const uniqueEmails = [...new Set(simulatedRows.map((r) => r.email))];
  const uniqueProducts = [...new Set(simulatedRows.map((r) => r.productName))];

  console.log(`Unique Customers: ${uniqueEmails.length}, Unique Products: ${uniqueProducts.length}`);

  await prisma.customer.createMany({
    data: uniqueEmails.map((email) => ({
      merchantId,
      name: email.split("@")[0],
      email,
      totalOrders: 0,
      totalSpend: 0,
      avgOrderValue: 0,
    })),
    skipDuplicates: true,
  });

  await prisma.product.createMany({
    data: uniqueProducts.map((name) => ({
      merchantId,
      name,
      price: 1499,
      isReplenishable: true,
      avgCycleDays: 30,
    })),
    skipDuplicates: true,
  });

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ where: { merchantId, email: { in: uniqueEmails } }, select: { id: true, email: true } }),
    prisma.product.findMany({ where: { merchantId, name: { in: uniqueProducts } }, select: { id: true, name: true } }),
  ]);

  const customerMap = new Map(customers.map((c) => [c.email.toLowerCase(), c.id]));
  const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p.id]));

  // 3. Prepare Bulk Orders
  const ordersToInsert = [];
  const itemMeta = [];

  for (const row of simulatedRows) {
    const custId = customerMap.get(row.email.toLowerCase());
    const prodId = productMap.get(row.productName.toLowerCase());
    if (custId && prodId) {
      ordersToInsert.push({
        customerId: custId,
        totalAmount: row.price * row.quantity,
        status: "completed",
        createdAt: new Date(row.createdAt),
      });
      itemMeta.push({ productId: prodId, quantity: row.quantity, price: row.price });
    }
  }

  console.log(`Inserting ${ordersToInsert.length} Orders in bulk chunks...`);

  // Insert orders in batches of 2000 using createManyAndReturn
  const chunkSize = 2000;
  let totalInserted = 0;

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

    totalInserted += createdOrders.length;
  }

  const duration = Date.now() - t0;
  console.log(`\n🎉 10,000 Orders Ingested and Indexed in ${duration}ms! (${(totalInserted / (duration / 1000)).toFixed(0)} rows/sec)`);
  process.exit(0);
}

testBulk10kOrders().catch((err) => {
  console.error("Bulk Test Error:", err);
  process.exit(1);
});

