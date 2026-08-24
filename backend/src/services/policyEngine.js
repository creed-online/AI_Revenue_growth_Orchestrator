import { prisma } from "../lib/prisma.js";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIdList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toNumber(entry, Number.NaN))
      .filter((id) => Number.isFinite(id));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => toNumber(entry, Number.NaN))
      .filter((id) => Number.isFinite(id));
  }

  return [];
}

function pickFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

async function ensureDefaultPolicy(merchantId) {
  const safeMerchantId = toNumber(merchantId, 1);

  const merchant = await prisma.merchant.findUnique({
    where: { id: safeMerchantId },
  });

  if (!merchant) {
    return {
      merchantId: safeMerchantId,
      maxDiscount: 10,
      maxCampaignAudience: 500,
      maxCampaignBudget: 25000,
      maxCampaignsPerCustomerPerMonth: 2,
      requireApproval: true,
      optOutCustomerIds: [],
      optOutProductIds: [],
    };
  }

  let policy = await prisma.policy.findFirst({
    where: { merchantId: safeMerchantId },
  });

  if (!policy) {
    policy = await prisma.policy.create({
      data: {
        merchantId: safeMerchantId,
        maxDiscount: 10,
        maxCampaignAudience: 500,
        maxCampaignBudget: 25000,
        maxCampaignsPerCustomerPerMonth: 2,
        requireApproval: true,
        optOutCustomerIds: [],
        optOutProductIds: [],
      },
    });
  }

  return policy;
}

export async function getMerchantPolicy(merchantId) {
  const safeMerchantId = toNumber(merchantId, 1);
  return ensureDefaultPolicy(safeMerchantId);
}

export async function validateCampaignPolicy(proposal = {}, policyOverride = null) {
  const merchantId = toNumber(
    pickFirstDefined(proposal.merchantId, proposal.merchantID, 1),
    1
  );

  const policy = policyOverride ?? (await ensureDefaultPolicy(merchantId));

  const discountPercent = toNumber(
    pickFirstDefined(proposal.discountPercent, proposal.offerValue, 0),
    0
  );
  const audienceSize = toNumber(
    pickFirstDefined(
      proposal.audienceSize,
      proposal.customerCount,
      proposal.targetAudienceSize,
      0
    ),
    0
  );
  const budget = toNumber(
    pickFirstDefined(
      proposal.budget,
      proposal.expectedBudget,
      proposal.maxBudget,
      proposal.estimatedBudget,
      0
    ),
    0
  );

  const customerIds = normalizeIdList(
    pickFirstDefined(
      proposal.customerIds,
      proposal.targetCustomerIds,
      Array.isArray(proposal.audience)
        ? proposal.audience.map((entry) => entry?.customerId ?? entry?.id)
        : [],
      []
    )
  );

  const productIds = normalizeIdList(
    pickFirstDefined(
      proposal.productIds,
      proposal.targetProductIds,
      proposal.productId ? [proposal.productId] : [],
      []
    )
  );

  const policyOptOutCustomers = normalizeIdList(
    pickFirstDefined(policy.optOutCustomerIds, [])
  );
  const policyOptOutProducts = normalizeIdList(
    pickFirstDefined(policy.optOutProductIds, [])
  );

  const excludedCustomerIds = normalizeIdList(
    pickFirstDefined(proposal.excludedCustomerIds, proposal.optOutCustomerIds, [])
  );
  const excludedProductIds = normalizeIdList(
    pickFirstDefined(proposal.excludedProductIds, proposal.optOutProductIds, [])
  );

  const violations = [];

  if (discountPercent > toNumber(policy.maxDiscount, 15)) {
    violations.push(
      `discountPercent ${discountPercent} exceeds maxDiscount ${toNumber(policy.maxDiscount, 15)}`
    );
  }

  if (audienceSize > toNumber(policy.maxCampaignAudience, 5000)) {
    violations.push(
      `audienceSize ${audienceSize} exceeds maxCampaignAudience ${toNumber(policy.maxCampaignAudience, 5000)}`
    );
  }

  if (budget > toNumber(policy.maxCampaignBudget, 20000)) {
    violations.push(
      `budget ${budget} exceeds maxCampaignBudget ${toNumber(policy.maxCampaignBudget, 20000)}`
    );
  }

  const allExcludedCustomers = new Set([...policyOptOutCustomers, ...excludedCustomerIds]);
  const blockedCustomerIds = customerIds.filter((id) => allExcludedCustomers.has(id));
  if (blockedCustomerIds.length > 0) {
    violations.push(
      `customerIds ${blockedCustomerIds.join(", ")} are on the opt-out exclusion list`
    );
  }

  const allExcludedProducts = new Set([...policyOptOutProducts, ...excludedProductIds]);
  const blockedProductIds = productIds.filter((id) => allExcludedProducts.has(id));
  if (blockedProductIds.length > 0) {
    violations.push(
      `productIds ${blockedProductIds.join(", ")} are on the opt-out exclusion list`
    );
  }

  const approved = violations.length === 0;

  return {
    merchantId,
    approved,
    status: approved ? "approved" : "rejected",
    reason: approved
      ? "Campaign is within merchant policy guardrails."
      : "Campaign exceeds the merchant policy guardrails.",
    violations,
    policy: {
      maxDiscount: toNumber(policy.maxDiscount, 15),
      maxCampaignAudience: toNumber(policy.maxCampaignAudience, 5000),
      maxCampaignBudget: toNumber(policy.maxCampaignBudget, 20000),
      optOutCustomerIds: policyOptOutCustomers,
      optOutProductIds: policyOptOutProducts,
    },
  };
}

export default { getMerchantPolicy, validateCampaignPolicy };
