import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";

const CUSTOMER_COUNT = 500;
const PRODUCT_COUNT = 7;
const ORDER_COUNT = 5000;

const OUTPUT_DIR = path.resolve("../demo-import-data");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const productsData = [
  { name: "Whey Protein Powder", price: 2999, category: "Supplements", isReplenishable: true, avgCycleDays: 30 },
  { name: "Creatine Monohydrate", price: 1499, category: "Supplements", isReplenishable: true, avgCycleDays: 45 },
  { name: "Pre-Workout Formula", price: 2499, category: "Supplements", isReplenishable: true, avgCycleDays: 30 },
  { name: "Omega-3 Fish Oil", price: 999, category: "Supplements", isReplenishable: true, avgCycleDays: 60 },
  { name: "Resistance Bands Set", price: 799, category: "Equipment", isReplenishable: false, avgCycleDays: null },
  { name: "Yoga Mat Premium", price: 1499, category: "Equipment", isReplenishable: false, avgCycleDays: null },
  { name: "Shaker Bottle", price: 399, category: "Accessories", isReplenishable: false, avgCycleDays: null },
];

const replenishableProducts = productsData.filter(p => p.isReplenishable);
const nonReplenishableProducts = productsData.filter(p => !p.isReplenishable);

console.log(`Generating ${PRODUCT_COUNT} products...`);
console.log(`Replenishable: ${replenishableProducts.map(p => p.name).join(", ")}`);
console.log(`Non-replenishable: ${nonReplenishableProducts.map(p => p.name).join(", ")}`);

const customersData = [];
const ordersData = [];

const now = new Date();
const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

for (let i = 0; i < CUSTOMER_COUNT; i++) {
  const isVip = Math.random() < 0.12;
  const isDiscountSensitive = Math.random() < 0.28;
  const isDormant = Math.random() < 0.18;

  let totalOrders, avgOrderValue, totalSpend;

  if (isVip) {
    totalOrders = faker.number.int({ min: 15, max: 45 });
    avgOrderValue = faker.number.float({ min: 3000, max: 12000, fractionDigits: 2 });
  } else {
    totalOrders = faker.number.int({ min: 1, max: 18 });
    avgOrderValue = faker.number.float({ min: 800, max: 6000, fractionDigits: 2 });
  }

  totalSpend = parseFloat((totalOrders * avgOrderValue).toFixed(2));

  const lastPurchaseDate = isDormant
    ? faker.date.past({ years: 1, refDate: now })
    : faker.date.recent({ days: 40, refDate: now });

  const firstPurchaseDate = faker.date.past({ years: 2, refDate: lastPurchaseDate });

  const customer = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    totalOrders,
    totalSpend,
    avgOrderValue,
    lastPurchaseDate: lastPurchaseDate.toISOString().split("T")[0],
    firstPurchaseDate: firstPurchaseDate.toISOString().split("T")[0],
    isVip: isVip ? "true" : "false",
    isDiscountSensitive: isDiscountSensitive ? "true" : "false",
    isDormant: isDormant ? "true" : "false",
  };

  customersData.push(customer);

  let ordersGenerated = 0;

  if (isDormant) {
    for (let o = 0; o < totalOrders; o++) {
      const product = faker.helpers.arrayElement(productsData);
      const quantity = faker.number.int({ min: 1, max: 3 });
      const orderDate = faker.date.past({ years: 1, refDate: lastPurchaseDate });
      ordersData.push({
        customerEmail: customer.email,
        productName: product.name,
        quantity,
        price: product.price,
        createdAt: orderDate.toISOString().split("T")[0],
      });
      ordersGenerated++;
    }
    continue;
  }

  const replenishmentCustomer = Math.random() < 0.35 && replenishableProducts.length > 0;
  const primaryReplenishableProduct = replenishmentCustomer
    ? faker.helpers.arrayElement(replenishableProducts)
    : null;

  if (replenishmentCustomer && primaryReplenishableProduct) {
    const cycleDays = primaryReplenishableProduct.avgCycleDays || 30;
    const cycleCount = faker.number.int({ min: 4, max: 8 });

    const daysSinceLastOrder = faker.number.int({ min: 25, max: 35 });

    for (let c = 0; c < cycleCount; c++) {
      const daysAgo = daysSinceLastOrder + c * cycleDays + faker.number.int({ min: -3, max: 3 });
      const orderDate = new Date(now.getTime() - daysAgo * 86400000);
      const quantity = faker.number.int({ min: 1, max: 2 });

      ordersData.push({
        customerEmail: customer.email,
        productName: primaryReplenishableProduct.name,
        quantity,
        price: primaryReplenishableProduct.price,
        createdAt: orderDate.toISOString().split("T")[0],
      });
      ordersGenerated++;
    }

    const remainingOrders = totalOrders - ordersGenerated;
    for (let o = 0; o < remainingOrders; o++) {
      const product = faker.helpers.arrayElement(productsData.filter(p => p !== primaryReplenishableProduct));
      const quantity = faker.number.int({ min: 1, max: 3 });
      const orderDate = faker.date.between({ from: firstPurchaseDate, to: lastPurchaseDate });
      ordersData.push({
        customerEmail: customer.email,
        productName: product.name,
        quantity,
        price: product.price,
        createdAt: orderDate.toISOString().split("T")[0],
      });
    }
  } else {
    for (let o = 0; o < totalOrders; o++) {
      const itemCount = faker.number.int({ min: 1, max: 3 });
      const chosenProducts = faker.helpers.arrayElements(productsData, itemCount);

      for (const product of chosenProducts) {
        const quantity = faker.number.int({ min: 1, max: 3 });
        const orderDate = faker.date.between({ from: firstPurchaseDate, to: lastPurchaseDate });
        ordersData.push({
          customerEmail: customer.email,
          productName: product.name,
          quantity,
          price: product.price,
          createdAt: orderDate.toISOString().split("T")[0],
        });
      }
    }
  }
}

console.log(`Generated ${customersData.length} customers`);
console.log(`Generated ${ordersData.length} order lines`);

function writeCSV(filename, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(values.join(","));
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), lines.join("\n"));
}

console.log("\nWriting CSV files...");

writeCSV("products.csv", ["name", "price", "category", "isReplenishable", "avgCycleDays"], productsData);
console.log("✓ products.csv");

writeCSV("customers.csv", ["name", "email", "totalOrders", "totalSpend", "avgOrderValue", "lastPurchaseDate", "firstPurchaseDate", "isVip", "isDiscountSensitive", "isDormant"], customersData);
console.log("✓ customers.csv");

writeCSV("orders.csv", ["customerEmail", "productName", "quantity", "price", "createdAt"], ordersData);
console.log("✓ orders.csv");

console.log(`\n✅ All files written to: ${OUTPUT_DIR}`);
console.log("\n📋 Import Order:");
console.log("  1. products.csv   (7 products)");
console.log("  2. customers.csv  (500 customers)");
console.log("  3. orders.csv     (~5000 order lines)");

const stats = {
  customers: customersData.length,
  products: productsData.length,
  orderLines: ordersData.length,
  vipCount: customersData.filter(c => c.isVip === "true").length,
  dormantCount: customersData.filter(c => c.isDormant === "true").length,
  discountSensitiveCount: customersData.filter(c => c.isDiscountSensitive === "true").length,
  replenishableProducts: replenishableProducts.length,
};

console.log("\n📊 Dataset Stats:");
console.log(stats);