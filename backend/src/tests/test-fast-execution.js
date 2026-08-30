import { executeCampaign } from "../services/razorpayService.js";
import { prisma } from "../lib/prisma.js";

async function testFastExecution() {
  console.log("=== Testing High-Speed Campaign Execution ===");
  
  // Find an approved or create a test campaign
  let campaign = await prisma.campaign.findFirst({
    where: { merchantId: 1, status: "approved" },
  });

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        merchantId: 1,
        name: "High Speed Test Campaign",
        type: "replenishment",
        status: "approved",
        audienceSize: 188,
        offerValue: 10,
        expectedRevenue: 45000,
        customerIds: Array.from({ length: 188 }, (_, i) => i + 1),
      },
    });
  }

  console.log(`Executing Campaign #${campaign.id} with ${campaign.audienceSize} recipients...`);
  const t0 = Date.now();
  const res = await executeCampaign(campaign.id);
  const duration = Date.now() - t0;

  console.log(`✔ Campaign #${campaign.id} executed in ${duration}ms!`);
  console.log(`Status: ${res.campaign?.status}`);
  console.log(`Notifications committed: ${res.notifications?.sentCount}`);

  if (duration < 3000) {
    console.log("🎉 Execution is blazing fast (< 3 seconds)!");
    process.exit(0);
  } else {
    console.warn(`Execution took ${duration}ms`);
    process.exit(0);
  }
}

testFastExecution().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

