import { prisma } from '../lib/prisma.js';

async function testClickTracking() {
  console.log("===============================================================");
  console.log("🖱️ TESTING REAL-TIME EMAIL CLICK TRACKING & REDIRECT");
  console.log("===============================================================\n");

  const notification = await prisma.notificationSend.findFirst({
    where: { trackingToken: { not: null } },
    orderBy: { sentAt: 'desc' },
  });

  if (!notification) {
    console.error("❌ No notification with trackingToken found.");
    process.exit(1);
  }

  console.log(`1. Target Notification ID: ${notification.id}, Token: ${notification.trackingToken}`);
  console.log(`  → Initial clickedAt: ${notification.clickedAt}, clickCount: ${notification.clickCount}`);

  console.log("\n2. Testing Click Tracking (GET /api/track/click/:token?json=true)...");
  const clickJsonUrl = `http://localhost:3000/api/track/click/${notification.trackingToken}?json=true&target=http://localhost:5173/products`;
  const resp = await fetch(clickJsonUrl, {
    headers: { "User-Agent": "ChromeBrowser/120.0" },
  });

  const data = await resp.json();
  console.log("  → Response Status:", resp.status);
  console.log("  → JSON Payload:", data);
  console.log("  → Destination URL:", data.destinationUrl);

  console.log("\n3. Testing 302 Redirect Mode (GET /api/track/click/:token)...");
  const clickRedirectUrl = `http://localhost:3000/api/track/click/${notification.trackingToken}?target=http://localhost:5173/products`;
  const redirectResp = await fetch(clickRedirectUrl, {
    redirect: "manual",
  });
  console.log("  → Redirect Status:", redirectResp.status);
  console.log("  → Location Header:", redirectResp.headers.get("location"));
  console.log("  → Set-Cookie Header:", redirectResp.headers.get("set-cookie"));

  console.log("\n4. Verifying database record in PostgreSQL...");
  const updatedNotif = await prisma.notificationSend.findUnique({
    where: { id: notification.id },
  });
  console.log(`  → Updated clickedAt: ${updatedNotif.clickedAt}`);
  console.log(`  → Updated clickCount: ${updatedNotif.clickCount}`);
  console.log(`  → Updated openedAt: ${updatedNotif.openedAt}`);

  console.log("\n5. Verifying AuditLog entry...");
  const auditLog = await prisma.auditLog.findFirst({
    where: { action: "email_clicked", entityId: notification.campaignId },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`  → AuditLog found:`, auditLog?.inputSummary);

  const hasJsonSuccess = data.success === true;
  const hasUtm = data.destinationUrl?.includes("utm_campaign=") && data.destinationUrl?.includes("argo_token=");
  const is302 = redirectResp.status === 302;
  const hasClickedAt = updatedNotif.clickedAt !== null && updatedNotif.clickCount > (notification.clickCount || 0);

  console.log("\nAssertions:");
  console.log("  → JSON API success:", hasJsonSuccess);
  console.log("  → Destination URL includes UTM parameters:", hasUtm);
  console.log("  → Browser mode returns HTTP 302 redirect:", is302);
  console.log("  → Database updated with clickedAt:", hasClickedAt);
  console.log("  → AuditLog recorded:", !!auditLog);

  if (hasJsonSuccess && hasUtm && is302 && hasClickedAt) {
    console.log("\n✅ REAL-TIME CLICK TRACKING & REDIRECT 100% VERIFIED! 🚀");
  } else {
    console.error("\n❌ CLICK TRACKING VERIFICATION FAILED.");
    process.exit(1);
  }
}

testClickTracking()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

