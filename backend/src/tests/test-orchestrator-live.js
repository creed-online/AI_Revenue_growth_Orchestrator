import { orchestrateCampaign } from "../services/orchestrator.js";

async function testOrchestratorLive() {
  console.log("=== Testing AI Campaign Proposal with Live Dataset ===");

  const t0 = Date.now();
  const result = await orchestrateCampaign({ merchantId: 1, opportunityIndex: 0 });
  const duration = Date.now() - t0;

  console.log(`✔ Orchestrator completed in ${duration}ms!`);
  console.log("AI Proposal Text:", result.aiText);
  console.log("Final Draft Status:", result.finalDraft?.policy?.approved ? "APPROVED" : "REJECTED");
  console.log("Campaign ID created:", result.campaign?.id);
  console.log("Tools Executed:", result.executed?.map((e) => e.tool).join(" -> "));

  if (result.finalDraft) {
    console.log("\n🎉 AI Campaign Proposal Succeeded with Zero Rate Limits!");
    process.exit(0);
  } else {
    console.error("✘ No draft was generated:", result);
    process.exit(1);
  }
}

testOrchestratorLive().catch((err) => {
  console.error("Orchestrator test failed:", err);
  process.exit(1);
});

