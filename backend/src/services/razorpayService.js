// src/services/razorpayService.js
import Razorpay from "razorpay";
import { prisma } from "../lib/prisma.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Executes an already-APPROVED campaign: creates real Razorpay test-mode
 * order(s), flips Campaign.status approved -> running, stamps executedAt,
 * and writes an AuditLog entry. This is a separate human-triggered action
 * from approval — a campaign can sit "approved" for a while before someone
 * clicks execute.
 */
export async function executeCampaign(campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: Number(campaignId) },
    include: { variants: true },
  });

  if (!campaign) return { error: "not_found" };
  if (campaign.status !== "approved") {
    return { error: "not_approved", status: campaign.status, message: "Campaign must be approved before execution" };
  }

  // pick the variant matching the chosen offer (offerValue holds the chosen discount %)
  const chosenVariant = campaign.variants.find((v) => v.discountValue === campaign.offerValue) || campaign.variants[0];

  // Amounts in Razorpay are in paise (smallest currency unit) — multiply by 100.
  const amountInPaise = Math.round((chosenVariant?.expectedRevenue || campaign.expectedRevenue || 0) * 100);

  if (amountInPaise < 100) {
    return {
      error: "invalid_amount",
      message: `Calculated campaign revenue (${amountInPaise / 100} INR) is below Razorpay minimum of 1.00 INR (100 paise).`,
    };
  }

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `campaign_${campaign.id}_${Date.now()}`,
      notes: {
        campaignId: String(campaign.id),
        productId: String(campaign.merchantId),
        discountPercent: String(campaign.offerValue),
      },
    });
  } catch (err) {
    const errorMsg =
      err?.error?.description ||
      err?.message ||
      (typeof err === "object" ? JSON.stringify(err) : String(err));

    await prisma.auditLog.create({
      data: {
        merchantId: campaign.merchantId,
        actor: "system",
        action: "campaign_execution_failed",
        entityType: "Campaign",
        entityId: campaign.id,
        reason: errorMsg,
      },
    });

    return { error: "razorpay_error", message: errorMsg };
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "running", executedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      merchantId: campaign.merchantId,
      actor: "merchant",
      action: "campaign_executed",
      entityType: "Campaign",
      entityId: campaign.id,
      inputSummary: `Razorpay test order created: ${order.id}, amount=${order.amount / 100} ${order.currency}`,
      executionResult: JSON.stringify(order),
    },
  });

  return { campaign: updatedCampaign, razorpayOrder: order };
}

export default { executeCampaign };