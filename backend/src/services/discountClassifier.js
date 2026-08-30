import { prisma } from "../lib/prisma.js";

function daysBetween(dateA, dateB) {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

export function buildCustomerPurchaseStats(customer) {
  const orders = [...(customer.orders ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const totalOrders = orders.length;
  const totalSpend = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

  let avgDaysBetweenOrders = 999;
  let daysSinceLastPurchase = 999;
  const gaps = [];

  if (totalOrders > 1) {
    for (let i = 1; i < orders.length; i += 1) {
      const prevDate = new Date(orders[i - 1].createdAt);
      const currDate = new Date(orders[i].createdAt);
      gaps.push(daysBetween(prevDate, currDate));
    }

    avgDaysBetweenOrders =
      gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

    const lastOrderDate = new Date(orders[orders.length - 1].createdAt);
    daysSinceLastPurchase = daysBetween(new Date(), lastOrderDate);
  } else if (totalOrders === 1) {
    const lastOrderDate = new Date(orders[0].createdAt);
    daysSinceLastPurchase = daysBetween(new Date(), lastOrderDate);
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    totalOrders,
    totalSpend: Number(totalSpend.toFixed(2)),
    avgOrderValue: Number(avgOrderValue.toFixed(2)),
    avgDaysBetweenOrders: Number(avgDaysBetweenOrders.toFixed(2)),
    daysSinceLastPurchase: Number(daysSinceLastPurchase.toFixed(2)),
    isDormant: Boolean(customer.isDormant),
    isDiscountSensitive: Boolean(customer.isDiscountSensitive),
    isVip: Boolean(customer.isVip),
  };
}

export function classifyCustomer(stats) {
  let score = 0;
  const reasons = [];

  if (stats.totalOrders <= 1) {
    score += 25;
    reasons.push("This customer has very little purchase history and is a good reactivation target.");
  }

  if (stats.daysSinceLastPurchase > 90) {
    score += 25;
    reasons.push("Long gap since last purchase means the customer is likely to need a push.");
  } else if (stats.daysSinceLastPurchase > 45) {
    score += 14;
    reasons.push("Moderate delay since the last purchase suggests some churn risk.");
  }

  if (stats.avgDaysBetweenOrders > 60) {
    score += 15;
    reasons.push("The customer buys on a slow, inconsistent cycle, which makes them more price-sensitive.");
  } else if (stats.avgDaysBetweenOrders < 30 && stats.totalOrders > 1) {
    score -= 10;
    reasons.push("They buy frequently and consistently, so they likely do not need a large discount.");
  }

  if (stats.isDormant) {
    score += 18;
    reasons.push("Customer is marked dormant, which raises reactivation risk.");
  }

  if (stats.isDiscountSensitive) {
    score += 15;
    reasons.push("Customer already shows a discount-sensitive profile in the dataset.");
  }

  if (stats.avgOrderValue < 500) {
    score += 10;
    reasons.push("Lower order value means the customer may need a stronger incentive to return.");
  }

  if (stats.totalOrders <= 1 && stats.daysSinceLastPurchase > 30) {
    score += 10;
    reasons.push("A one-order customer with a long lapse is a strong candidate for a max reactivation offer.");
  }

  let classification = "no-discount-needed";
  let recommendedDiscountTier = 0;

  if (score >= 55) {
    classification = "high-price-sensitivity";
    recommendedDiscountTier = 10;
    reasons.push("High urgency and weak purchase continuity suggest a stronger offer is needed.");
  } else if (score >= 25) {
    classification = "discount-sensitive";
    recommendedDiscountTier = 5;
    reasons.push("A moderate incentive is likely enough to re-engage this customer.");
  } else {
    classification = "no-discount-needed";
    recommendedDiscountTier = 0;
    reasons.push("This customer appears to be a healthy repeat buyer and does not look discount-dependent.");
  }

  return {
    classification,
    recommendedDiscountTier,
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

export async function getDiscountClassification(customerId, merchantId = 1) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId, merchantId },
    include: {
      orders: {
        where: { status: "completed" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!customer) {
    throw new Error(`Customer ${customerId} not found for merchant ${merchantId}`);
  }

  const stats = buildCustomerPurchaseStats(customer);
  const classification = classifyCustomer(stats);

  return {
    customerId: customer.id,
    customerName: customer.name,
    merchantId,
    classification: classification.classification,
    recommendedDiscountTier: classification.recommendedDiscountTier,
    score: classification.score,
    reasons: classification.reasons,
    stats,
  };
}

export async function getAllCustomerDiscountClassifications(merchantId = 1) {
  const customers = await prisma.customer.findMany({
    where: { merchantId },
    include: {
      orders: {
        where: { status: "completed" },
        orderBy: { createdAt: "asc" },
        take: 20,
      },
    },
    take: 250,
  });

  const results = await Promise.all(
    customers.map(async (customer) => {
      const stats = buildCustomerPurchaseStats(customer);
      const classification = classifyCustomer(stats);

      return {
        customerId: customer.id,
        customerName: customer.name,
        merchantId,
        classification: classification.classification,
        recommendedDiscountTier: classification.recommendedDiscountTier,
        score: classification.score,
        reasons: classification.reasons,
        stats,
      };
    })
  );

  return results.sort((a, b) => b.score - a.score);
}
