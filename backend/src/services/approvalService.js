import { prisma } from "../lib/prisma.js";

/**
 * Persists a Campaign, optional CampaignVariants, an ApprovalRequest, and an AuditLog.
 * Called by orchestrator.js once a proposal is reached.
 */
export async function createCampaignWithApproval({
  merchantId = 1,
  productId,
  proposal = {},
  simulatedScenarios = [],
  policyResult = {},
  revisionCount = 0,
}) {
  const isApproved = policyResult.approved === true;

  // 1. Create Campaign
  const campaign = await prisma.campaign.create({
    data: {
      merchantId,
      name: `Replenishment Campaign — Product ${productId ?? "General"}`,
      type: "replenishment",
      status: isApproved ? "pending_approval" : "rejected",
      audienceSize: proposal.audienceSize ?? 0,
      customerIds: proposal.customerIds ?? [],
      offerType: "percentage",
      offerValue: proposal.discountPercent ?? 0,
      expectedRevenue: isApproved
        ? simulatedScenarios?.find((s) => s.discountPercent === proposal.discountPercent)?.expectedRevenue
        : null,
      expectedCost: isApproved
        ? simulatedScenarios?.find((s) => s.discountPercent === proposal.discountPercent)?.expectedCost
        : null,
    },
  });

  // 2. Create CampaignVariants if simulated scenarios exist
  if (simulatedScenarios && Array.isArray(simulatedScenarios) && simulatedScenarios.length > 0) {
    await prisma.campaignVariant.createMany({
      data: simulatedScenarios.map((s) => ({
        campaignId: campaign.id,
        label: `${s.discountPercent}% discount`,
        discountValue: s.discountPercent ?? 0,
        expectedConversion: s.expectedConversion ?? 0,
        expectedRevenue: s.expectedRevenue ?? 0,
        expectedCost: s.expectedCost ?? 0,
        expectedNetRevenue: s.netRevenue ?? 0,
      })),
    });
  }

  // 3. Create ApprovalRequest
  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      campaignId: campaign.id,
      status: isApproved ? "pending" : "rejected",
      reason: isApproved
        ? `AI proposal (after ${revisionCount} revision(s)) passed policy checks.`
        : policyResult.reason || "Policy rejected proposal.",
    },
  });

  // 4. Create AuditLog
  await prisma.auditLog.create({
    data: {
      merchantId,
      actor: "ai",
      action: "campaign_draft_created",
      entityType: "Campaign",
      entityId: campaign.id,
      inputSummary: `productId=${productId}, discount=${proposal.discountPercent}%, audience=${proposal.audienceSize}`,
      reason: isApproved ? "Draft approved by policy engine" : "Draft rejected by policy engine",
      policyResult: JSON.stringify(policyResult),
    },
  });

  return { campaign, approvalRequest };
}

// Alias for backwards compatibility if needed
export const createApprovalRequest = createCampaignWithApproval;

/**
 * List approval requests for a merchant, optionally filtered by status.
 */
export async function listApprovalRequests(merchantId = 1, status) {
  return prisma.approvalRequest.findMany({
    where: {
      campaign: { merchantId: Number(merchantId) },
      ...(status ? { status } : {}),
    },
    include: { campaign: { include: { variants: true } } },
    orderBy: { requestedAt: "desc" },
  });
}

/**
 * Get a single approval request by ID.
 */
export async function getApprovalRequest(id) {
  return prisma.approvalRequest.findUnique({
    where: { id: Number(id) },
    include: { campaign: { include: { variants: true } } },
  });
}

/**
 * Merchant approves a pending request.
 */
export async function approveRequest(id, decidedBy = "merchant") {
  const existing = await prisma.approvalRequest.findUnique({ where: { id: Number(id) } });
  if (!existing) return { error: "not_found" };
  if (existing.status !== "pending") {
    return { error: "already_decided", status: existing.status };
  }

  const [approvalRequest] = await prisma.$transaction([
    prisma.approvalRequest.update({
      where: { id: Number(id) },
      data: { status: "approved", resolvedAt: new Date() },
    }),
    prisma.campaign.update({
      where: { id: existing.campaignId },
      data: { status: "approved", approvedAt: new Date() },
    }),
  ]);

  return approvalRequest;
}

/**
 * Merchant rejects a pending request.
 */
export async function rejectRequest(id, decidedBy = "merchant", reason) {
  const existing = await prisma.approvalRequest.findUnique({ where: { id: Number(id) } });
  if (!existing) return { error: "not_found" };
  if (existing.status !== "pending") {
    return { error: "already_decided", status: existing.status };
  }

  const [approvalRequest] = await prisma.$transaction([
    prisma.approvalRequest.update({
      where: { id: Number(id) },
      data: { status: "rejected", resolvedAt: new Date(), reason: reason ?? existing.reason },
    }),
    prisma.campaign.update({
      where: { id: existing.campaignId },
      data: { status: "rejected" },
    }),
  ]);

  return approvalRequest;
}

export default {
  createCampaignWithApproval,
  createApprovalRequest,
  listApprovalRequests,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
};