/**
 * emailTemplateEngine.js
 * Generates modern, high-converting, responsive HTML & plain-text marketing emails
 * with embedded open-tracking pixel and click-tracking redirect links.
 */

export function renderMarketingEmail({
  customerName = "Valued Customer",
  subject = "Exclusive Offer Just for You",
  body = "We noticed it might be time to restock your favorites. Enjoy a special discount on your next order.",
  ctaText = "Claim Your Offer",
  discountPercent = 10,
  promoCode = null,
  productName = null,
  trackingToken = "trk_default",
  merchantName = "RakshFit Nutrition",
  targetUrl = "http://localhost:5173",
  baseUrl = process.env.BACKEND_URL || "http://localhost:3000",
}) {
  const code = promoCode || (discountPercent > 0 ? `SAVE${Math.round(discountPercent)}` : "SPECIALGIFT");
  const clickTrackingUrl = `${baseUrl}/api/track/click/${trackingToken}?target=${encodeURIComponent(targetUrl)}`;
  const openTrackingUrl = `${baseUrl}/api/track/open/${trackingToken}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070b12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .mobile-p-20 { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #070b12;">
  <!-- Open Tracking Pixel -->
  <img src="${openTrackingUrl}" width="1" height="1" alt="" style="display:none; width:1px; height:1px; border:0; overflow:hidden;" />

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="560" class="email-container" style="background-color: #0c121c; border-radius: 16px; border: 1px solid #1c2a3d; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background: linear-gradient(135deg, rgba(45,212,168,0.12) 0%, rgba(56,189,248,0.06) 100%); border-bottom: 1px solid #1c2a3d;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #2dd4a8; display: block; margin-bottom: 4px;">
                      ${merchantName}
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                      ${subject}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;" class="mobile-p-20">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #ffffff;">
                Hi ${customerName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                ${body}
              </p>

              ${productName ? `
              <div style="background-color: #121a27; border: 1px solid #1e2c40; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700;">Featured Item</p>
                <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #38bdf8;">${productName}</p>
              </div>
              ` : ''}

              <!-- Discount Voucher Card -->
              ${discountPercent > 0 ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px; background: rgba(45, 212, 168, 0.08); border: 1px dashed #2dd4a8; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <span style="font-size: 12px; font-weight: 700; color: #2dd4a8; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">
                      ✨ Special Merchant Offer: ${discountPercent}% OFF
                    </span>
                    <div style="display: inline-block; background-color: #070b12; border: 1px solid #2dd4a8; padding: 8px 20px; border-radius: 8px; font-family: monospace; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.15em;">
                      ${code}
                    </div>
                    <span style="display: block; margin-top: 6px; font-size: 11px; color: #64748b;">
                      Applied automatically when you click below
                    </span>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${clickTrackingUrl}" target="_blank" style="background: linear-gradient(135deg, #2dd4a8 0%, #059669 100%); color: #070b12; display: inline-block; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 18px rgba(45, 212, 168, 0.35); text-transform: uppercase; letter-spacing: 0.05em;">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #080c14; border-top: 1px solid #1c2a3d; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5;">
                Sent via <strong>AI Revenue Growth Orchestrator</strong> on behalf of ${merchantName}.<br>
                You received this personalized message because you are a registered customer of ${merchantName}.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 10px; color: #334155;">
                <a href="${clickTrackingUrl}" style="color: #64748b; text-decoration: underline;">Storefront</a> &bull;
                <a href="#" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> &bull;
                <a href="#" style="color: #64748b; text-decoration: underline;">Email Preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${subject}
${'='.repeat(subject.length)}

Hi ${customerName},

${body}

${productName ? `Featured Item: ${productName}\n` : ''}
${discountPercent > 0 ? `Your Exclusive Code: ${code} (${discountPercent}% OFF)\n` : ''}
Claim your offer here: ${clickTrackingUrl}

--
Sent via AI Revenue Growth Orchestrator for ${merchantName}.
  `.trim();

  return { html, text, promoCode: code, clickTrackingUrl, openTrackingUrl };
}

export default { renderMarketingEmail };

