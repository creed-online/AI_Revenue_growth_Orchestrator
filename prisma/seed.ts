// This file is made to generate random (demo) data for the Ai to train upon and this is done by faker.js

import { faker } from "@faker-js/faker";
import { prisma } from "../lib/prisma.ts";

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
    },
  });
  console.log(`✔ Created merchant: ${merchant.businessName} (id: ${merchant.id})`);

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

  // Fetch back the products with their real IDs (createMany doesn't return rows)
  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id },
  });

  // ---------------------------------------------------------
  // 3. CUSTOMERS (300-500, mixed behavioural flags)
  // ---------------------------------------------------------
  const CUSTOMER_COUNT = 400;

  const customersData = Array.from({ length: CUSTOMER_COUNT }).map(() => {
    // Behavioural flags — controlled ratios, not pure randomness
    const isVip = Math.random() < 0.1; // 10% VIP
    const isDiscountSensitive = Math.random() < 0.3; // 30% discount-sensitive
    const isDormant = Math.random() < 0.2; // 20% dormant

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
      ? faker.date.past({ years: 1 }) // long ago → dormant
      : faker.date.recent({ days: 25 }); // recently active

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

      // Simple starter scores — real scoring logic comes later (Day 4)
      reactivationScore: isDormant ? faker.number.float({ min: 0.5, max: 0.95, fractionDigits: 2 }) : faker.number.float({ min: 0, max: 0.3, fractionDigits: 2 }),
      crossSellScore: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      upsellScore: isVip ? faker.number.float({ min: 0.4, max: 0.9, fractionDigits: 2 }) : faker.number.float({ min: 0, max: 0.5, fractionDigits: 2 }),
      replenishmentScore: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    };
  });

  await prisma.customer.createMany({ data: customersData });
  console.log(`✔ Created ${customersData.length} customers`);

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  const vipCount = customersData.filter((c) => c.isVip).length;
  const dormantCount = customersData.filter((c) => c.isDormant).length;
  const discountSensitiveCount = customersData.filter((c) => c.isDiscountSensitive).length;
  const replenishableCount = productsData.filter((p) => p.isReplenishable).length;

  console.log("\n--- Seed Summary ---");
  console.log(`Merchant:            1`);
  console.log(`Products:            ${productsData.length} (${replenishableCount} replenishable)`);
  console.log(`Customers:           ${customersData.length}`);
  console.log(`  VIP:               ${vipCount}`);
  console.log(`  Dormant:           ${dormantCount}`);
  console.log(`  Discount-sensitive:${discountSensitiveCount}`);
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