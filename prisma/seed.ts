import { faker } from "@faker-js/faker";
import { prisma } from "../lib/prisma";

async function main() {
  // ---------------------------------------------------------
  // 1. MERCHANT
  // ---------------------------------------------------------
  const merchant = await prisma.merchant.create({
    data: {
      businessName: "Demo Fitness Store",
      email: "demo@rakshfit.com",
      industry: "Fitness & Wellness",
      currency: "INR",
      // password set at runtime via ensureDemoMerchantCredentials (default: demo1234)
    },
  });
  console.log(`✔ Created merchant: ${merchant.businessName} (id: ${merchant.id})`);

  let merchantPolicy = await prisma.policy.findFirst({
    where: { merchantId: merchant.id },
  });

  if (!merchantPolicy) {
    merchantPolicy = await prisma.policy.create({
      data: {
        merchantId: merchant.id,
        maxDiscount: 10,
        maxCampaignAudience: 500,
        maxCampaignBudget: 25000,
        maxCampaignsPerCustomerPerMonth: 2,
        requireApproval: true,
        optOutCustomerIds: [],
        optOutProductIds: [],
      },
    });
  }

  console.log(
    `✔ Seeded policy for merchant ${merchant.id}: maxDiscount=${merchantPolicy.maxDiscount}, maxAudience=${merchantPolicy.maxCampaignAudience}, maxBudget=${merchantPolicy.maxCampaignBudget}`
  );

  // ---------------------------------------------------------
  // 2. PRODUCTS (30-50, ~40% replenishable)
  // ---------------------------------------------------------
  const PRODUCT_COUNT = 40;

  const productsData = Array.from({ length: PRODUCT_COUNT }).map(() => {
    const isReplenishable = Math.random() < 0.4;

    return {
      merchantId: merchant.id,
      name: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price({ min: 200, max: 8000 })),
      category: faker.commerce.department(),
      isReplenishable,
      avgCycleDays: isReplenishable
        ? faker.number.int({ min: 20, max: 60 })
        : null,
    };
  });

  await prisma.product.createMany({ data: productsData });
  console.log(`✔ Created ${productsData.length} products`);

  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id },
  });
  const replenishableProducts = products.filter((p) => p.isReplenishable);

  // ---------------------------------------------------------
  // 3. CUSTOMERS (300-500, mixed behavioural flags)
  // ---------------------------------------------------------
  const CUSTOMER_COUNT = 400;

  const customersData = Array.from({ length: CUSTOMER_COUNT }).map(() => {
    const isVip = Math.random() < 0.1;
    const isDiscountSensitive = Math.random() < 0.3;
    const isDormant = Math.random() < 0.2;

    const totalOrders = isVip
      ? faker.number.int({ min: 15, max: 40 })
      : faker.number.int({ min: 1, max: 12 });

    const avgOrderValue = faker.number.float({
      min: 300,
      max: isVip ? 15000 : 6000,
      fractionDigits: 2,
    });

    const totalSpend = parseFloat((totalOrders * avgOrderValue).toFixed(2));

    const lastPurchaseDate = isDormant
      ? faker.date.past({ years: 1 })
      : faker.date.recent({ days: 25 });

    const firstPurchaseDate = faker.date.past({ years: 2, refDate: lastPurchaseDate });

    return {
      merchantId: merchant.id,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      totalOrders,
      totalSpend,
      avgOrderValue,
      lastPurchaseDate,
      firstPurchaseDate,
      isVip,
      isDiscountSensitive,
      isDormant,
      reactivationScore: isDormant
        ? faker.number.float({ min: 0.5, max: 0.95, fractionDigits: 2 })
        : faker.number.float({ min: 0, max: 0.3, fractionDigits: 2 }),
      crossSellScore: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      upsellScore: isVip
        ? faker.number.float({ min: 0.4, max: 0.9, fractionDigits: 2 })
        : faker.number.float({ min: 0, max: 0.5, fractionDigits: 2 }),
      replenishmentScore: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    };
  });

  await prisma.customer.createMany({ data: customersData });
  console.log(`✔ Created ${customersData.length} customers`);

  const customers = await prisma.customer.findMany({
    where: { merchantId: merchant.id },
  });

  // ===========================================================
  // 4. ORDERS + ORDER ITEMS
  // ===========================================================
  // Strategy:
  //   A. Pick 40-60 customers to be "replenishment demo" customers.
  //      For each, generate a clean history of orders for ONE
  //      replenishable product, spaced ~avgCycleDays apart, with
  //      the LAST order landing 28-31 days ago (due today/soon).
  //   B. Every other customer gets random background order history
  //      (general noise, still realistic, not specially patterned).
  // ===========================================================

  const REPLENISHMENT_DEMO_COUNT = 50; // within 40-60 range
  const shuffledCustomers = faker.helpers.shuffle([...customers]);
  const replenishmentDemoCustomers = shuffledCustomers.slice(0, REPLENISHMENT_DEMO_COUNT);
  const regularCustomers = shuffledCustomers.slice(REPLENISHMENT_DEMO_COUNT);

  const ordersToCreate: {
    customerId: number;
    totalAmount: number;
    status: string;
    createdAt: Date;
    items: { productId: number; quantity: number; price: number }[];
  }[] = [];

  // --- A. Deliberately spaced replenishment-pattern customers ---
  for (const customer of replenishmentDemoCustomers) {
    if (replenishableProducts.length === 0) break;

    const product = faker.helpers.arrayElement(replenishableProducts);
    const cycle = product.avgCycleDays ?? 30;

    // How many past cycles of history to generate (3-6 past orders)
    const cycleCount = faker.number.int({ min: 3, max: 6 });

    // Days since the LAST order — deliberately in the 28-31 day
    // "due now" window for the demo.
    const daysSinceLastOrder = faker.number.int({ min: 28, max: 31 });

    // Build order dates walking backwards from "daysSinceLastOrder ago"
    // in ~cycle-day steps, with slight jitter so it looks natural.
    for (let i = 0; i < cycleCount; i++) {
      const daysAgo = daysSinceLastOrder + i * cycle + faker.number.int({ min: -2, max: 2 });
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      const quantity = faker.number.int({ min: 1, max: 3 });
      const price = product.price;
      const totalAmount = parseFloat((price * quantity).toFixed(2));

      ordersToCreate.push({
        customerId: customer.id,
        totalAmount,
        status: "completed",
        createdAt: orderDate,
        items: [{ productId: product.id, quantity, price }],
      });
    }
  }

  console.log(
    `✔ Prepared deliberate replenishment patterns for ${replenishmentDemoCustomers.length} customers`
  );

  // --- B. Background/random order history for everyone else ---
  for (const customer of regularCustomers) {
    const orderCount = customer.isVip
      ? faker.number.int({ min: 5, max: 18 })
      : faker.number.int({ min: 1, max: 12 });

    for (let i = 0; i < orderCount; i++) {
      const itemCount = faker.number.int({ min: 1, max: 3 });
      const chosenProducts = faker.helpers.arrayElements(products, itemCount);

      const items = chosenProducts.map((p) => {
        const quantity = faker.number.int({ min: 1, max: 3 });
        return { productId: p.id, quantity, price: p.price };
      });

      const totalAmount = parseFloat(
        items.reduce((sum, it) => sum + it.price * it.quantity, 0).toFixed(2)
      );

      const orderDate = customer.isDormant
        ? faker.date.past({ years: 1 })
        : faker.date.recent({ days: 180 });

      ordersToCreate.push({
        customerId: customer.id,
        totalAmount,
        status: "completed",
        createdAt: orderDate,
        items,
      });
    }
  }

  console.log(`✔ Prepared ${ordersToCreate.length} total orders (patterned + background)`);

  // ---------------------------------------------------------
  // Insert orders (need each order's id before inserting its items)
  // Done in chunks with Promise.all to keep things reasonably fast.
  // ---------------------------------------------------------
  const CHUNK_SIZE = 50;
  let createdOrderCount = 0;
  let createdItemCount = 0;

  for (let i = 0; i < ordersToCreate.length; i += CHUNK_SIZE) {
    const chunk = ordersToCreate.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (orderData) => {
        const order = await prisma.order.create({
          data: {
            customerId: orderData.customerId,
            totalAmount: orderData.totalAmount,
            status: orderData.status,
            createdAt: orderData.createdAt,
          },
        });

        await prisma.orderItem.createMany({
          data: orderData.items.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        createdOrderCount += 1;
        createdItemCount += orderData.items.length;
      })
    );

    process.stdout.write(
      `\r  ...inserted ${Math.min(i + CHUNK_SIZE, ordersToCreate.length)}/${ordersToCreate.length} orders`
    );
  }
  console.log();

  console.log(`✔ Created ${createdOrderCount} orders with ${createdItemCount} order items`);

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  const vipCount = customersData.filter((c) => c.isVip).length;
  const dormantCount = customersData.filter((c) => c.isDormant).length;
  const discountSensitiveCount = customersData.filter((c) => c.isDiscountSensitive).length;
  const replenishableCount = productsData.filter((p) => p.isReplenishable).length;

  console.log("\n--- Seed Summary ---");
  console.log(`Merchant:                 1`);
  console.log(`Products:                 ${productsData.length} (${replenishableCount} replenishable)`);
  console.log(`Customers:                ${customersData.length}`);
  console.log(`  VIP:                    ${vipCount}`);
  console.log(`  Dormant:                ${dormantCount}`);
  console.log(`  Discount-sensitive:     ${discountSensitiveCount}`);
  console.log(`Orders:                   ${createdOrderCount}`);
  console.log(`Order items:              ${createdItemCount}`);
  console.log(`Replenishment-pattern customers (due ~28-31 days ago): ${replenishmentDemoCustomers.length}`);
  console.log("--------------------\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });