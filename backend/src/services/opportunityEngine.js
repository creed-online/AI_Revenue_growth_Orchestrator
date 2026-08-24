import { findDueReplenishmentOpportunities } from "./replenishment-intervalService.js";

/**
 * Scans all due replenishment entries for a merchant and groups them into
 * ranked, product-level "opportunities" — matching the shape described in
 * the PRD (Section 14.4): opportunity_type, customer_count,
 * potential_revenue, confidence, priority, recommended_action.
 *
 * @param {number} merchantId
 * @returns {Promise<Array<object>>} ranked list of opportunities
 */
export async function scanReplenishmentOpportunities(merchantId) {
  // 1. Get every individual customer+product "due" entry (already built
  //    on Day 3 — this reuses that logic, doesn't duplicate it).
  const dueEntries = await findDueReplenishmentOpportunities(merchantId);

  if (dueEntries.length === 0) {
    return [];
  }

  // 2. Group entries by productId — one opportunity per product.
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

  // 3. For each product group, calculate opportunity-level metrics.
  const opportunities = [];

  for (const group of byProduct.values()) {
    const { productId, productName, catalogAvgCycleDays, customers } = group;

    const customerCount = customers.length;

    // --- Potential revenue ---
    // Sum of each due customer's own potentialRevenue for this product
    // (computed in the interval service as productPrice × purchaseCount —
    // their historical spend pattern on this item).
    const potentialRevenue = Math.round(
      customers.reduce((sum, c) => sum + (c.potentialRevenue ?? 0), 0) * 100
    ) / 100;

    // --- Confidence ---
    // Higher confidence when:
    //   - more customers are in the group (larger sample = more reliable signal)
    //   - their individual avgIntervalDays cluster tightly around the
    //     catalog's expected cycle (consistent behaviour = more predictable)
    const cycleDeviations = customers.map((c) => {
      if (!catalogAvgCycleDays) return 1; // no baseline to compare against
      return Math.abs(c.avgIntervalDays - catalogAvgCycleDays) / catalogAvgCycleDays;
    });
    const avgDeviation =
      cycleDeviations.reduce((sum, d) => sum + d, 0) / cycleDeviations.length;

    // Deviation of 0 -> confidence near 1; deviation of 1+ (100% off) -> confidence near 0.3 floor
    const consistencyScore = Math.max(0.3, 1 - avgDeviation);
    const sampleSizeBoost = Math.min(0.15, customerCount * 0.01); // small boost for larger groups, capped
    const confidence = Math.min(0.98, Math.round((consistencyScore + sampleSizeBoost) * 100) / 100);

    // --- Priority ---
    // Simple tiering based on customer count + confidence combined.
    // (A fuller expected-value formula comes later once revenue data is real —
    // see PRD Section 15 for the eventual formula.)
    const priorityScore = customerCount * confidence;
    let priority = "low";
    if (priorityScore >= 15) priority = "high";
    else if (priorityScore >= 6) priority = "medium";

    opportunities.push({
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

  // 4. Rank opportunities — highest potential revenue first, tie-broken
  //    by customer count.
  opportunities.sort((a, b) => {
    if (b.potentialRevenue !== a.potentialRevenue) {
      return b.potentialRevenue - a.potentialRevenue;
    }
    return b.customerCount - a.customerCount;
  });

  return opportunities;
}