import { prisma } from '../lib/prisma.js';

async function testRazorpayCheckout() {
  console.log("===============================================================");
  console.log("💳 TESTING RAZORPAY TEST GATEWAY & CONVERSION ATTRIBUTION");
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

  console.log(`1. Customer: ${notification.customer?.name} (#${notification.customerId})`);
  console.log(`  → Campaign: #${notification.campaignId} (${notification.campaign?.name})`);
  console.log(`  → Tracking Token: ${notification.trackingToken}`);

  console.log("\n2. Creating Razorpay Checkout Order (POST /api/track/checkout/create-order)...");
  const createOrderResp = await fetch("http://localhost:3000/api/track/checkout/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trackingToken: notification.trackingToken,
      items: [
        { productId: 1, name: "Whey Protein Isolate 1kg", quantity: 2, unitPrice: 1500.0 },
      ],
      discountPercent: 10,
    }),
  });

  const orderData = await createOrderResp.json();
  console.log("  → Status:", createOrderResp.status);
  console.log("  → Razorpay Order ID:", orderData.razorpayOrderId);
  console.log("  → Gross Amount: ₹", orderData.grossAmount);
  console.log("  → Discount (10%): ₹", orderData.discountAmount);
  console.log("  → Net Payable: ₹", orderData.amount);
  console.log("  → Amount in Paise:", orderData.amountInPaise);

  console.log("\n3. Verifying Test Payment & Attributing Order (POST /api/track/checkout/verify-payment)...");
  const verifyResp = await fetch("http://localhost:3000/api/track/checkout/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: `pay_test_${Date.now()}`,
      trackingToken: notification.trackingToken,
      campaignId: notification.campaignId,
      customerId: notification.customerId,
      totalAmount: orderData.amount,
      discountAmount: orderData.discountAmount,
      items: orderData.items,
      isTestMode: true,
    }),
  });

  const verifyData = await verifyResp.json();
  console.log("  → Status:", verifyResp.status);
  console.log("  → Created Order ID in DB:", verifyData.orderId);
  console.log("  → Order Total Amount: ₹", verifyData.totalPrice);
  console.log("  → Attributed Campaign ID:", verifyData.campaignId);
  console.log("  → Attribution Type:", verifyData.attributionType);
  console.log("  → Is Test Mode:", verifyData.isTestMode);

  console.log("\n4. Verifying database record in PostgreSQL...");
  const dbOrder = await prisma.order.findUnique({
    where: { id: verifyData.orderId },
    include: { items: true, customer: true, campaign: true },
  });

  console.log(`  → Order #${dbOrder.id} status: ${dbOrder.status}, total: ₹${dbOrder.totalAmount}, campaign: ${dbOrder.campaign?.name}`);

  console.log("\n5. Verifying AuditLog entry...");
  const auditLog = await prisma.auditLog.findFirst({
    where: { action: "campaign_order_converted", entityId: verifyData.orderId },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`  → AuditLog found:`, auditLog?.inputSummary);

  const orderCreated = orderData.razorpayOrderId && orderData.amount === 2700.0;
  const paymentVerified = verifyData.success === true && verifyData.campaignId === notification.campaignId;
  const attributionAccurate = dbOrder.attributionType === "razorpay_test" && dbOrder.isTestMode === true;

  console.log("\nAssertions:");
  console.log("  → Razorpay order created with accurate discount:", orderCreated);
  console.log("  → Payment verified and attributed to campaign:", paymentVerified);
  console.log("  → Attribution flagged with 'razorpay_test' & isTestMode:", attributionAccurate);
  console.log("  → AuditLog recorded:", !!auditLog);

  if (orderCreated && paymentVerified && attributionAccurate) {
    console.log("\n✅ RAZORPAY TEST GATEWAY & CONVERSION ATTRIBUTION 100% VERIFIED! 🚀");
  } else {
    console.error("\n❌ CHECKOUT VERIFICATION FAILED.");
    process.exit(1);
  }
}

testRazorpayCheckout()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

