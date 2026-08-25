import { prisma } from "../lib/prisma.js";

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * List campaigns for a merchant (newest first).
 */
export async function listCampaigns(merchantId = 1, status) {
  return prisma.campaign.findMany({
    where: {
      merchantId: Number(merchantId),
      ...(status ? { status } : {}),
    },
    include: {
      variants: true,
      approvalRequests: { orderBy: { requestedAt: "desc" }, take: 1 },
      results: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single campaign with variants, approvals, results, notifications.
 */
export async function getCampaignById(campaignId) {
  return prisma.campaign.findUnique({
    where: { id: Number(campaignId) },
    include: {
      variants: true,
      approvalRequests: { orderBy: { requestedAt: "desc" } },
      results: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 20 },
    },
  });
}

/**
 * Simulate / measure campaign outcomes (predicted vs actual).
 * Idempotent: returns existing CampaignResult if already measured.
 */
export async function measureCampaignResults(campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: Number(campaignId) },
    include: {
      variants: true,
      results: { orderBy: { createdAt: "desc" }, take: 1 },
      notifications: true,
    },
  });

  if (!campaign) return { error: "not_found" };

  if (!["running", "completed"].includes(campaign.status)) {
    return {
      error: "not_ready",
      status: campaign.status,
      message: "Campaign must be running (executed) before results can be measured.",
    };
  }

  if (campaign.results?.length) {
    return buildResultsPayload(campaign, campaign.results[0]);
  }

  const chosen =
    campaign.variants.find((v) => v.discountValue === campaign.offerValue) ||
    campaign.variants[0];

  const audienceSize = Math.max(campaign.audienceSize || 0, 1);
  const predictedConversion = Number(chosen?.expectedConversion ?? 0.1);
  const predictedRevenue = Number(chosen?.expectedRevenue ?? campaign.expectedRevenue ?? 0);
  const predictedDiscountCost = Number(chosen?.expectedCost ?? campaign.expectedCost ?? 0);
  const predictedCampaignCost = roundMoney(audienceSize * (campaign.offerValue > 0 ? 6 : 2));
  const predictedNet = Number(
    chosen?.expectedNetRevenue ?? predictedRevenue - predictedDiscountCost - predictedCampaignCost
  );
  const predictedRoi =
    predictedDiscountCost + predictedCampaignCost > 0
      ? roundMoney(predictedNet / (predictedDiscountCost + predictedCampaignCost))
      : predictedNet > 0
        ? 9.99
        : 0;

  // Simulated actuals: slight variance around prediction (demo-friendly)
  const seed = campaign.id * 17 + audienceSize;
  const variance = 0.82 + ((seed % 37) / 100); // ~0.82 – 1.18
  const reachRate = clamp(0.88 + ((seed % 10) / 100), 0.75, 0.98);
  const reach = Math.round(audienceSize * reachRate);
  const actualConversion = clamp(predictedConversion * variance, 0.02, 0.75);
  const conversions = Math.max(1, Math.round(reach * actualConversion));
  const aov =
    predictedRevenue > 0 && predictedConversion > 0
      ? predictedRevenue / (audienceSize * predictedConversion)
      : 500;
  const revenue = roundMoney(conversions * aov);
  const discountCost = roundMoney(revenue * ((Number(campaign.offerValue) || 0) / 100));
  const campaignCost = roundMoney(
    (campaign.notifications?.length || reach) * (campaign.offerValue > 0 ? 5.5 : 2)
  );
  const netRevenue = roundMoney(revenue - discountCost - campaignCost);
  const totalCost = discountCost + campaignCost;
  const roi = totalCost > 0 ? roundMoney(netRevenue / totalCost) : netRevenue > 0 ? 9.99 : 0;

  const result = await prisma.campaignResult.create({
    data: {
      campaignId: campaign.id,
      audienceSize,
      reach,
      conversions,
      conversionRate: Number(actualConversion.toFixed(4)),
      revenue,
      campaignCost,
      discountCost,
      netRevenue,
      roi,
    },
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      actualRevenue: revenue,
      actualCost: totalCost,
      actualRoi: roi,
      expectedRoi: predictedRoi,
    },
  });

  await prisma.auditLog.create({
    data: {
      merchantId: campaign.merchantId,
      actor: "system",
      action: "campaign_results_measured",
      entityType: "Campaign",
      entityId: campaign.id,
      inputSummary: `reach=${reach}, conversions=${conversions}, revenue=${revenue}`,
      reason: "Simulated campaign outcomes vs prediction",
      executionResult: JSON.stringify(result),
    },
  });

  const refreshed = await getCampaignById(campaign.id);
  return buildResultsPayload(refreshed, result);
}

function buildResultsPayload(campaign, result) {
  const chosen =
    campaign.variants?.find((v) => v.discountValue === campaign.offerValue) ||
    campaign.variants?.[0];

  const predictedRevenue = Number(chosen?.expectedRevenue ?? campaign.expectedRevenue ?? 0);
  const predictedCost = Number(chosen?.expectedCost ?? campaign.expectedCost ?? 0);
  const predictedCampaignCost = roundMoney(
    (campaign.audienceSize || 0) * ((campaign.offerValue || 0) > 0 ? 6 : 2)
  );
  const predictedNet = Number(
    chosen?.expectedNetRevenue ?? predictedRevenue - predictedCost - predictedCampaignCost
  );
  const predictedRoi =
    campaign.expectedRoi ??
    (predictedCost + predictedCampaignCost > 0
      ? roundMoney(predictedNet / (predictedCost + predictedCampaignCost))
      : 0);

  return {
    campaign,
    predicted: {
      audienceSize: campaign.audienceSize,
      conversionRate: Number(chosen?.expectedConversion ?? 0),
      revenue: predictedRevenue,
      discountCost: predictedCost,
      campaignCost: predictedCampaignCost,
      netRevenue: predictedNet,
      roi: predictedRoi,
      offerValue: campaign.offerValue,
    },
    actual: result
      ? {
          audienceSize: result.audienceSize,
          reach: result.reach,
          conversions: result.conversions,
          conversionRate: result.conversionRate,
          revenue: result.revenue,
          discountCost: result.discountCost,
          campaignCost: result.campaignCost,
          netRevenue: result.netRevenue,
          roi: result.roi,
        }
      : null,
    delta: result
      ? {
          revenue: roundMoney(result.revenue - predictedRevenue),
          netRevenue: roundMoney(result.netRevenue - predictedNet),
          roi: roundMoney(result.roi - predictedRoi),
          conversionRate: Number((result.conversionRate - (chosen?.expectedConversion ?? 0)).toFixed(4)),
        }
      : null,
  };
}

/**
 * Get predicted vs actual without re-measuring.
 */
export async function getCampaignResults(campaignId) {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { error: "not_found" };

  const latest = campaign.results?.[0] || null;
  return buildResultsPayload(campaign, latest);
}

export default {
  listCampaigns,
  getCampaignById,
  measureCampaignResults,
  getCampaignResults,
};
