const DISCOUNT_TIERS = [0, 5, 10];

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getClassificationCounts(audience = []) {
  const counts = {
    "no-discount-needed": 0,
    "discount-sensitive": 0,
    "high-price-sensitivity": 0,
    unknown: 0,
  };

  for (const customer of audience) {
    const classification = String(
      customer?.classification ||
        customer?.discountClassification ||
        customer?.status ||
        ""
    )
      .trim()
      .toLowerCase();

    if (classification in counts) {
      counts[classification] += 1;
    } else {
      counts.unknown += 1;
    }
  }

  return counts;
}

export function simulateCampaign({ opportunity = {}, audience = [] } = {}) {
  const safeAudience = Array.isArray(audience) ? audience : [];
  const baseCustomerCount = Number(
    opportunity?.customerCount ??
      opportunity?.targetCustomerCount ??
      safeAudience.length ??
      0
  );

  const audienceSize = Math.max(baseCustomerCount || safeAudience.length || 0, 0);
  const avgOrderValue = Number(
    opportunity?.averageOrderValue ?? opportunity?.avgOrderValue ?? 120
  ) || 120;
  const confidence = clamp(Number(opportunity?.confidence ?? 0.7), 0.1, 0.99);
  const classificationCounts = getClassificationCounts(safeAudience);

  const sensitivityAdjustment =
    (classificationCounts["discount-sensitive"] || 0) * 0.025 +
    (classificationCounts["high-price-sensitivity"] || 0) * 0.05 -
    (classificationCounts["no-discount-needed"] || 0) * 0.015;

  const baseConversion = 0.06 + confidence * 0.14 + sensitivityAdjustment;

  const scenarios = DISCOUNT_TIERS.map((discountPercent) => {
    const tierBoost =
      discountPercent === 0 ? 0 : discountPercent === 5 ? 0.025 : 0.055;
    const expectedConversion = clamp(baseConversion + tierBoost, 0.02, 0.8);
    const expectedRevenue = roundMoney(audienceSize * expectedConversion * avgOrderValue);
    const expectedCost = roundMoney(expectedRevenue * (discountPercent / 100));
    const fixedCampaignCost = roundMoney(
      audienceSize * (discountPercent > 0 ? 6 : 2) + (Number(opportunity?.campaignCost) || 0)
    );
    const netRevenue = roundMoney(expectedRevenue - expectedCost - fixedCampaignCost);

    return {
      discountPercent,
      expectedConversion: Number(expectedConversion.toFixed(4)),
      expectedRevenue,
      expectedCost,
      campaignCost: fixedCampaignCost,
      netRevenue,
    };
  }).sort((a, b) => b.netRevenue - a.netRevenue);

  const recommendedScenario = scenarios[0];

  return {
    opportunityId: opportunity?.productId ?? opportunity?.id ?? null,
    productId: opportunity?.productId ?? null,
    productName: opportunity?.productName ?? "Campaign opportunity",
    customerCount: audienceSize,
    averageOrderValue: roundMoney(avgOrderValue),
    confidence: Number(confidence.toFixed(3)),
    scenarios,
    recommendedTier: recommendedScenario?.discountPercent ?? 0,
    recommendedScenario,
  };
}

export { DISCOUNT_TIERS };
