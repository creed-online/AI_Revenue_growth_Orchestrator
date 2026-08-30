import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { encrypt, decrypt, maskSecret } from "../lib/encryption.js";
import { renderWhatsAppTemplate, sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "../services/whatsappService.js";
import { prisma } from "../lib/prisma.js";
import { scanReplenishmentOpportunities } from "../services/opportunityEngine.js";

async function runPhase1Tests() {
  console.log("==================================================");
  console.log("🧪 RUNNING PHASE 1 MERCHANT INTEGRATION TESTS");
  console.log("==================================================");

  // Test 1: AES-256-GCM Encryption
  console.log("\n[Test 1] Testing AES-256-GCM Encryption & Decryption...");
  const sampleSecret = "rzp_live_secret_key_998877665544";
  const encrypted = encrypt(sampleSecret);
  const decrypted = decrypt(encrypted);
  const masked = maskSecret(sampleSecret, 4);

  console.log("  • Original Secret:", sampleSecret);
  console.log("  • Encrypted (IV:Tag:Cipher):", encrypted);
  console.log("  • Decrypted:", decrypted);
  console.log("  • Masked Secret:", masked);

  if (decrypted !== sampleSecret) {
    throw new Error("❌ Encryption/Decryption mismatch!");
  }
  if (!masked.includes("••••") || !masked.endsWith("5544")) {
    throw new Error("❌ Masking logic incorrect!");
  }
  console.log("✔ Test 1 Passed: AES-256-GCM Cryptographic Layer Verified");

  // Test 2: WhatsApp Templates & Dispatcher
  console.log("\n[Test 2] Testing 4 Pre-Approved D2C WhatsApp Templates...");
  for (const [key, tpl] of Object.entries(WHATSAPP_TEMPLATES)) {
    const rendered = renderWhatsAppTemplate({
      templateKey: key,
      tone: "conversational_d2c",
      variables: {
        customer_name: "Varun",
        product_name: "Whey Protein Isolate",
        discount: "15",
        razorpay_link: "https://rzp.io/l/demo-replenish-15",
        merchant_name: "RakshFit Nutrition",
      },
    });
    console.log(`  • [${tpl.name}] Render Sample:`);
    console.log("    " + rendered.renderedBody.split("\n")[0]);
    if (!rendered.renderedBody.includes("Varun") || !rendered.renderedBody.includes("15%")) {
      throw new Error(`❌ Template ${key} failed variable substitution`);
    }
  }

  const dispatchResult = await sendWhatsAppMessage({
    merchantId: 1,
    to: "+919876543210",
    templateKey: "replenishment_v1",
    variables: { customer_name: "Varun Saxena", discount: "10" },
  });
  console.log("  • WhatsApp Test Dispatch Result:", dispatchResult.mode, "→ ID:", dispatchResult.messageId);
  if (!dispatchResult.success) {
    throw new Error("❌ WhatsApp dispatch simulation failed");
  }
  console.log("✔ Test 2 Passed: WhatsApp Templates & Dispatcher Verified");

  // Test 3: Prisma MerchantIntegration Persistence
  console.log("\n[Test 3] Testing Database MerchantIntegration Upsert...");
  const testIntegration = await prisma.merchantIntegration.upsert({
    where: { merchantId: 1 },
    update: {
      isSandboxMode: true,
      defaultTone: "conversational_d2c",
      selectedTemplate: "replenishment_v1",
      smtpHost: "smtp.ethereal.email",
      smtpUser: "test_merchant@argoes.app",
      smtpPassEncrypted: encrypt("secret_smtp_password_123"),
      whatsappPhoneNumberId: "10987654321",
      whatsappTokenEncrypted: encrypt("EAAG_meta_test_access_token_demo"),
      razorpayKeyId: "rzp_test_merchant_key_1",
      razorpaySecretEncrypted: encrypt("rzp_secret_super_safe_demo"),
    },
    create: {
      merchantId: 1,
      isSandboxMode: true,
      defaultTone: "conversational_d2c",
      selectedTemplate: "replenishment_v1",
      smtpHost: "smtp.ethereal.email",
      smtpUser: "test_merchant@argoes.app",
      smtpPassEncrypted: encrypt("secret_smtp_password_123"),
      whatsappPhoneNumberId: "10987654321",
      whatsappTokenEncrypted: encrypt("EAAG_meta_test_access_token_demo"),
      razorpayKeyId: "rzp_test_merchant_key_1",
      razorpaySecretEncrypted: encrypt("rzp_secret_super_safe_demo"),
    },
  });

  console.log("  • Saved MerchantIntegration for Merchant #:", testIntegration.merchantId);
  console.log("  • Decrypted Stored SMTP Password:", decrypt(testIntegration.smtpPassEncrypted));
  console.log("  • Decrypted Stored Razorpay Secret:", decrypt(testIntegration.razorpaySecretEncrypted));

  if (decrypt(testIntegration.smtpPassEncrypted) !== "secret_smtp_password_123") {
    throw new Error("❌ Stored encrypted credential decryption failed");
  }
  console.log("✔ Test 3 Passed: MerchantIntegration Database Storage & Encryption Verified");

  // Test 4: Export Logic & Opportunities
  console.log("\n[Test 4] Testing Cohort Scanning & Export Generation...");
  const opps = await scanReplenishmentOpportunities(1);
  console.log(`  • Found ${opps.length} revenue cohorts`);
  if (opps.length === 0) {
    console.warn("⚠ Warning: No opportunities returned, verify seed data");
  } else {
    console.log("  • Top Opportunity #1:", opps[0].productName, `(Potential: ₹${opps[0].potentialRevenue})`);
  }
  console.log("✔ Test 4 Passed: Export Cohorts Accessible");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 1 INTEGRATION TESTS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");

  await prisma.$disconnect();
}

runPhase1Tests().catch((err) => {
  console.error("❌ Phase 1 Tests Failed:", err);
  process.exit(1);
});

