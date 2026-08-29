/**
 * attributionService.js
 * Multi-touch and time-window campaign attribution engine.
 * Matches orders from manual CSV imports, Shopify/eCommerce store syncs,
 * or direct checkouts against active marketing campaigns within a 14-day window.
 */

import { prisma } from "../lib/prisma.js";

const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 14;

/**
 * Evaluates a single order against all active/running campaigns for a merchant
 * and attributes the order if the customer was targeted within the attribution window.
 */
export async function attributeSingleOrder(orderId, windowDays = DEFAULT_ATTRIBUTION_WINDOW_DAYS) {
  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  if (!order) return { error: "order_not_found" };
  if (order.campaignId) {
    return { status: "already_attributed", campaignId: order.campaignId, attributionType: order.attributionType };
  }

  const merchantId = order.customer?.merchantId || 1;
  const orderDate = new Date(order.createdAt);
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const windowStartDate = new Date(orderDate.getTime() - windowMs);

  // 1. Check if there was a direct notification sent to this customer recently
  const recentNotification = await prisma.notificationSend.findFirst({
    where: {
      customerId: order.customerId,
      sentAt: { gte: windowStartDate, lte: orderDate },
      campaign: { merchantId, status: { in: ["running", "completed"] } },
    },
    include: { campaign: true },
    orderBy: { sentAt: "desc" },
  });

  let matchedCampaign = recentNotification?.campaign || null;
  let attributionType = recentNotification ? "email_window" : null;

  // 2. Fallback: Check active campaigns whose stored audience includes this customer
  if (!matchedCampaign) {
    const runningCampaigns = await prisma.campaign.findMany({
      where: {
        merchantId,
        status: { in: ["running", "completed"] },
        executedAt: { gte: windowStartDate, lte: orderDate },
      },
      orderBy: { executedAt: "desc" },
    });

    for (const camp of runningCampaigns) {
      const audienceIds = Array.isArray(camp.customerIds) ? camp.customerIds.map(Number) : [];
      if (audienceIds.includes(order.customerId)) {
        matchedCampaign = camp;
        attributionType = "audience_window";
        break;
      }
    }
  }

  if (!matchedCampaign) {
    return { status: "unattributed", orderId: order.id, reason: "no_matching_campaign_in_window" };
  }

  // Calculate campaign discount if applicable
  const discountPercent = matchedCampaign.offerValue || 0;
  const calculatedDiscount = discountPercent > 0 ? Math.round(order.totalAmount * (discountPercent / 100) * 100) / 100 : 0;

  // Update the Order with the attributed campaign
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      campaignId: matchedCampaign.id,
      attributionType,
      discountAmount: order.discountAmount > 0 ? order.discountAmount : calculatedDiscount,
    },
  });

  // Record AuditLog
  await prisma.auditLog.create({
    data: {
      merchantId,
      actor: "system",
      action: "order_window_attributed",
      entityType: "Order",
      entityId: order.id,
      inputSummary: `Order #${order.id} (₹${order.totalAmount.toFixed(2)}) attributed to Campaign #${matchedCampaign.id} ("${matchedCampaign.name}") via ${windowDays}-day ${attributionType}`,
      executionResult: JSON.stringify({
        orderId: order.id,
        campaignId: matchedCampaign.id,
        attributionType,
        orderDate,
        campaignExecutedAt: matchedCampaign.executedAt,
      }),
    },
  });

  console.log(`[Attribution Engine] Order #${order.id} matched to Campaign #${matchedCampaign.id} via ${attributionType}`);

  return {
    status: "attributed",
    orderId: updatedOrder.id,
    campaignId: matchedCampaign.id,
    campaignName: matchedCampaign.name,
    attributionType,
    discountAmount: updatedOrder.discountAmount,
  };
}

/**
 * Scans all unattributed orders for a merchant and runs time-window attribution.
 * Used after CSV imports or recurring reconciliation cron jobs.
 */
export async function attributeUnattributedOrders(merchantId = 1, windowDays = DEFAULT_ATTRIBUTION_WINDOW_DAYS) {
  const unattributedOrders = await prisma.order.findMany({
    where: {
      campaignId: null,
      customer: { merchantId: Number(merchantId) },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`[Attribution Engine] Scanning ${unattributedOrders.length} unattributed orders for Merchant #${merchantId}...`);

  const results = [];
  for (const o of unattributedOrders) {
    const result = await attributeSingleOrder(o.id, windowDays);
    if (result.status === "attributed") {
      results.push(result);
    }
  }

  console.log(`[Attribution Engine] Successfully attributed ${results.length} orders across active campaigns.`);
  return {
    scannedCount: unattributedOrders.length,
    attributedCount: results.length,
    attributions: results,
  };
}

export default {
  attributeSingleOrder,
  attributeUnattributedOrders,
};

