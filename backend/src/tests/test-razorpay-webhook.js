import { prisma } from '../lib/prisma.js';

async function testRazorpayWebhook() {
  console.log("===============================================================");
  console.log("⚡ TESTING RAZORPAY WEBHOOK INGESTION & ORDER ATTRIBUTION");
  console.log("===============================================================\n");

  const notification = await prisma.notificationSend.findFirst({
    where: { trackingToken: { not: null } },
    include: { campaign: true, customer: true },
    orderBy: { sentAt: 'desc' },
  });

  if (!notification) {
    console.error("❌ No notification with trackingToken found.");
    process.exit(1);
  }

  console.log(`1. Target Notification: #${notification.id}, Token: ${notification.trackingToken}`);
  console.log(`  → Customer: #${notification.customerId} (${notification.customer?.email})`);
  console.log(`  → Campaign: #${notification.campaignId}`);

  console.log("\n2. Simulating Razorpay Webhook Event (POST /api/track/razorpay-webhook)...");
  const webhookPayload = {
    entity: "event",
    account_id: "acc_demo_test",
    event: "payment.captured",
    contains: ["payment"],
    payload: {
      payment: {
        entity: {
          id: `pay_test_wh_${Date.now()}`,
          order_id: `order_test_wh_${Date.now()}`,
          amount: 349900, // ₹3,499.00 in paise
          currency: "INR",
          status: "captured",
          email: notification.customer?.email || "customer@example.com",
          contact: "+919876543210",
          notes: {
            campaignId: String(notification.campaignId),
            customerId: String(notification.customerId),
            trackingToken: notification.trackingToken,
            discountPercent: "10",
            discountAmount: "349.90",
          },
        },
      },
    },
  };

  const webhookResp = await fetch("http://localhost:3000/api/track/razorpay-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload),
  });

  const webhookJson = await webhookResp.json();
  console.log("  → Webhook Response Status:", webhookResp.status);
  console.log("  → Webhook Response JSON:", webhookJson);

  console.log("\n3. Verifying database record in PostgreSQL...");
  const dbOrder = await prisma.order.findUnique({
    where: { id: webhookJson.orderId },
    include: { campaign: true, customer: true },
  });

  console.log(`  → Order #${dbOrder.id} created: ₹${dbOrder.totalAmount}, attributed to Campaign #${dbOrder.campaignId} (${dbOrder.campaign?.name})`);
  console.log(`  → Attribution Type: ${dbOrder.attributionType}`);

  console.log("\n4. Verifying AuditLog entry...");
  const auditLog = await prisma.auditLog.findFirst({
    where: { action: "campaign_order_converted", entityId: webhookJson.orderId },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`  → AuditLog found:`, auditLog?.inputSummary);

  const statusOk = webhookResp.status === 200 && webhookJson.status === "processed";
  const orderValid = dbOrder && dbOrder.campaignId === notification.campaignId && dbOrder.totalAmount === 3499.0;
  const isAttributed = dbOrder.attributionType === "razorpay_test" && dbOrder.isTestMode === true;

  console.log("\nAssertions:");
  console.log("  → Webhook processed successfully:", statusOk);
  console.log("  → Order created and attributed correctly:", orderValid);
  console.log("  → Attribution mode set to 'razorpay_test':", isAttributed);
  console.log("  → AuditLog recorded:", !!auditLog);

  if (statusOk && orderValid && isAttributed) {
    console.log("\n✅ RAZORPAY WEBHOOK INGESTION & ATTRIBUTION 100% VERIFIED! 🚀");
  } else {
    console.error("\n❌ WEBHOOK VERIFICATION FAILED.");
    process.exit(1);
  }
}

testRazorpayWebhook()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

