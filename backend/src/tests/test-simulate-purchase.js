import { prisma } from '../lib/prisma.js';

async function testSimulatePurchase() {
  console.log("===============================================================");
  console.log("⚡ TESTING 1-CLICK PURCHASE SIMULATION ENDPOINT");
  console.log("===============================================================\n");

  const campaign = await prisma.campaign.findFirst({
    where: { status: "running" },
    orderBy: { id: "desc" },
  });

  if (!campaign) {
    console.error("❌ No running campaign found.");
    process.exit(1);
  }

  console.log(`1. Target Campaign: #${campaign.id} ("${campaign.name}")`);

  console.log("\n2. Calling 1-Click Purchase Simulation (POST /api/track/simulate-purchase)...");
  const resp = await fetch("http://localhost:3000/api/track/simulate-purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignId: campaign.id,
      quantity: 2,
      unitPrice: 1999.0,
    }),
  });

  const data = await resp.json();
  console.log("  → Response Status:", resp.status);
  console.log("  → Sim Data:", data);

  console.log("\n3. Verifying database record in PostgreSQL...");
  const dbOrder = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { campaign: true, customer: true, items: true },
  });

  console.log(`  → Order #${dbOrder.id} created: ₹${dbOrder.totalAmount} (Discount: ₹${dbOrder.discountAmount})`);
  console.log(`  → Attributed Campaign: #${dbOrder.campaignId} ("${dbOrder.campaign?.name}")`);
  console.log(`  → Customer: ${dbOrder.customer?.name} <${dbOrder.customer?.email}>`);
  console.log(`  → Is Test Mode: ${dbOrder.isTestMode}`);

  console.log("\n4. Verifying AuditLog entry...");
  const auditLog = await prisma.auditLog.findFirst({
    where: { action: "campaign_order_converted", entityId: data.orderId },
    orderBy: { timestamp: "desc" },
  });
  console.log(`  → AuditLog found:`, auditLog?.inputSummary);

  const statusOk = resp.status === 200 && data.success === true;
  const isAttributed = dbOrder && dbOrder.campaignId === campaign.id;
  const isTest = dbOrder.isTestMode === true;

  console.log("\nAssertions:");
  console.log("  → Endpoint responded with 200 OK & success:", statusOk);
  console.log("  → Order created and attributed to campaign:", isAttributed);
  console.log("  → Order tagged with isTestMode = true:", isTest);
  console.log("  → AuditLog recorded:", !!auditLog);

  if (statusOk && isAttributed && isTest) {
    console.log("\n✅ 1-CLICK PURCHASE SIMULATION 100% VERIFIED! 🚀");
  } else {
    console.error("\n❌ SIMULATE PURCHASE VERIFICATION FAILED.");
    process.exit(1);
  }
}

testSimulatePurchase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

