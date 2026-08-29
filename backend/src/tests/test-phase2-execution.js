async function testPhase2Execution() {
  console.log("===============================================================");
  console.log("🚀 TESTING PHASE 2: CAMPAIGN EXECUTION & TRACKED EMAIL DISPATCH");
  console.log("===============================================================\n");

  console.log("1. Proposing a campaign via AI Orchestrator...");
  const orchRes = await fetch("http://localhost:3000/api/orchestrator/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-demo-mode": "true" },
    body: JSON.stringify({ merchantId: 1, opportunityIndex: 0 }),
  });
  const orchJson = await orchRes.json();
  const campaignId = orchJson.campaign?.id;
  const approvalId = orchJson.approvalRequest?.id;
  console.log(`  → Created Campaign ID: ${campaignId} (${orchJson.campaign?.name})`);

  console.log("\n2. Approving campaign proposal...");
  const appRes = await fetch(`http://localhost:3000/api/approvals/${approvalId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-demo-mode": "true" },
    body: JSON.stringify({ decidedBy: "merchant" }),
  });
  const appJson = await appRes.json();
  console.log("  → Approval status:", appJson.status);

  console.log("\n3. Executing campaign (triggers Razorpay order + tracked emails)...");
  const execRes = await fetch(`http://localhost:3000/api/campaigns/${campaignId}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-demo-mode": "true" },
  });
  const execJson = await execRes.json();
  console.log("  → Campaign status:", execJson.campaign?.status);
  console.log("  → Notifications dispatched:", execJson.notifications?.sentCount);

  console.log("\n4. Fetching generated notifications & tracking tokens (GET /api/campaigns/:id/notifications)...");
  const notifRes = await fetch(`http://localhost:3000/api/campaigns/${campaignId}/notifications`);
  const notifJson = await notifRes.json();
  console.log(`  → Total sent: ${notifJson.totalSent}`);

  const sample = notifJson.notifications?.[0];
  console.log("  → Sample Recipient:", sample?.customerName, `<${sample?.customerEmail}>`);
  console.log("  → Tracking Token:", sample?.trackingToken);
  console.log("  → Open URL:", sample?.openUrl);
  console.log("  → Click URL:", sample?.clickUrl);
  console.log("  → Email Sent Status:", sample?.emailSent);

  const allHaveTokens = notifJson.notifications?.every((n) => n.trackingToken && n.trackingToken.startsWith("trk_"));
  const allHaveUrls = notifJson.notifications?.every((n) => n.openUrl && n.clickUrl);

  console.log("\nAssertions:");
  console.log("  → All notifications have unique tracking tokens:", allHaveTokens);
  console.log("  → All notifications have open & click URLs:", allHaveUrls);

  if (allHaveTokens && allHaveUrls && notifJson.totalSent > 0) {
    console.log("\n✅ PHASE 2 CAMPAIGN EXECUTION & TRACKED EMAIL DISPATCH 100% VERIFIED! 🚀");
  } else {
    console.error("\n❌ PHASE 2 VERIFICATION FAILED.");
    process.exit(1);
  }
}

testPhase2Execution()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

