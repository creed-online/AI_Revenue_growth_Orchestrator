import { prisma } from '../lib/prisma.js';
import { measureCampaignResults, getCampaignResults } from '../services/campaignService.js';

async function testHonestMeasurement() {
  console.log("===============================================================");
  console.log("📊 TESTING 100% HONEST DATA-DRIVEN CAMPAIGN ROI MEASUREMENT");
  console.log("===============================================================\n");

  const campaign = await prisma.campaign.findFirst({
    where: { status: { in: ["running", "completed"] }, orders: { some: {} } },
    include: { orders: true, notifications: true },
    orderBy: { id: "desc" },
  });

  if (!campaign) {
    console.error("❌ No campaign with attributed orders found.");
    process.exit(1);
  }

  console.log(`1. Target Campaign: #${campaign.id} ("${campaign.name}")`);
  console.log(`  → Total Attributed Orders in DB: ${campaign.orders.length}`);

  console.log("\n2. Measuring Campaign Results (POST /api/campaigns/:id/measure)...");
  const measureResp = await fetch(`http://localhost:3000/api/campaigns/${campaign.id}/measure`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-demo-mode": "true" },
  });

  const payload = await measureResp.json();
  console.log("  → Response Status:", measureResp.status);
  console.log("  → Funnel Metrics:", payload.funnel);
  console.log("  → Actual Financials:", payload.actual);
  console.log("  → Delta (Actual vs Predicted):", payload.delta);
  console.log("  → Attributed Orders Count in Payload:", payload.attributedOrders?.length);

  console.log("\n3. Verifying Mathematical Accuracy Against Raw PostgreSQL Rows...");
  const rawOrders = await prisma.order.findMany({
    where: { campaignId: campaign.id },
  });

  const rawGrossRevenue = rawOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const rawDiscountBurn = rawOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const rawConversions = new Set(rawOrders.map((o) => o.customerId)).size;

  console.log(`  → Raw DB Gross Revenue: ₹${rawGrossRevenue.toFixed(2)} vs Payload Revenue: ₹${payload.actual.revenue}`);
  console.log(`  → Raw DB Discount Burn: ₹${rawDiscountBurn.toFixed(2)} vs Payload Discount: ₹${payload.actual.discountCost}`);
  console.log(`  → Raw DB Unique Conversions: ${rawConversions} vs Payload Conversions: ${payload.actual.conversions}`);

  const revenueMatches = Math.abs(rawGrossRevenue - payload.actual.revenue) < 0.05;
  const discountMatches = Math.abs(rawDiscountBurn - payload.actual.discountCost) < 0.05;
  const conversionsMatch = rawConversions === payload.actual.conversions;
  const funnelValid = payload.funnel.conversions === rawConversions;

  console.log("\nAssertions:");
  console.log("  → Exact match on Gross Revenue:", revenueMatches);
  console.log("  → Exact match on Discount Burn:", discountMatches);
  console.log("  → Exact match on Conversions:", conversionsMatch);
  console.log("  → Funnel reflects real conversions:", funnelValid);

  if (revenueMatches && discountMatches && conversionsMatch && funnelValid) {
    console.log("\n✅ 100% HONEST DATA-DRIVEN ROI MEASUREMENT VERIFIED! 🚀");
  } else {
    console.error("\n❌ MEASUREMENT ACCURACY ASSERTIONS FAILED.");
    process.exit(1);
  }
}

testHonestMeasurement()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

