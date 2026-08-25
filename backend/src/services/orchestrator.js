import { callModel, PROVIDER } from "../config/aiClient.js";
import { scanReplenishmentOpportunities } from "./opportunityEngine.js";
import { simulateCampaign } from "./campaignSimulator.js";
import { validateCampaignPolicy } from "./policyEngine.js";

/**
 * Orchestrates an AI-driven campaign proposal for a merchant.
 * Steps:
 *  - fetch opportunities
 *  - loop: ask model to reason and call tools, execute them, feed results back
 *  - stop once model calls create_campaign_draft (or hits MAX_TURNS)
 *  - run policy validation on final proposal
 */
export async function orchestrateCampaign({ merchantId = 1, opportunityIndex = 0 } = {}) {
  // 1) get opportunities
  const opportunities = await scanReplenishmentOpportunities(merchantId);
  if (!opportunities || opportunities.length === 0) {
    return { error: "no_opportunities", message: "No replenishment opportunities found" };
  }

  const opportunity = opportunities[Math.min(opportunityIndex, opportunities.length - 1)];

  // 2) define tools the model can call
  const tools = [
    {
      name: "get_opportunity",
      description:
        "Return a single opportunity by productId or customerId. Call this with { productId } (preferred) or { customerId } to fetch a matching opportunity from the system. productId is required.",
      input_schema: {
        type: "object",
        properties: { productId: { type: "number" }, customerId: { type: "number" } },
        required: ["productId"],
      },
    },
    {
      name: "simulate_campaign",
      description: "Run campaign simulator for a given discountPercent and audience (returns expected numbers)",
      input_schema: {
        type: "object",
        properties: { discountPercent: { type: "number" }, audienceSize: { type: "number" } },
        required: ["discountPercent"],
      },
    },
    {
      name: "create_campaign_draft",
      description:
        "Call this ONCE you've compared tiers and decided the final offer. Produces the campaign draft that gets policy-checked. Provide { discountPercent, audienceSize, customerIds, budget }. Do not call other tools after this.",
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

  const system = `You are an AI campaign strategist. Use the provided tools to evaluate offers and return a campaign draft by calling create_campaign_draft. Always prefer higher net revenue but respect merchant safety. You MUST call simulate_campaign for each discount tier you consider (0, 5, 10) before calling create_campaign_draft. Do NOT finish until you have called create_campaign_draft. If you need an opportunity, call get_opportunity with { productId } (productId is required).`;

  const user = `Given the opportunity: ${opportunity.productName} (productId=${opportunity.productId}) with ${opportunity.customerCount} customers and potentialRevenue=${opportunity.potentialRevenue}, evaluate 0%,5%,10% discount offers. Use simulate_campaign to test each tier and then call create_campaign_draft with the chosen tier and audience size.`;

  // conversation state — this is what was missing before
  const messages = [{ role: "user", content: user }];

  const executed = [];
  let finalDraftResult = null;
  let lastAiText = "";
  const MAX_TURNS = 6; // safety cap — avoids infinite loops burning API calls

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const resp = await callModel({ system, messages, tools });
    lastAiText = resp.text || lastAiText;

    if (!resp.toolCalls || resp.toolCalls.length === 0) {
      // model replied with plain text instead of a tool call — stop here
      break;
    }

    // record the assistant's tool call(s) in the conversation as a string
    messages.push({
      role: "assistant",
      content: JSON.stringify(
        resp.toolCalls.map((tc) => ({ id: tc.id, name: tc.name, input: tc.input }))
      ),
    });

    const toolResultsForModel = [];
    let draftCalledThisTurn = false;

    for (const tc of resp.toolCalls) {
      let result;

        if (tc.name === "get_opportunity") {
          const input = tc.input || {};
          // prefer productId lookup, fall back to customerId or default opportunity
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
        finalDraftResult = result;
        draftCalledThisTurn = true;
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

    // feed tool results back to the model so it can decide the next step (stringify to satisfy provider schemas)
    messages.push({ role: "user", content: toolResultsForModel.map((r) => JSON.stringify(r)).join("\n") });

    if (draftCalledThisTurn) break;
  }

  return {
    provider: PROVIDER,
    opportunity,
    aiText: lastAiText,
    executed,
    finalDraft: finalDraftResult,
  };
}

export default { orchestrateCampaign };