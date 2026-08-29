import { sendRealEmail, isValidEmail } from '../services/emailService.js';

async function testEmailDispatcher() {
  console.log("===============================================================");
  console.log("📧 TESTING PRODUCTION & SANDBOX EMAIL DISPATCHER");
  console.log("===============================================================\n");

  console.log("1. Testing email format validator...");
  console.log("  → priya@example.com:", isValidEmail("priya@example.com"));
  console.log("  → invalid-email:", isValidEmail("invalid-email"));

  console.log("\n2. Sending test marketing email with tracking token...");
  const result = await sendRealEmail({
    to: "test.customer@growth-orchestrator.ai",
    subject: "Exclusive 10% Off Your Next Restock!",
    text: "Hi Test Customer,\n\nClaim your 10% discount on Whey Protein Isolate today!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; background: #0c121c; color: #fff; border-radius: 12px;">
        <h2 style="color: #2dd4a8;">Exclusive 10% Off!</h2>
        <p>Restock your favorite supplements today with priority dispatch.</p>
        <a href="http://localhost:3000/api/track/click/test_token" style="background: #2dd4a8; color: #070b12; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Claim 10% Off</a>
      </div>
    `,
    trackingToken: "trk_test_123456",
  });

  console.log("Email Dispatch Result:", result);

  if (result.success && result.messageId) {
    console.log("\n✅ EMAIL DISPATCHER VERIFIED SUCCESSFULLY! Mode:", result.mode);
  } else {
    console.error("\n❌ EMAIL DISPATCHER FAILED:", result);
    process.exit(1);
  }
}

testEmailDispatcher()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

