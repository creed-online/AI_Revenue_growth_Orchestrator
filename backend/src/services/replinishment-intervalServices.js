import { prisma } from "../lib/prisma.js";

function computeIntervalsFromPurchases(purchases) {
  const byProduct = new Map();

  for (const p of purchases) {
    if (!byProduct.has(p.productId)) {
      byProduct.set(p.productId, {
        productId: p.productId,
        productName: p.productName,
        isReplenishable: p.isReplenishable,
        catalogAvgCycleDays: p.catalogAvgCycleDays,
        dates: [],
      });
    }
    byProduct.get(p.productId).dates.push(p.createdAt);
  }

  const results = [];
  const now = new Date();

  for (const entry of byProduct.values()) {
    const { productId, productName, isReplenishable, catalogAvgCycleDays, dates } = entry;

    if (dates.length < 2) continue;

    dates.sort((a, b) => a.getTime() - b.getTime());

    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
    }
    const avgIntervalDays = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

    const lastPurchaseDate = dates[dates.length - 1];
    const daysSinceLastPurchase =
      (now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);

    const expectedNextPurchaseDate = new Date(
      lastPurchaseDate.getTime() + avgIntervalDays * 24 * 60 * 60 * 1000
    );

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

  results.sort(
    (a, b) => a.expectedNextPurchaseDate.getTime() - b.expectedNextPurchaseDate.getTime()
  );

  return results;
}

async function fetchPurchasesGroupedByCustomer(merchantId, customerId = null) {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        customer: {
          merchantId,
          ...(customerId ? { id: customerId } : {}),
        },
      },
    },
    select: {
      productId: true,
      order: {
        select: {
          customerId: true,
          createdAt: true,
        },
      },
      product: {
        select: {
          name: true,
          isReplenishable: true,
          avgCycleDays: true,
        },
      },
    },
  });

  const byCustomer = new Map();

  for (const item of orderItems) {
    const cId = item.order.customerId;
    if (!byCustomer.has(cId)) byCustomer.set(cId, []);

    byCustomer.get(cId).push({
      productId: item.productId,
      productName: item.product.name,
      isReplenishable: item.product.isReplenishable,
      catalogAvgCycleDays: item.product.avgCycleDays,
      createdAt: item.order.createdAt,
    });
  }

  return byCustomer;
}

export async function calculateReplenishmentInfo(customerId, merchantId) {
  const byCustomer = await fetchPurchasesGroupedByCustomer(merchantId, customerId);
  const purchases = byCustomer.get(customerId) ?? [];
  return computeIntervalsFromPurchases(purchases);
}

export async function findDueReplenishmentOpportunities(merchantId) {
  const customers = await prisma.customer.findMany({
    where: { merchantId },
    select: { id: true, name: true, email: true },
  });

  const byCustomer = await fetchPurchasesGroupedByCustomer(merchantId);

  const due = [];

  for (const customer of customers) {
    const purchases = byCustomer.get(customer.id) ?? [];
    const info = computeIntervalsFromPurchases(purchases);
    const dueItems = info.filter((i) => i.isDueForReplenishment);

    for (const item of dueItems) {
      due.push({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        ...item,
      });
    }
  }

  return due;
}

export async function findDueCustomersForProduct(merchantId, productId) {
  const customers = await prisma.customer.findMany({
    where: { merchantId },
    select: { id: true, name: true, email: true },
  });

  const byCustomer = await fetchPurchasesGroupedByCustomer(merchantId);

  const due = [];

  for (const customer of customers) {
    const purchases = byCustomer.get(customer.id) ?? [];
    const info = computeIntervalsFromPurchases(purchases);
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

  due.sort(
    (a, b) => a.expectedNextPurchaseDate.getTime() - b.expectedNextPurchaseDate.getTime()
  );

  return due;
}