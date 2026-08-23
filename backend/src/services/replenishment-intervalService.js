import { prisma } from "../lib/prisma.js";

/**
 * Calculates purchase interval data for a single customer, per product.
 *
 * For every product the customer has ordered more than once, this works out:
 *   - avgIntervalDays: the average number of days between consecutive orders
 *                      of that product
 *   - daysSinceLastPurchase: how many days ago their most recent order of
 *                            that product was
 *   - expectedNextPurchaseDate: lastPurchaseDate + avgIntervalDays
 *   - isDueForReplenishment: true if today is at/after the expected date
 *     (or within a small early window), and the product is flagged
 *     isReplenishable in the catalog
 *
 * @param {number} customerId
 * @returns {Promise<Array<object>>} one entry per product the customer has
 *          purchased 2+ times
 */
export async function calculateReplenishmentInfo(customerId) {
  // 1. Pull every order item this customer has ever bought, oldest -> newest,
  //    including the parent order's date and the product's replenishment flags.
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { customerId },
    },
    include: {
      order: true,
      product: true,
    },
    orderBy: {
      order: { createdAt: "asc" },
    },
  });

  if (orderItems.length === 0) {
    return [];
  }

  // 2. Group purchase dates by productId.
  //    Map<productId, { productName, isReplenishable, avgCycleDays, dates: Date[] }>
  const byProduct = new Map();

  for (const item of orderItems) {
    const { productId, product, order } = item;

    if (!byProduct.has(productId)) {
      byProduct.set(productId, {
        productId,
        productName: product.name,
        isReplenishable: product.isReplenishable,
        catalogAvgCycleDays: product.avgCycleDays,
        dates: [],
      });
    }

    byProduct.get(productId).dates.push(order.createdAt);
  }

  // 3. For each product with 2+ purchases, calculate the interval stats.
  const results = [];

  for (const entry of byProduct.values()) {
    const { productId, productName, isReplenishable, catalogAvgCycleDays, dates } = entry;

    // Need at least 2 purchases to calculate an interval at all.
    if (dates.length < 2) {
      continue;
    }

    // Dates are already ordered ascending (oldest -> newest) because the
    // original query was ordered that way and we pushed in that order.
    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i].getTime() - dates[i - 1].getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      gaps.push(diffDays);
    }

    const avgIntervalDays =
      gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

    const lastPurchaseDate = dates[dates.length - 1];
    const now = new Date();

    const daysSinceLastPurchase =
      (now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);

    const expectedNextPurchaseDate = new Date(
      lastPurchaseDate.getTime() + avgIntervalDays * 24 * 60 * 60 * 1000
    );

    // Due if we're at or past the expected date, with a small 3-day grace
    // window before it too (so "almost due" customers still surface).
    const daysUntilExpected =
      (expectedNextPurchaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const isDueForReplenishment = isReplenishable && daysUntilExpected <= 3;

    results.push({
      productId,
      productName,
      isReplenishable,
      catalogAvgCycleDays,
      purchaseCount: dates.length,
      avgIntervalDays: Math.round(avgIntervalDays * 10) / 10,
      lastPurchaseDate,
      daysSinceLastPurchase: Math.round(daysSinceLastPurchase * 10) / 10,
      expectedNextPurchaseDate,
      isDueForReplenishment,
    });
  }

  // Most urgent (soonest expected date) first.
  results.sort(
    (a, b) => a.expectedNextPurchaseDate.getTime() - b.expectedNextPurchaseDate.getTime()
  );

  return results;
}

/**
 * Convenience wrapper: across ALL customers for a merchant, return only the
 * product-level entries that are currently due for replenishment.
 * Useful later for the Replenishment Agent / opportunity feed.
 *
 * @param {number} merchantId
 */
export async function findDueReplenishmentOpportunities(merchantId) {
  const customers = await prisma.customer.findMany({
    where: { merchantId },
    select: { id: true, name: true },
  });

  const due = [];

  for (const customer of customers) {
    const info = await calculateReplenishmentInfo(customer.id);
    const dueItems = info.filter((i) => i.isDueForReplenishment);

    for (const item of dueItems) {
      due.push({
        customerId: customer.id,
        customerName: customer.name,
        ...item,
      });
    }
  }

  return due;
}

/**
 * For ONE specific product, find every customer (for a given merchant) who
 * is currently due to repurchase it. Useful for "who should we target for
 * a replenishment campaign on Product X" type queries.
 *
 * @param {number} merchantId
 * @param {number} productId
 */
export async function findDueCustomersForProduct(merchantId, productId) {
  const customers = await prisma.customer.findMany({
    where: { merchantId },
    select: { id: true, name: true, email: true },
  });

  const due = [];

  for (const customer of customers) {
    const info = await calculateReplenishmentInfo(customer.id);
    const match = info.find(
      (i) => i.productId === productId && i.isDueForReplenishment
    );

    if (match) {
      due.push({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        ...match,
      });
    }
  }

  // Most overdue (oldest expected date) first.
  due.sort(
    (a, b) => a.expectedNextPurchaseDate.getTime() - b.expectedNextPurchaseDate.getTime()
  );

  return due;
}