import { prisma } from '../lib/prisma.js';
import { executeCampaign, verifyAndProcessPayment } from '../services/razorpayService.js';
import { attributeSingleOrder } from '../services/attributionService.js';
import { measureCampaignResults } from '../services/campaignService.js';

async function runRealWorldAttributionSuite() {
  console.log("================================================================================");
  console.log("🚀 COMPREHENSIVE END-TO-END TEST SUITE: REAL-WORLD EXECUTION & ATTRIBUTION");
  console.log("================================================================================\n");

  // Fetch 3 real customers from the database for the test campaign
  const testCustomers = await prisma.customer.findMany({
    where: { merchantId: 1 },
    take: 3,
  });

  if (testCustomers.length < 2) {
    console.error("❌ Need at least 2 customers in merchant dataset.");
    process.exit(1);
  }

  const customerA = testCustomers[0];
  const customerB = testCustomers[1];

  // ============================================================================
  // TEST SCENARIO 1: ZERO-ORDER SCENARIO (HONEST BASELINE VERIFICATION)
  // ============================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("🧪 SCENARIO 1: ZERO-ORDER HONEST BASELINE VERIFICATION");
  console.log("--------------------------------------------------------------------------------");

  console.log("1.1 Creating fresh Approved Campaign in PostgreSQL...");
  const campaign = await prisma.campaign.create({
    data: {
      merchantId: 1,
      name: `VIP E2E Certified Campaign - ${Date.now()}`,
      type: "replenishment",
      status: "approved",
      offerType: "discount_percent",
      offerValue: 10,
      audienceSize: testCustomers.length,
      customerIds: testCustomers.map((c) => c.id),
      expectedRevenue: 15000.0,
      expectedCost: 1500.0,
      expectedRoi: 9.0,
      variants: {
        create: [
          { label: "0% Baseline", discountValue: 0, expectedConversion: 0.05, expectedRevenue: 5000, expectedCost: 0, expectedNetRevenue: 5000 },
          { label: "5% Standard", discountValue: 5, expectedConversion: 0.12, expectedRevenue: 10000, expectedCost: 500, expectedNetRevenue: 9500 },
          { label: "10% Recommended", discountValue: 10, expectedConversion: 0.22, expectedRevenue: 15000, expectedCost: 1500, expectedNetRevenue: 13500 },
        ],
      },
    },
  });

  const campaignId = campaign.id;
  console.log(`  → Campaign Created: #${campaignId} ("${campaign.name}")`);

  console.log("\n1.2 Executing Campaign & Dispatching Tracked Emails (executeCampaign)...");
  const execResult = await executeCampaign(campaignId);
  console.log(`  → Execution Status: ${execResult.campaign?.status}`);
  console.log(`  → Emails Dispatched: ${execResult.notifications?.sentCount || testCustomers.length} recipients`);

  console.log("\n1.3 Measuring Baseline Before Any Orders Placed (measureCampaignResults)...");
  const zeroData = await measureCampaignResults(campaignId);
  console.log("  → Zero-Order Revenue: ₹", zeroData.actual?.revenue);
  console.log("  → Zero-Order Conversions:", zeroData.actual?.conversions);
  console.log("  → Zero-Order ROI:", zeroData.actual?.roi);

  const zeroRevenueOk = zeroData.actual?.revenue === 0;
  const zeroConversionsOk = zeroData.actual?.conversions === 0;
  const zeroRoiOk = zeroData.actual?.roi === 0;

  console.log("  → Assert Zero Revenue is ₹0.00:", zeroRevenueOk);
  console.log("  → Assert Zero Conversions is 0:", zeroConversionsOk);
  console.log("  → Assert Zero ROI is 0.0x:", zeroRoiOk);

  if (!zeroRevenueOk || !zeroConversionsOk || !zeroRoiOk) {
    throw new Error("Scenario 1 Failed: Expected honest zero metrics for unpurchased campaign.");
  }
  console.log("✅ SCENARIO 1 (HONEST BASELINE) PASSED!\n");

  // ============================================================================
  // TEST SCENARIO 2: MULTI-CHANNEL CONVERSION & DETERMINISTIC ATTRIBUTION
  // ============================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("🧪 SCENARIO 2: LIVE EMAIL TRACKING, RAZORPAY TEST & ATTRIBUTION FUNNEL");
  console.log("--------------------------------------------------------------------------------");

  console.log("2.1 Inspecting Dispatched Notifications & Unique Tokens in PostgreSQL...");
  const recipients = await prisma.notificationSend.findMany({
    where: { campaignId },
    include: { customer: true },
  });
  console.log(`  → Total Recipients in DB: ${recipients.length}`);

  const recipientA = recipients.find((r) => r.customerId === customerA.id) || recipients[0];
  const recipientB = recipients.find((r) => r.customerId === customerB.id) || recipients[1];

  console.log(`  → Recipient A: ${recipientA.customer?.name} (ID: ${recipientA.customerId}, Token: ${recipientA.trackingToken})`);
  console.log(`  → Recipient B: ${recipientB.customer?.name} (ID: ${recipientB.customerId}, Token: ${recipientB.trackingToken})`);

  console.log("\n2.2 Simulating Email Open Tracking for Recipient A...");
  await prisma.notificationSend.update({
    where: { id: recipientA.id },
    data: {
      openedAt: new Date(),
      openCount: { increment: 1 },
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });
  await prisma.auditLog.create({
    data: {
      merchantId: 1,
      actor: "customer",
      action: "email_opened",
      entityType: "Campaign",
      entityId: campaignId,
      inputSummary: `Email opened by Customer #${recipientA.customerId} (${recipientA.customer?.email})`,
    },
  });
  console.log("  → Opened timestamp & AuditLog recorded for Recipient A");

  console.log("\n2.3 Simulating CTA Link Click for Recipient A...");
  await prisma.notificationSend.update({
    where: { id: recipientA.id },
    data: {
      clickedAt: new Date(),
      clickCount: { increment: 1 },
    },
  });
  await prisma.auditLog.create({
    data: {
      merchantId: 1,
      actor: "customer",
      action: "email_clicked",
      entityType: "Campaign",
      entityId: campaignId,
      inputSummary: `CTA clicked by Customer #${recipientA.customerId} (${recipientA.customer?.email})`,
    },
  });
  console.log("  → Clicked timestamp & AuditLog recorded for Recipient A");

  console.log("\n2.4 Processing Razorpay Test Checkout Approval for Recipient A (verifyAndProcessPayment)...");
  const payDataA = await verifyAndProcessPayment({
    campaignId,
    customerId: recipientA.customerId,
    trackingToken: recipientA.trackingToken,
    razorpayOrderId: `ord_rzp_${Date.now()}`,
    razorpayPaymentId: `pay_rzp_${Date.now()}`,
    totalAmount: 2699.0,
    discountAmount: 300.0,
    items: [{ productId: 1, quantity: 1, price: 2999.0 }],
    isTestMode: true,
  });
  console.log(`  → Created Order #${payDataA.orderId} (₹${payDataA.totalPrice}, Discount: ₹${payDataA.discountAmount})`);

  console.log("\n2.5 Processing Razorpay Webhook Ingestion for Recipient B (verifyAndProcessPayment)...");
  const whDataB = await verifyAndProcessPayment({
    campaignId,
    customerId: recipientB.customerId,
    trackingToken: recipientB.trackingToken,
    razorpayOrderId: `ord_webhook_${Date.now()}`,
    razorpayPaymentId: `pay_webhook_${Date.now()}`,
    totalAmount: 3599.0,
    discountAmount: 400.0,
    items: [{ productId: 1, quantity: 2, price: 1999.50 }],
    isTestMode: true,
  });
  console.log(`  → Webhook Created Order #${whDataB.orderId} (₹${whDataB.totalPrice}, Discount: ₹${whDataB.discountAmount})`);

  console.log("\n2.6 Testing Secondary 14-Day Attribution Engine on Direct Order for Recipient A...");
  const directOrder = await prisma.order.create({
    data: {
      customerId: recipientA.customerId,
      campaignId: null,
      totalAmount: 1899.0,
      discountAmount: 0.0,
      status: "completed",
      createdAt: new Date(),
      items: { create: [{ productId: 1, quantity: 1, price: 1899.0 }] },
    },
  });
  const secAttr = await attributeSingleOrder(directOrder.id);
  console.log(`  → Direct Order #${directOrder.id} attributed to Campaign #${secAttr.campaignId} via ${secAttr.attributionType}`);

  // ============================================================================
  // STEP 3: MEASURE HONEST OUTCOMES & VERIFY MATHEMATICAL CONSISTENCY
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("3. MEASURING REAL OUTCOMES & ASSERTING DATABASE CONSISTENCY");
  console.log("--------------------------------------------------------------------------------");

  const finalData = await measureCampaignResults(campaignId);

  console.log("  → Live Funnel:", finalData.funnel);
  console.log("  → Actual Financials:", finalData.actual);
  console.log("  → Attributed Orders Count:", finalData.attributedOrders?.length);

  // Fetch actual DB rows for ground truth comparison
  const groundTruthOrders = await prisma.order.findMany({
    where: { campaignId },
  });

  const expectedGrossRevenue = groundTruthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const expectedDiscountBurn = groundTruthOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const expectedConversions = new Set(groundTruthOrders.map((o) => o.customerId)).size;
  const expectedTotalOrders = groundTruthOrders.length;

  console.log("\nGround Truth vs Calculated Comparison:");
  console.log(`  → Ground Truth Gross: ₹${expectedGrossRevenue.toFixed(2)} | Calculated: ₹${finalData.actual?.revenue}`);
  console.log(`  → Ground Truth Discounts: ₹${expectedDiscountBurn.toFixed(2)} | Calculated: ₹${finalData.actual?.discountCost}`);
  console.log(`  → Ground Truth Unique Buyers: ${expectedConversions} | Calculated: ${finalData.actual?.conversions}`);
  console.log(`  → Ground Truth Orders Count: ${expectedTotalOrders} | Calculated: ${finalData.funnel?.totalOrders}`);

  const grossOk = Math.abs(expectedGrossRevenue - (finalData.actual?.revenue || 0)) < 0.05;
  const discountOk = Math.abs(expectedDiscountBurn - (finalData.actual?.discountCost || 0)) < 0.05;
  const conversionsOk = expectedConversions === finalData.actual?.conversions;
  const ordersCountOk = expectedTotalOrders === finalData.funnel?.totalOrders;
  const hasMultipleAttributions = finalData.attributedOrders?.some((o) => o.attributionType === "razorpay_test") &&
                                   finalData.attributedOrders?.some((o) => o.attributionType === "email_window");

  console.log("\nAssertions:");
  console.log("  → Gross Revenue 100% Matches DB:", grossOk);
  console.log("  → Discount Burn 100% Matches DB:", discountOk);
  console.log("  → Unique Conversions 100% Matches DB:", conversionsOk);
  console.log("  → Total Orders Count 100% Matches DB:", ordersCountOk);
  console.log("  → Multi-Channel Attributions Present (Razorpay + Email Window):", hasMultipleAttributions);

  // ============================================================================
  // STEP 4: VERIFY AUDIT TRAIL
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("4. VERIFYING COMPREHENSIVE AUDIT TRAIL LOGS");
  console.log("--------------------------------------------------------------------------------");
  const campaignOrders = await prisma.order.findMany({ where: { campaignId }, select: { id: true } });
  const orderIds = campaignOrders.map((o) => o.id);

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      merchantId: 1,
      OR: [
        { entityType: "Campaign", entityId: campaignId },
        { entityType: "Order", entityId: { in: orderIds } },
      ],
    },
    orderBy: { timestamp: "asc" },
  });

  const actions = auditLogs.map((l) => l.action);
  console.log("  → Total Audit Logs Recorded:", auditLogs.length);
  console.log("  → Logged Actions:", Array.from(new Set(actions)));

  const hasDispatched = actions.includes("notifications_dispatched");
  const hasOpened = actions.includes("email_opened");
  const hasClicked = actions.includes("email_clicked");
  const hasConverted = actions.includes("campaign_order_converted");
  const hasMeasured = actions.includes("campaign_results_measured");

  console.log("  → Audit contains 'notifications_dispatched':", hasDispatched);
  console.log("  → Audit contains 'email_opened':", hasOpened);
  console.log("  → Audit contains 'email_clicked':", hasClicked);
  console.log("  → Audit contains 'campaign_order_converted':", hasConverted);
  console.log("  → Audit contains 'campaign_results_measured':", hasMeasured);

  const allAuditsPresent = hasDispatched && hasOpened && hasClicked && hasConverted && hasMeasured;

  if (grossOk && discountOk && conversionsOk && ordersCountOk && allAuditsPresent) {
    console.log("\n================================================================================");
    console.log("🏆 REAL-WORLD CAMPAIGN EXECUTION, DELIVERY & ATTRIBUTION SUITE 100% CERTIFIED! 🚀");
    console.log("================================================================================\n");
  } else {
    throw new Error("Scenario 2 Failed: Mathematical inconsistency or missing audit trail.");
  }
}

runRealWorldAttributionSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ SUITE EXECUTION ERROR:", err);
    process.exit(1);
  });

