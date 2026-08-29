import { renderMarketingEmail } from '../services/emailTemplateEngine.js';

async function testTemplateEngine() {
  console.log("===============================================================");
  console.log("🎨 TESTING RESPONSIVE EMAIL TEMPLATE ENGINE & TRACKING TAGS");
  console.log("===============================================================\n");

  const rendered = renderMarketingEmail({
    customerName: "Priya Sharma",
    subject: "Your VIP 10% Loyalty Benefit is Ready!",
    body: "As one of our highest-tier VIP members, we are unlocking early access and an instant 10% discount on your next order.",
    ctaText: "Unlock VIP Access Now",
    discountPercent: 10,
    productName: "Premium Whey Isolate 1kg",
    trackingToken: "trk_priya_vip_9988",
    merchantName: "RakshFit Nutrition",
  });

  console.log("Generated Promo Code:", rendered.promoCode);
  console.log("Open Tracking URL:", rendered.openTrackingUrl);
  console.log("Click Tracking URL:", rendered.clickTrackingUrl);

  const hasPixel = rendered.html.includes("http://localhost:3000/api/track/open/trk_priya_vip_9988");
  const hasClickUrl = rendered.html.includes("http://localhost:3000/api/track/click/trk_priya_vip_9988");
  const hasCode = rendered.html.includes("SAVE10");
  const hasName = rendered.html.includes("Priya Sharma");

  console.log("\nAssertions:");
  console.log("  → Contains Open Pixel:", hasPixel);
  console.log("  → Contains Click Tracking Link:", hasClickUrl);
  console.log("  → Contains Discount Code:", hasCode);
  console.log("  → Contains Recipient Name:", hasName);

  if (hasPixel && hasClickUrl && hasCode && hasName) {
    console.log("\n✅ RESPONSIVE EMAIL TEMPLATE ENGINE VERIFIED SUCCESSFULLY!");
  } else {
    console.error("\n❌ TEMPLATE ENGINE ASSERTIONS FAILED.");
    process.exit(1);
  }
}

testTemplateEngine().catch(console.error);

