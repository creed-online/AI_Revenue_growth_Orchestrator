/**
 * generateCampaignPDF
 * Renders a branded executive report PDF for a completed campaign.
 *
 * Uses jsPDF for vector PDF construction (no canvas screenshot dependency
 * for the main content, since html2canvas has issues with dark WebGL canvases).
 */

export async function generateCampaignPDF({
  campaign,
  predicted,
  actual,
  delta,
  funnel,
  attributedOrders = [],
}) {
  // Dynamic imports so main bundle isn't bloated
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getWidth();

  // ── Color Palette ────────────────────────────────────────────────────────
  const DARK = [7, 14, 27];
  const MINT = [45, 212, 168];
  const SKY = [56, 189, 248];
  const SLATE = [139, 155, 180];
  const WHITE = [255, 255, 255];
  const ROSE = [244, 63, 94];
  const AMBER = [251, 191, 36];

  function setFill(...rgb) { doc.setFillColor(...rgb); }
  function setDraw(...rgb) { doc.setDrawColor(...rgb); }
  function setFont(style = "normal", size = 10, ...rgb) {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    if (rgb.length) doc.setTextColor(...rgb);
    else doc.setTextColor(...WHITE);
  }

  // ── Page 1 Header ─────────────────────────────────────────────────────────
  // Dark background
  setFill(...DARK);
  doc.rect(0, 0, W, 297, "F");

  // Header gradient bar
  setFill(...MINT);
  doc.rect(0, 0, W, 3, "F");

  // Logo area
  setFill(12, 24, 46);
  doc.roundedRect(14, 10, W - 28, 38, 4, 4, "F");

  setFont("bold", 22, ...MINT);
  doc.text("ARGO", 22, 28);
  setFont("normal", 9, ...SLATE);
  doc.text("AI Revenue & Growth Orchestrator", 22, 35);
  setFont("bold", 16, ...WHITE);
  doc.text("Campaign Executive Report", 22, 43);

  // Campaign ID badge on right
  setFill(45, 212, 168, 20);
  doc.roundedRect(W - 55, 14, 41, 10, 2, 2, "F");
  setFont("bold", 8, ...MINT);
  doc.text(`Campaign #${campaign.id}`, W - 51, 21);

  // Campaign name
  setFont("bold", 18, ...WHITE);
  doc.text(campaign.name || `Campaign #${campaign.id}`, 14, 65, {
    maxWidth: W - 28,
  });

  // Meta info row
  const meta = [
    { label: "Offer", value: `${campaign.offerValue || 0}% OFF` },
    { label: "Audience", value: `${campaign.audienceSize || 0} customers` },
    { label: "Status", value: String(campaign.status || "—").toUpperCase() },
    { label: "Date", value: new Date(campaign.createdAt || Date.now()).toLocaleDateString("en-IN") },
  ];

  let mx = 14;
  meta.forEach(({ label, value }) => {
    setFont("normal", 7, ...SLATE);
    doc.text(label.toUpperCase(), mx, 78);
    setFont("bold", 9, ...WHITE);
    doc.text(value, mx, 84);
    mx += (W - 28) / meta.length;
  });

  // ── Section: KPI Summary Cards ────────────────────────────────────────────
  const sectionY = 96;

  setFont("bold", 10, ...MINT);
  doc.text("KEY PERFORMANCE METRICS", 14, sectionY);
  setFill(...MINT);
  doc.rect(14, sectionY + 1.5, 40, 0.5, "F");

  const kpis = [
    { label: "Gross Revenue", value: money(actual?.revenue), sub: `Predicted: ${money(predicted?.revenue)}`, color: MINT },
    { label: "Net Profit", value: money(actual?.netRevenue), sub: `Predicted: ${money(predicted?.netRevenue)}`, color: WHITE },
    { label: "Campaign ROI", value: `${Number(actual?.roi || 0).toFixed(2)}x`, sub: `Predicted: ${Number(predicted?.roi || 0).toFixed(2)}x`, color: SKY },
    { label: "Total Cost Burn", value: money((actual?.discountCost || 0) + (actual?.campaignCost || 0)), sub: `Discount: ${money(actual?.discountCost)}`, color: ROSE },
  ];

  const cardW = (W - 28 - 9) / 4;
  kpis.forEach(({ label, value, sub, color }, i) => {
    const cx = 14 + i * (cardW + 3);
    const cy = sectionY + 8;

    setFill(12, 24, 46);
    doc.roundedRect(cx, cy, cardW, 28, 2, 2, "F");
    setDraw(...color, 30);
    doc.roundedRect(cx, cy, cardW, 28, 2, 2, "S");

    setFont("normal", 6.5, ...SLATE);
    doc.text(label.toUpperCase(), cx + 4, cy + 8);
    setFont("bold", 12, ...color);
    doc.text(value, cx + 4, cy + 17);
    setFont("normal", 6, ...SLATE);
    doc.text(sub, cx + 4, cy + 24);
  });

  // ── Section: Conversion Funnel ─────────────────────────────────────────────
  const funnelY = sectionY + 50;
  setFont("bold", 10, ...MINT);
  doc.text("5-STAGE CONVERSION FUNNEL", 14, funnelY);
  setFill(...MINT);
  doc.rect(14, funnelY + 1.5, 48, 0.5, "F");

  const stages = [
    { label: "Audience", value: funnel?.audienceSize || campaign.audienceSize || 0, color: SLATE },
    { label: "Delivered", value: funnel?.delivered || 0, color: SKY },
    { label: "Opened", value: funnel?.opened || 0, color: [52, 211, 153] },
    { label: "Clicked", value: funnel?.clicked || 0, color: [20, 184, 166] },
    { label: "Purchased", value: funnel?.conversions || actual?.conversions || 0, color: MINT },
  ];

  const stageW = (W - 28) / 5;
  const maxVal = stages[0].value || 1;

  stages.forEach(({ label, value, color }, i) => {
    const sx = 14 + i * stageW;
    const sy = funnelY + 10;
    const barH = Math.max(2, (value / maxVal) * 30);
    const pct = i === 0 ? 100 : ((value / maxVal) * 100).toFixed(1);

    setFill(...color, 40);
    doc.roundedRect(sx + 1, sy + (30 - barH), stageW - 8, barH, 1, 1, "F");

    setFont("bold", 8, ...color);
    doc.text(String(value), sx + 2, sy + (30 - barH) - 2);

    setFont("normal", 6, ...SLATE);
    doc.text(label, sx + 2, sy + 35);
    setFont("bold", 6.5, ...color);
    doc.text(`${pct}%`, sx + 2, sy + 40);
  });

  // ── Section: Attributed Orders Table ─────────────────────────────────────
  const tableY = funnelY + 55;

  setFont("bold", 10, ...MINT);
  doc.text("ATTRIBUTED CUSTOMER ORDERS", 14, tableY);
  setFill(...MINT);
  doc.rect(14, tableY + 1.5, 52, 0.5, "F");

  if (attributedOrders.length === 0) {
    setFont("normal", 8, ...SLATE);
    doc.text("No attributed orders were recorded for this campaign.", 14, tableY + 14);
  } else {
    // Table header
    const headers = ["Order #", "Customer", "Gross Amt", "Discount", "Type", "Date"];
    const colWidths = [22, 50, 24, 20, 18, 28];
    const colX = [14];
    colWidths.slice(0, -1).forEach((w, i) => colX.push(colX[i] + w));

    const headerY = tableY + 8;
    setFill(12, 24, 46);
    doc.rect(14, headerY - 5, W - 28, 8, "F");

    headers.forEach((h, i) => {
      setFont("bold", 7, ...SLATE);
      doc.text(h, colX[i] + 1, headerY - 0.5);
    });

    const maxRows = Math.min(attributedOrders.length, 15);
    attributedOrders.slice(0, maxRows).forEach((order, r) => {
      const rowY = headerY + 7 + r * 7;

      if (r % 2 === 0) {
        setFill(10, 20, 38);
        doc.rect(14, rowY - 4.5, W - 28, 7, "F");
      }

      const cells = [
        order.orderNumber || `ORD-${order.orderId}`,
        `${order.customerName || "—"} (${(order.customerEmail || "—").split("@")[0]})`,
        money(order.totalPrice),
        `-${money(order.discountAmount)}`,
        order.isTestMode ? "TEST" : "LIVE",
        new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN"),
      ];

      cells.forEach((cell, i) => {
        const col = i === 2 ? MINT : i === 3 ? ROSE : i === 4 ? (order.isTestMode ? AMBER : [52, 211, 153]) : WHITE;
        setFont(i === 2 ? "bold" : "normal", 6.5, ...col);
        doc.text(String(cell).substring(0, i === 1 ? 26 : 20), colX[i] + 1, rowY);
      });
    });

    if (attributedOrders.length > maxRows) {
      const moreY = headerY + 7 + maxRows * 7 + 4;
      setFont("normal", 7, ...SLATE);
      doc.text(`… and ${attributedOrders.length - maxRows} more orders not shown.`, 14, moreY);
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  setFill(...MINT);
  doc.rect(0, 294, W, 3, "F");

  setFont("normal", 6.5, ...SLATE);
  doc.text(
    `ARGO · AI Revenue & Growth Orchestrator · Generated ${new Date().toLocaleString("en-IN")} · Razorpay Buildathon`,
    W / 2,
    292,
    { align: "center" }
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const filename = `ARGO-Campaign-${campaign.id}-Report-${Date.now()}.pdf`;
  doc.save(filename);
}

function money(n) {
  return `INR ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

