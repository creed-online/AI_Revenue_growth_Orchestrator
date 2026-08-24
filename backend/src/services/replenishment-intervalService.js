import { prisma } from "../lib/prisma.js";

function summarizePurchaseHistory(orderItems) {
  const byProduct = new Map();

  for (const item of orderItems) {
    const { productId, product, order } = item;

    if (!byProduct.has(productId)) {
      byProduct.set(productId, {
        productId,
        productName: product.name,
        productPrice: Number(product.price ?? 0),
        isReplenishable: product.isReplenishable,
        catalogAvgCycleDays: product.avgCycleDays,
        dates: [],
      });
    }

    byProduct.get(productId).dates.push(new Date(order.createdAt));
  }

  const results = [];

  for (const entry of byProduct.values()) {
    const {
      productId,
      productName,
      productPrice,
      isReplenishable,
      catalogAvgCycleDays,
      dates,
    } = entry;

    if (dates.length < 2) {
      continue;
    }

    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const gaps = [];

    for (let i = 1; i < sortedDates.length; i++) {
      const diffMs = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      gaps.push(diffDays);
    }

    const avgIntervalDays = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const lastPurchaseDate = sortedDates[sortedDates.length - 1];
    const now = new Date();
    const daysSinceLastPurchase =
      (now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedNextPurchaseDate = new Date(
      lastPurchaseDate.getTime() + avgIntervalDays * 24 * 60 * 60 * 1000
    );
    const daysUntilExpected =
      (expectedNextPurchaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const isDueForReplenishment = isReplenishable && daysUntilExpected <= 3;
    const estimatedRevenue = Number((productPrice * Math.max(1, sortedDates.length)).toFixed(2));

    results.push({
      productId,
      productName,
      productPrice,
      isReplenishable,
      catalogAvgCycleDays,
      purchaseCount: sortedDates.length,
      avgIntervalDays: Math.round(avgIntervalDays * 10) / 10,
      lastPurchaseDate,
      daysSinceLastPurchase: Math.round(daysSinceLastPurchase * 10) / 10,
      expectedNextPurchaseDate,
      isDueForReplenishment,
      estimatedRevenue,
      potentialRevenue: estimatedRevenue,
    });
  }

  results.sort(
    (a, b) => a.expectedNextPurchaseDate.getTime() - b.expectedNextPurchaseDate.getTime()
  );

  return results;
}

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
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { customerId },
    },
    include: {
      order: {
        select: {
          customerId: true,
          createdAt: true,
        },
      },
      product: {
        select: {
          name: true,
          price: true,
          isReplenishable: true,
          avgCycleDays: true,
        },
      },
    },
  });

  return summarizePurchaseHistory(orderItems);
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

  if (!customers.length) {
    return [];
  }

  const customerIds = customers.map((customer) => customer.id);
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        customerId: { in: customerIds },
      },
    },
    include: {
      order: {
        select: {
          customerId: true,
          createdAt: true,
        },
      },
      product: {
        select: {
          name: true,
          price: true,
          isReplenishable: true,
          avgCycleDays: true,
        },
      },
    },
  });

  const customerGroups = new Map();

  for (const item of orderItems) {
    const customerId = item.order.customerId;
    if (!customerGroups.has(customerId)) {
      customerGroups.set(customerId, []);
    }
    customerGroups.get(customerId).push(item);
  }

  const due = [];

  for (const customer of customers) {
    const info = summarizePurchaseHistory(customerGroups.get(customer.id) || []);
    const dueItems = info.filter((item) => item.isDueForReplenishment);

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

  if (!customers.length) {
    return [];
  }

  const customerIds = customers.map((customer) => customer.id);
  const orderItems = await prisma.orderItem.findMany({
    where: {
      productId,
      order: {
        customerId: { in: customerIds },
      },
    },
    include: {
      order: {
        select: {
          customerId: true,
          createdAt: true,
        },
      },
      product: {
        select: {
          name: true,
          price: true,
          isReplenishable: true,
          avgCycleDays: true,
        },
      },
    },
  });

  const customerGroups = new Map();

  for (const item of orderItems) {
    const customerId = item.order.customerId;
    if (!customerGroups.has(customerId)) {
      customerGroups.set(customerId, []);
    }
    customerGroups.get(customerId).push(item);
  }

  const due = [];

  for (const customer of customers) {
    const info = summarizePurchaseHistory(customerGroups.get(customer.id) || []);
    const match = info.find(
      (item) => item.productId === productId && item.isDueForReplenishment
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