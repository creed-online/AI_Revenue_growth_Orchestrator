import { findDueReplenishmentOpportunities } from "./replenishment-intervalService.js";
import { prisma } from "../lib/prisma.js";

/**
 * Unified Multi-Strategy Opportunity Engine
 * Scans a merchant's customer base, product catalog, and order transactions
 * to generate ranked, actionable revenue opportunities across 4 strategies:
 *
 * 1. Replenishment Opportunities (product repeat purchase cycles)
 * 2. Reactivation Opportunities (dormant / win-back cohorts)
 * 3. VIP Upsell Opportunities (top spenders / VIP loyalty cohorts)
 * 4. Discount Sensitivity Opportunities (margin-safe conversion boosters)
 *
 * @param {number} merchantId
 * @returns {Promise<Array<object>>} ranked list of opportunities
 */
export async function scanReplenishmentOpportunities(merchantId) {
  const safeMerchantId = Number(merchantId) || 1;
  const allOpportunities = [];

  // =========================================================================
  // STRATEGY 1: Product Replenishment Cycle Opportunities
  // =========================================================================
  try {
    const dueEntries = await findDueReplenishmentOpportunities(safeMerchantId);

    if (dueEntries.length > 0) {
      const byProduct = new Map();

      for (const entry of dueEntries) {
        if (!byProduct.has(entry.productId)) {
          byProduct.set(entry.productId, {
            productId: entry.productId,
            productName: entry.productName,
            catalogAvgCycleDays: entry.catalogAvgCycleDays,
            customers: [],
          });
        }
        byProduct.get(entry.productId).customers.push(entry);
      }

      for (const group of byProduct.values()) {
        const { productId, productName, catalogAvgCycleDays, customers } = group;
        const customerCount = customers.length;

        const potentialRevenue = Math.round(
          customers.reduce((sum, c) => sum + (c.potentialRevenue ?? 0), 0) * 100
        ) / 100;

        const cycleDeviations = customers.map((c) => {
          if (!catalogAvgCycleDays) return 1;
          return Math.abs(c.avgIntervalDays - catalogAvgCycleDays) / catalogAvgCycleDays;
        });
        const avgDeviation = cycleDeviations.reduce((sum, d) => sum + d, 0) / cycleDeviations.length;
        const consistencyScore = Math.max(0.3, 1 - avgDeviation);
        const sampleSizeBoost = Math.min(0.15, customerCount * 0.01);
        const confidence = Math.min(0.98, Math.round((consistencyScore + sampleSizeBoost) * 100) / 100);

        const priorityScore = customerCount * confidence;
        let priority = "low";
        if (priorityScore >= 15) priority = "high";
        else if (priorityScore >= 6) priority = "medium";

        allOpportunities.push({
          id: String(productId),
          opportunityType: "replenishment",
          productId,
          productName,
          catalogAvgCycleDays,
          customerCount,
          potentialRevenue,
          confidence,
          priority,
          recommendedAction: `Send a replenishment reminder to ${customerCount} customer${customerCount === 1 ? "" : "s"} due to repurchase ${productName}`,
          customers: customers.map((c) => ({
            customerId: c.customerId,
            customerName: c.customerName,
            daysSinceLastPurchase: c.daysSinceLastPurchase,
            expectedNextPurchaseDate: c.expectedNextPurchaseDate,
            potentialRevenue: c.potentialRevenue,
          })),
        });
      }
    }
  } catch (err) {
    console.warn("[OpportunityEngine] Replenishment scan skipped:", err.message);
  }

  // =========================================================================
  // STRATEGY 2: Customer Reactivation & Win-Back Opportunities
  // =========================================================================
  try {
    const dormantCustomers = await prisma.customer.findMany({
      where: {
        merchantId: safeMerchantId,
        isDormant: true,
      },
    });

    if (dormantCustomers.length > 0) {
      const customerCount = dormantCustomers.length;
      const potentialRevenue = Math.round(
        dormantCustomers.reduce((sum, c) => {
          const estimatedAov = c.avgOrderValue > 0 ? c.avgOrderValue : (c.totalSpend > 0 ? c.totalSpend / Math.max(1, c.totalOrders) : 2500);
          return sum + estimatedAov * 0.45;
        }, 0) * 100
      ) / 100;

      allOpportunities.push({
        id: "reactivation",
        opportunityType: "reactivation",
        productId: 0,
        productName: "Dormant Customer Win-Back Campaign",
        catalogAvgCycleDays: 60,
        customerCount,
        potentialRevenue: Math.max(potentialRevenue, 5000),
        confidence: 0.88,
        priority: customerCount >= 5 ? "high" : "medium",
        recommendedAction: `Re-engage ${customerCount} dormant customer${customerCount === 1 ? "" : "s"} with a personalized win-back offer.`,
        customers: dormantCustomers.map((c) => ({
          customerId: c.id,
          customerName: c.name,
          daysSinceLastPurchase: 60,
          expectedNextPurchaseDate: new Date(),
          potentialRevenue: c.avgOrderValue || 2500,
        })),
      });
    }
  } catch (err) {
    console.warn("[OpportunityEngine] Reactivation scan skipped:", err.message);
  }

  // =========================================================================
  // STRATEGY 3: VIP Loyalty & High-AOV Upsell Opportunities
  // =========================================================================
  try {
    const vipCustomers = await prisma.customer.findMany({
      where: {
        merchantId: safeMerchantId,
        isVip: true,
      },
    });

    if (vipCustomers.length > 0) {
      const customerCount = vipCustomers.length;
      const potentialRevenue = Math.round(
        vipCustomers.reduce((sum, c) => {
          const baseSpend = c.avgOrderValue > 0 ? c.avgOrderValue : (c.totalSpend > 0 ? c.totalSpend / Math.max(1, c.totalOrders) : 4000);
          return sum + baseSpend * 1.35;
        }, 0) * 100
      ) / 100;

      allOpportunities.push({
        id: "upsell",
        opportunityType: "upsell",
        productId: 0,
        productName: "VIP Exclusive Loyalty & Early Access",
        catalogAvgCycleDays: 30,
        customerCount,
        potentialRevenue: Math.max(potentialRevenue, 8000),
        confidence: 0.92,
        priority: "high",
        recommendedAction: `Offer exclusive early access and bundling perks to ${customerCount} VIP shopper${customerCount === 1 ? "" : "s"}.`,
        customers: vipCustomers.map((c) => ({
          customerId: c.id,
          customerName: c.name,
          daysSinceLastPurchase: 15,
          expectedNextPurchaseDate: new Date(),
          potentialRevenue: c.avgOrderValue || 4000,
        })),
      });
    }
  } catch (err) {
    console.warn("[OpportunityEngine] VIP Upsell scan skipped:", err.message);
  }

  // =========================================================================
  // STRATEGY 4: Discount-Sensitive Shoppers Conversion Push
  // =========================================================================
  try {
    const promoCustomers = await prisma.customer.findMany({
      where: {
        merchantId: safeMerchantId,
        isDiscountSensitive: true,
        isDormant: false,
      },
    });

    if (promoCustomers.length > 0) {
      const customerCount = promoCustomers.length;
      const potentialRevenue = Math.round(
        promoCustomers.reduce((sum, c) => {
          const baseSpend = c.avgOrderValue > 0 ? c.avgOrderValue : (c.totalSpend > 0 ? c.totalSpend / Math.max(1, c.totalOrders) : 2000);
          return sum + baseSpend * 0.85;
        }, 0) * 100
      ) / 100;

      allOpportunities.push({
        id: "cross_sell",
        opportunityType: "cross_sell",
        productId: 0,
        productName: "Targeted Flash Promotion for Discount Shoppers",
        catalogAvgCycleDays: 45,
        customerCount,
        potentialRevenue: Math.max(potentialRevenue, 4000),
        confidence: 0.84,
        priority: customerCount >= 8 ? "high" : "medium",
        recommendedAction: `Activate ${customerCount} price-sensitive shopper${customerCount === 1 ? "" : "s"} with a time-limited margin-safe discount.`,
        customers: promoCustomers.map((c) => ({
          customerId: c.id,
          customerName: c.name,
          daysSinceLastPurchase: 30,
          expectedNextPurchaseDate: new Date(),
          potentialRevenue: c.avgOrderValue || 2000,
        })),
      });
    }
  } catch (err) {
    console.warn("[OpportunityEngine] Discount-sensitive scan skipped:", err.message);
  }

  // =========================================================================
  // RANK OPPORTUNITIES: Highest Potential Revenue First
  // =========================================================================
  allOpportunities.sort((a, b) => {
    if (b.potentialRevenue !== a.potentialRevenue) {
      return b.potentialRevenue - a.potentialRevenue;
    }
    return b.customerCount - a.customerCount;
  });

  return allOpportunities;
}