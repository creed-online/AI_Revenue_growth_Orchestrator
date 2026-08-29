import express from "express";
import { scanReplenishmentOpportunities } from "../services/opportunityEngine.js";
import { simulateCampaign } from "../services/campaignSimulator.js";
import { resolveMerchantId } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/opportunities
 * Returns a ranked list of replenishment, reactivation, upsell, and promo opportunities
 * with optional type & priority filtering, and high-level summary metrics.
 */
router.get("/", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { type, priority, limit } = req.query;

    let opportunities = await scanReplenishmentOpportunities(merchantId);

    // Calculate aggregated summary statistics across all opportunities
    const totalPotentialRevenue = Math.round(
      opportunities.reduce((sum, o) => sum + Number(o.potentialRevenue || 0), 0) * 100
    ) / 100;

    const summary = {
      totalCount: opportunities.length,
      totalPotentialRevenue,
      replenishmentCount: opportunities.filter((o) => o.opportunityType === "replenishment").length,
      reactivationCount: opportunities.filter((o) => o.opportunityType === "reactivation").length,
      upsellCount: opportunities.filter((o) => o.opportunityType === "upsell").length,
      promoCount: opportunities.filter((o) => o.opportunityType === "cross_sell").length,
      highPriorityCount: opportunities.filter((o) => o.priority === "high").length,
    };

    // Apply type filter if provided
    if (type && type !== "ALL") {
      opportunities = opportunities.filter(
        (o) => o.opportunityType?.toLowerCase() === String(type).toLowerCase()
      );
    }

    // Apply priority filter if provided
    if (priority && priority !== "ALL") {
      opportunities = opportunities.filter(
        (o) => o.priority?.toLowerCase() === String(priority).toLowerCase()
      );
    }

    // Apply limit if provided
    if (limit && !isNaN(Number(limit))) {
      opportunities = opportunities.slice(0, Number(limit));
    }

    res.json({
      merchantId,
      count: opportunities.length,
      summary,
      opportunities,
    });
  } catch (error) {
    console.error("Error scanning opportunities:", error);
    res.status(500).json({ error: "Failed to scan opportunities", message: error.message });
  }
});

/**
 * GET /api/opportunities/:productId
 * Single opportunity lookup by id, productId, or array index
 */
router.get("/:productId", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const param = String(req.params.productId);
    const opportunities = await scanReplenishmentOpportunities(merchantId);

    // Look up by exact id or string productId match or type match
    let index = opportunities.findIndex(
      (o) => String(o.id) === param || String(o.productId) === param || o.opportunityType === param
    );

    // Fallback: lookup by array index if numeric
    if (index < 0 && !isNaN(Number(param))) {
      const num = Number(param);
      if (num >= 0 && num < opportunities.length) {
        index = num;
      }
    }

    if (index < 0) {
      return res.status(404).json({ error: "not_found", message: `Opportunity '${param}' not found.` });
    }

    const opportunity = opportunities[index];

    res.json({
      merchantId,
      index,
      opportunity,
    });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    res.status(500).json({ error: "Failed to fetch opportunity", message: error.message });
  }
});

/**
 * POST /api/opportunities/:productId/simulate
 * Run campaign discount simulation on a specific opportunity
 */
router.post("/:productId/simulate", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const param = String(req.params.productId);
    const opportunities = await scanReplenishmentOpportunities(merchantId);

    let index = opportunities.findIndex(
      (o) => String(o.id) === param || String(o.productId) === param || o.opportunityType === param
    );
    if (index < 0 && !isNaN(Number(param))) {
      const num = Number(param);
      if (num >= 0 && num < opportunities.length) index = num;
    }

    if (index < 0) {
      return res.status(404).json({ error: "not_found", message: `Opportunity '${param}' not found.` });
    }

    const opportunity = opportunities[index];
    const audience = opportunity.customers || [];
    const simulationResult = simulateCampaign({ opportunity, audience });

    res.json({
      merchantId,
      opportunityId: param,
      simulation: simulationResult,
    });
  } catch (error) {
    console.error("Error simulating opportunity campaign:", error);
    res.status(500).json({ error: "Failed to simulate opportunity", message: error.message });
  }
});

export default router;
