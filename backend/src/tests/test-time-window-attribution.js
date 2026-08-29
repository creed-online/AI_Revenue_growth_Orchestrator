import { prisma } from '../lib/prisma.js';
import { attributeSingleOrder, attributeUnattributedOrders } from '../services/attributionService.js';

async function testTimeWindowAttribution() {
  console.log("===============================================================");
  console.log("🕒 TESTING SECONDARY 14-DAY EMAIL WINDOW ATTRIBUTION");
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

  console.log(`1. Target Customer: #${notification.customerId} (${notification.customer?.name} <${notification.customer?.email}>)`);
  console.log(`  → Active Campaign: #${notification.campaignId} ("${notification.campaign?.name}")`);

  console.log("\n2. Creating an unattributed direct order in PostgreSQL (simulating CSV import / storefront checkout)...");
  const directOrder = await prisma.order.create({
    data: {
      customerId: notification.customerId,
      campaignId: null, // intentionally null
      totalAmount: 4999.0,
      discountAmount: 0.0,
      attributionType: null,
      status: "completed",
      createdAt: new Date(), // placed now, within 14 days of email send
      items: {
        create: [
          { productId: 1, quantity: 2, price: 2499.50 },
        ],
      },
    },
  });

  console.log(`  → Created Unattributed Order #${directOrder.id}, campaignId: ${directOrder.campaignId}`);

  console.log("\n3. Executing attributeSingleOrder(orderId)...");
  const attrResult = await attributeSingleOrder(directOrder.id);
  console.log("  → Attribution Result:", attrResult);

  console.log("\n4. Verifying database record in PostgreSQL...");
  const updatedOrder = await prisma.order.findUnique({
    where: { id: directOrder.id },
    include: { campaign: true },
  });

  console.log(`  → Order #${updatedOrder.id} campaignId: ${updatedOrder.campaignId} ("${updatedOrder.campaign?.name}")`);
  console.log(`  → Attribution Type: ${updatedOrder.attributionType}`);
  console.log(`  → Discount Amount: ₹${updatedOrder.discountAmount}`);

  console.log("\n5. Verifying AuditLog entry...");
  const auditLog = await prisma.auditLog.findFirst({
    where: { action: "order_window_attributed", entityId: directOrder.id },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`  → AuditLog found:`, auditLog?.inputSummary);

  const isAttributed = updatedOrder.campaignId === notification.campaignId;
  const isEmailWindow = updatedOrder.attributionType === "email_window";
  const hasAudit = !!auditLog;

  console.log("\nAssertions:");
  console.log("  → Order matched to active campaign:", isAttributed);
  console.log("  → Attribution type set to 'email_window':", isEmailWindow);
  console.log("  → AuditLog recorded:", hasAudit);

  if (isAttributed && isEmailWindow && hasAudit) {
    console.log("\n✅ SECONDARY 14-DAY EMAIL WINDOW ATTRIBUTION 100% VERIFIED! 🚀");
  } else {
    console.error("\n❌ TIME-WINDOW ATTRIBUTION VERIFICATION FAILED.");
    process.exit(1);
  }
}

testTimeWindowAttribution()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

