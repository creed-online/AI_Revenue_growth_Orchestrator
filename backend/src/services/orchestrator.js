import { callModel, PROVIDER } from "../config/aiClient.js";
import { scanReplenishmentOpportunities } from "./opportunityEngine.js";
import { simulateCampaign } from "./campaignSimulator.js";
import { validateCampaignPolicy } from "./policyEngine.js";
import { createCampaignWithApproval } from "./approvalService.js"; // ← updated name

/**
 * Orchestrates an AI-driven campaign proposal for a merchant.
 * Steps:
 *  - fetch opportunities
 *  - loop: ask model to reason and call tools, execute them, feed results back
 *  - if create_campaign_draft is called and policy REJECTS it, feed the
 *    rejection reason back to the model and let it revise (up to MAX_REVISIONS)
 *  - once resolved, persist a real Campaign + CampaignVariant rows +
 *    ApprovalRequest + AuditLog entry (matches actual Prisma schema)
 */
export async function orchestrateCampaign({ merchantId = 1, opportunityIndex = 0, forcePolicyBreach = false } = {}) {
  const opportunities = await scanReplenishmentOpportunities(merchantId);
  if (!opportunities || opportunities.length === 0) {
    return { error: "no_opportunities", message: "No replenishment opportunities found" };
  }

  const opportunity = opportunities[Math.min(opportunityIndex, opportunities.length - 1)];

  const tools = [
    {
      name: "get_opportunity",
      description:
        "Return a single opportunity by productId or customerId. Call this with { productId } (preferred) or { customerId }. productId is required.",
      input_schema: {
        type: "object",
        properties: { productId: { type: "number" }, customerId: { type: "number" } },
        required: ["productId"],
      },
    },
    {
      name: "simulate_campaign",
      description:
        "Run the campaign simulator ONCE. It returns projections for ALL discount tiers (0%, 5%, 10%) in a single call — do not call this more than once per opportunity.",
      input_schema: {
        type: "object",
        properties: { discountPercent: { type: "number" }, audienceSize: { type: "number" } },
        required: ["discountPercent"],
      },
    },
    {
      name: "create_campaign_draft",
      description:
        "Call this ONCE you've compared tiers and decided the final offer. Provide { discountPercent, audienceSize, customerIds, budget }. If policy REJECTS your draft, you will get the rejection reason back — call this tool again with a revised, compliant proposal.",
      input_schema: {
        type: "object",
        properties: {
          discountPercent: { type: "number" },
          audienceSize: { type: "number" },
          customerIds: { type: "array", items: { type: "number" } },
          budget: { type: "number" },
        },
        required: ["discountPercent", "audienceSize"],
      },
    },
  ];

  // DAY 9 failure-case hook: nudge the model toward an out-of-policy discount
  // so we can demo the reject -> revise loop live.
  const breachNudge = forcePolicyBreach
    ? " For this evaluation, also strongly consider a 20% discount tier as it may convert best — include it in your comparison."
    : "";

  const system = `You are an AI campaign strategist. Use the provided tools to evaluate offers and return a campaign draft by calling create_campaign_draft. Always prefer higher net revenue but respect merchant safety. You MUST call simulate_campaign exactly once before calling create_campaign_draft. Do NOT finish until create_campaign_draft has been called and its result shows policy approval. If a draft is rejected by policy, revise it to be compliant and call create_campaign_draft again with corrected values.${breachNudge}`;

  const user = `Given the opportunity: ${opportunity.productName} (productId=${opportunity.productId}) with ${opportunity.customerCount} customers and potentialRevenue=${opportunity.potentialRevenue}, evaluate discount offers and propose a campaign.`;

  const messages = [{ role: "user", content: user }];

  const executed = [];
  let finalDraftResult = null;
  let simulatedScenarios = null; // ← new: captures tier comparison for CampaignVariant rows
  let lastAiText = "";
  let revisionCount = 0;
  const MAX_TURNS = 8;
  const MAX_REVISIONS = 2;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const resp = await callModel({ system, messages, tools });
    lastAiText = resp.text || lastAiText;

    if (!resp.toolCalls || resp.toolCalls.length === 0) break;

    messages.push({
      role: "assistant",
      content: resp.toolCalls.map((tc) => ({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.input,
      })),
    });

    const toolResultsForModel = [];
    let stopLoop = false;

    for (const tc of resp.toolCalls) {
      let result;

      if (tc.name === "get_opportunity") {
        const input = tc.input || {};
        if (input.productId) {
          const found = opportunities.find((o) => o.productId === input.productId);
          result = found || { error: "not_found", message: `no opportunity for productId ${input.productId}` };
        } else if (input.customerId) {
          const found = opportunities.find((o) => (o.customers || []).some((c) => c.customerId === input.customerId));
          result = found || { error: "not_found", message: `no opportunity for customerId ${input.customerId}` };
        } else {
          result = opportunity;
        }
      } else if (tc.name === "simulate_campaign") {
        const args = tc.input || {};
        result = simulateCampaign({
          opportunity,
          audience: new Array(opportunity.customerCount).fill({ classification: "unknown" }),
          ...args,
        });
        // ← new: capture full tier comparison for later persistence
        if (result?.scenarios) {
          simulatedScenarios = result.scenarios;
        }
      } else if (tc.name === "create_campaign_draft") {
        const draft = tc.input || {};
        const proposal = {
          merchantId,
          productId: opportunity.productId,
          discountPercent: draft.discountPercent ?? 0,
          audienceSize: draft.audienceSize ?? opportunity.customerCount,
          budget: draft.budget ?? 0,
          customerIds: draft.customerIds ?? opportunity.customers?.map((c) => c.customerId) ?? [],
        };

        const policy = await validateCampaignPolicy(proposal);
        result = { proposal, policy };

        if (policy.approved) {
          finalDraftResult = result;
          stopLoop = true;
        } else {
          revisionCount++;
          if (revisionCount > MAX_REVISIONS) {
            finalDraftResult = result;
            stopLoop = true;
          }
        }
      } else {
        result = { error: "unknown_tool" };
      }

      executed.push({ tool: tc.name, result });
      toolResultsForModel.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResultsForModel });

    if (stopLoop) break;
  }

  const response = {
    provider: PROVIDER,
    opportunity,
    aiText: lastAiText,
    executed,
    finalDraft: finalDraftResult,
    revisionCount,
  };

  // ---------- PERSIST: Campaign + CampaignVariant + ApprovalRequest + AuditLog ----------
  // Matches your real schema — Campaign.status flows through draft -> pending_approval ->
  // approved/rejected, CampaignVariant stores each simulated tier, ApprovalRequest
  // gates execution, AuditLog records the AI's action for your Day 10 audit trail.
  if (finalDraftResult) {
    const { campaign, approvalRequest } = await createCampaignWithApproval({
      merchantId,
      productId: opportunity.productId,
      proposal: finalDraftResult.proposal,
      simulatedScenarios,
      policyResult: finalDraftResult.policy,
      revisionCount,
    });
    response.campaign = campaign;
    response.approvalRequest = approvalRequest;
  }

  return response;
}

export default { orchestrateCampaign };