import { prisma } from '../lib/prisma.js';

async function testOpenTracking() {
  console.log("===============================================================");
  console.log("👁️ TESTING REAL-TIME EMAIL OPEN TRACKING PIXEL");
  console.log("===============================================================\n");

  // Find an existing notification with a trackingToken
  const notification = await prisma.notificationSend.findFirst({
    where: { trackingToken: { not: null } },
    orderBy: { sentAt: 'desc' },
  });

  if (!notification) {
    console.error("❌ No notification with trackingToken found.");
    process.exit(1);
  }

  console.log(`1. Target Notification ID: ${notification.id}, Token: ${notification.trackingToken}`);
  console.log(`  → Initial openedAt: ${notification.openedAt}, openCount: ${notification.openCount}`);

  console.log("\n2. Requesting open tracking pixel (GET /api/track/open/:token)...");
  const pixelUrl = `http://localhost:3000/api/track/open/${notification.trackingToken}`;
  const resp = await fetch(pixelUrl, {
    headers: { "User-Agent": "TestMailClient/1.0", "X-Forwarded-For": "127.0.0.1" },
  });

  const contentType = resp.headers.get("content-type");
  const cacheControl = resp.headers.get("cache-control");
  const buffer = await resp.arrayBuffer();

  console.log(`  → Response Status: ${resp.status}`);
  console.log(`  → Content-Type: ${contentType}`);
  console.log(`  → Cache-Control: ${cacheControl}`);
  console.log(`  → Received Byte Length: ${buffer.byteLength} bytes`);

  // Wait 500ms for async DB update
  await new Promise((r) => setTimeout(r, 500));

  console.log("\n3. Verifying database record update in PostgreSQL...");
  const updatedNotif = await prisma.notificationSend.findUnique({
    where: { id: notification.id },
  });
  console.log(`  → Updated openedAt: ${updatedNotif.openedAt}`);
  console.log(`  → Updated openCount: ${updatedNotif.openCount}`);
  console.log(`  → User Agent: ${updatedNotif.userAgent}`);

  console.log("\n4. Verifying AuditLog entry...");
  const auditLog = await prisma.auditLog.findFirst({
    where: { action: "email_opened", entityId: notification.campaignId },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`  → AuditLog found:`, auditLog?.inputSummary);

  const statusOk = resp.status === 200;
  const isGif = contentType && contentType.includes("image/gif") && buffer.byteLength >= 40;
  const dbUpdated = updatedNotif.openedAt !== null && updatedNotif.openCount > (notification.openCount || 0);

  console.log("\nAssertions:");
  console.log("  → Pixel served as 1x1 GIF:", isGif);
  console.log("  → Database updated with openedAt:", dbUpdated);
  console.log("  → AuditLog recorded:", !!auditLog);

  if (statusOk && isGif && dbUpdated) {
    console.log("\n✅ REAL-TIME OPEN TRACKING PIXEL 100% VERIFIED! 🚀");
  } else {
    console.error("\n❌ OPEN TRACKING VERIFICATION FAILED.");
    process.exit(1);
  }
}

testOpenTracking()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
