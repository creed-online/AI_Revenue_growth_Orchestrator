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
 * Get a single campaign with variants, approvals, results, notifications, orders.
 */
export async function getCampaignById(campaignId) {
  return prisma.campaign.findUnique({
    where: { id: Number(campaignId) },
    include: {
      variants: true,
      approvalRequests: { orderBy: { requestedAt: "desc" } },
      results: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
      orders: {
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Measures real-world campaign outcomes derived purely from live PostgreSQL database rows.
 * Computes exact audience reach, email opens, link clicks, attributed orders,
 * gross revenue, discount burn, email delivery cost, and honest ROI.
 */
export async function measureCampaignResults(campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: Number(campaignId) },
    include: {
      variants: true,
      results: { orderBy: { createdAt: "desc" } },
      notifications: true,
      orders: {
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      },
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

  const chosen =
    campaign.variants.find((v) => v.discountValue === campaign.offerValue) ||
    campaign.variants[0];

  const audienceSize = Math.max(campaign.audienceSize || 0, 1);
  const predictedConversion = Number(chosen?.expectedConversion ?? 0.1);
  const predictedRevenue = Number(chosen?.expectedRevenue ?? campaign.expectedRevenue ?? 0);
  const predictedDiscountCost = Number(chosen?.expectedCost ?? campaign.expectedCost ?? 0);
  const predictedCampaignCost = roundMoney(audienceSize * 0.50);
  const predictedNet = Number(
    chosen?.expectedNetRevenue ?? predictedRevenue - predictedDiscountCost - predictedCampaignCost
  );
  const predictedRoi =
    predictedDiscountCost + predictedCampaignCost > 0
      ? roundMoney(predictedNet / (predictedDiscountCost + predictedCampaignCost))
      : predictedNet > 0
        ? 9.99
        : 0;

  // 1. Live Funnel Aggregations from PostgreSQL
  const deliveredNotifications = await prisma.notificationSend.findMany({
    where: { campaignId: campaign.id, emailSent: true },
  });

  const deliveredCount = deliveredNotifications.length;
  const reach = deliveredCount > 0 ? deliveredCount : audienceSize;

  const openedCount = deliveredNotifications.filter((n) => n.openedAt !== null).length;
  const clickedCount = deliveredNotifications.filter((n) => n.clickedAt !== null).length;

  // 2. Real Attributed Orders from PostgreSQL
  const attributedOrders = await prisma.order.findMany({
    where: { campaignId: campaign.id },
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  const uniqueConvertedCustomers = new Set(attributedOrders.map((o) => o.customerId));
  const conversions = uniqueConvertedCustomers.size;
  const totalOrdersCount = attributedOrders.length;
  const actualConversionRate = reach > 0 ? Number((conversions / reach).toFixed(4)) : 0.0;

  // 3. Real Financial Calculations
  const revenue = roundMoney(attributedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));
  const discountCost = roundMoney(attributedOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0));
  const campaignCost = roundMoney(reach * 0.50); // ₹0.50 per email dispatched
  const totalCost = roundMoney(discountCost + campaignCost);
  const netRevenue = roundMoney(revenue - totalCost);

  // Honest ROI: 0.0x if no orders placed yet
  const roi =
    revenue === 0
      ? 0.0
      : totalCost > 0
        ? roundMoney(netRevenue / totalCost)
        : netRevenue > 0
          ? 9.99
          : 0.0;

  // 4. Upsert/Save CampaignResult in PostgreSQL
  await prisma.campaignResult.deleteMany({ where: { campaignId: campaign.id } });

  const result = await prisma.campaignResult.create({
    data: {
      campaignId: campaign.id,
      audienceSize,
      reach,
      conversions,
      conversionRate: actualConversionRate,
      revenue,
      campaignCost,
      discountCost,
      netRevenue,
      roi,
    },
  });

  // 5. Update Campaign State
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "completed",
      completedAt: campaign.completedAt || new Date(),
      actualRevenue: revenue,
      actualCost: totalCost,
      actualRoi: roi,
      expectedRoi: predictedRoi,
    },
  });

  // 6. Record AuditLog
  await prisma.auditLog.create({
    data: {
      merchantId: campaign.merchantId,
      actor: "system",
      action: "campaign_results_measured",
      entityType: "Campaign",
      entityId: campaign.id,
      inputSummary: `Measured real results: reach=${reach}, opens=${openedCount}, clicks=${clickedCount}, conversions=${conversions}, orders=${totalOrdersCount}, grossRevenue=₹${revenue}, netRevenue=₹${netRevenue}, roi=${roi}x`,
      reason: "Live database-driven campaign outcome measurement",
      executionResult: JSON.stringify({
        audienceSize,
        reach,
        openedCount,
        clickedCount,
        conversions,
        totalOrdersCount,
        revenue,
        discountCost,
        campaignCost,
        netRevenue,
        roi,
      }),
    },
  });

  const refreshed = await getCampaignById(campaign.id);
  return buildResultsPayload(refreshed, result, {
    openedCount,
    clickedCount,
    attributedOrders,
  });
}

function buildResultsPayload(campaign, result, extras = {}) {
  const chosen =
    campaign.variants?.find((v) => v.discountValue === campaign.offerValue) ||
    campaign.variants?.[0];

  const predictedRevenue = Number(chosen?.expectedRevenue ?? campaign.expectedRevenue ?? 0);
  const predictedCost = Number(chosen?.expectedCost ?? campaign.expectedCost ?? 0);
  const predictedCampaignCost = roundMoney((campaign.audienceSize || 0) * 0.50);
  const predictedNet = Number(
    chosen?.expectedNetRevenue ?? predictedRevenue - predictedCost - predictedCampaignCost
  );
  const predictedRoi =
    campaign.expectedRoi ??
    (predictedCost + predictedCampaignCost > 0
      ? roundMoney(predictedNet / (predictedCost + predictedCampaignCost))
      : 0);

  const notifications = campaign.notifications || [];
  const openedCount = extras.openedCount ?? notifications.filter((n) => n.openedAt !== null).length;
  const clickedCount = extras.clickedCount ?? notifications.filter((n) => n.clickedAt !== null).length;
  const attributedOrders = extras.attributedOrders ?? campaign.orders ?? [];

  return {
    campaign,
    funnel: {
      audienceSize: campaign.audienceSize || result?.audienceSize || 0,
      delivered: result?.reach || notifications.length || 0,
      opened: openedCount,
      clicked: clickedCount,
      conversions: result?.conversions || new Set(attributedOrders.map((o) => o.customerId)).size,
      totalOrders: attributedOrders.length,
      conversionRate: result?.conversionRate || 0,
    },
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
    attributedOrders: attributedOrders.map((o) => ({
      orderId: o.id,
      orderNumber: `ORD-${o.id}`,
      customerId: o.customerId,
      customerName: o.customer?.name || "Customer",
      customerEmail: o.customer?.email || "",
      totalPrice: o.totalAmount,
      discountAmount: o.discountAmount || 0,
      attributionType: o.attributionType || "direct",
      isTestMode: o.isTestMode,
      createdAt: o.createdAt,
      items: (o.items || []).map((it) => ({
        productId: it.productId,
        productName: it.product?.name || "Product Item",
        quantity: it.quantity,
        price: it.price,
      })),
    })),
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

/**
 * Delete a specific campaign and cascade delete its child records.
 */
export async function deleteCampaign(campaignId, merchantId = 1) {
  const id = Number(campaignId);
  const safeMerchantId = Number(merchantId) || 1;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) return { error: "not_found" };
  if (campaign.merchantId !== safeMerchantId) return { error: "forbidden" };

  await prisma.$transaction([
    prisma.notificationSend.deleteMany({ where: { campaignId: id } }),
    prisma.campaignResult.deleteMany({ where: { campaignId: id } }),
    prisma.campaignVariant.deleteMany({ where: { campaignId: id } }),
    prisma.approvalRequest.deleteMany({ where: { campaignId: id } }),
    prisma.auditLog.deleteMany({ where: { entityType: "Campaign", entityId: id } }),
    prisma.campaign.delete({ where: { id } }),
  ]);

  return { success: true, deletedId: id };
}

/**
 * Clear all campaigns and related records for a merchant.
 */
export async function clearAllCampaigns(merchantId = 1) {
  const safeMerchantId = Number(merchantId) || 1;

  const campaigns = await prisma.campaign.findMany({
    where: { merchantId: safeMerchantId },
    select: { id: true },
  });

  const campaignIds = campaigns.map((c) => c.id);

  if (campaignIds.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  await prisma.$transaction([
    prisma.notificationSend.deleteMany({ where: { campaignId: { in: campaignIds } } }),
    prisma.campaignResult.deleteMany({ where: { campaignId: { in: campaignIds } } }),
    prisma.campaignVariant.deleteMany({ where: { campaignId: { in: campaignIds } } }),
    prisma.approvalRequest.deleteMany({ where: { campaignId: { in: campaignIds } } }),
    prisma.auditLog.deleteMany({ where: { entityType: "Campaign", entityId: { in: campaignIds } } }),
    prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } }),
  ]);

  return { success: true, deletedCount: campaignIds.length };
}

export default {
  listCampaigns,
  getCampaignById,
  measureCampaignResults,
  getCampaignResults,
  deleteCampaign,
  clearAllCampaigns,
};
