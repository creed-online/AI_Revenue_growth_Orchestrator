# 📋 ARGOES UI/UX Overhaul & Full-Stack Merchant Gateway — TODO

> **Goal:** Transform ARGOES into an editorial, human-centric revenue growth platform (*Anthropic Claude aesthetic*) with a complete Merchant Integration Gateway (BYO SMTP + WhatsApp Business API + Razorpay Live Keys), WhatsApp Template Studio, 1-Click Executive PDF/CSV Reports, and seamless mobile ergonomics.

---

## 📌 Phase 1: Database & Backend Merchant Integrations (BYO Channels & Security)

- [x] **1.1. Prisma Schema Extension (`prisma/schema.prisma`)**
  - [x] Add `MerchantIntegration` model linked 1-to-1 with `Merchant`.
  - [x] Fields for SMTP: `emailProvider`, `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassEncrypted`, `senderEmail`, `senderName`, `emailVerified`.
  - [x] Fields for WhatsApp: `whatsappProvider`, `whatsappPhoneNumberId`, `whatsappWabaId`, `whatsappTokenEncrypted`, `merchantTestPhone`, `whatsappVerified`.
  - [x] Fields for Razorpay: `razorpayKeyId`, `razorpaySecretEncrypted`, `razorpayVerified`.
  - [x] Tone & Template preferences: `defaultTone` (default: `"conversational_d2c"`), `selectedTemplate` (default: `"replenishment_v1"`).
  - [x] Run `npx prisma db push` and `npx prisma generate`.

- [x] **1.2. Cryptographic Security Layer (`backend/src/lib/encryption.js`)**
  - [x] Implement AES-256-GCM encryption and decryption functions for sensitive credentials (passwords, tokens, Razorpay secret).
  - [x] Add fallback key generator for local/development environments.

- [x] **1.3. Dynamic WhatsApp Dispatcher (`backend/src/services/whatsappService.js`)**
  - [x] Implement Meta Cloud API & Twilio messaging dispatcher with template variable injection.
  - [x] Embed **4 Pre-Approved D2C Template Frameworks**:
    - `replenishment_v1`: The Replenishment Nudge
    - `vip_early_access_v1`: VIP Early Access Drop
    - `flash_discount_v1`: Price-Sensitive Margin-Safe Promo
    - `winback_voucher_v1`: Dormant Win-Back Voucher
  - [x] Add Conversational D2C formatting and Razorpay payment link attachment.

- [x] **1.4. Dynamic SMTP Dispatcher (`backend/src/services/emailService.js`)**
  - [x] Upgrade Nodemailer service to dynamically instantiate per-merchant SMTP transporters based on verified `MerchantIntegration` records.

- [x] **1.5. Integration API Endpoints (`backend/src/routes/integrationRoute.js`)**
  - [x] `GET /api/integrations` - Retrieve current merchant channel connection status (masked credentials).
  - [x] `POST /api/integrations` - Save & update encrypted SMTP, WhatsApp, and Razorpay credentials.
  - [x] `POST /api/integrations/test-email` - Send live test email to verify SMTP.
  - [x] `POST /api/integrations/test-whatsapp` - **1-Click "Send Test to My Phone"** live WhatsApp dispatcher.

- [x] **1.6. Executive Export API (`backend/src/routes/exportRoute.js`)**
  - [x] `GET /api/export/csv` - Stream 20 identified revenue cohorts to a downloadable CSV file.
  - [x] `GET /api/export/summary` - Provide structured JSON for client-side PDF/print report generation.

- [x] **1.7. Route Mounting (`backend/src/index.js`)**
  - [x] Mount `/api/integrations` and `/api/export` in Express application.

---

## 📌 Phase 2: Design Tokens, Claude Theme & Mobile Auth Fix

- [x] **2.1. Global Typography & Color Tokens (`frontend/frontend/src/index.css`)**
  - [x] Import Google Fonts: *Newsreader* (Editorial Serif for numbers/headings) + *Plus Jakarta Sans* (Clean UI Sans).
  - [x] Configure Claude warm design tokens:
    - `--color-obsidian`: `#181714` (base), `#201E1A` (elevated), `#272520` (panel)
    - `--color-terracotta`: `#D97757`, `--color-terracotta-dark`: `#C96442`
    - `--color-amber`: `#E5A93C`, `--color-champagne`: `#E8C59D`
    - `--color-sage`: `#7C9A82`, `--color-rose`: `#D97070`
    - Hairline warm borders: `rgba(220, 205, 185, 0.12)`.
  - [x] Replace blue/cyan background gradient with warm espresso & amber ambient lighting.

- [x] **2.2. Mobile Auth Screen Blockage Fix (`frontend/frontend/src/components/FloatingAuthBox.jsx`)**
  - [x] Add `hidden md:block` to permanently remove screen blockage on mobile screens.
  - [x] Add dismissible close button (`×`) with session storage memory.

- [x] **2.3. Top Navigation & Status Bar (`frontend/frontend/src/components/Navbar.jsx`)**
  - [x] Update with warm obsidian styling, terracotta active states, and quick navigation stepper.
  - [x] Add integration health indicator pill (`🟢 Channels Connected` / `🟡 Sandbox Mode`).
  - [x] Add compact mobile auth button in header.

---

## 📌 Phase 3: Dashboard Layout, Stepper, Video Slot & Export Modals

- [x] **3.1. Integration Wizard Modal (`frontend/frontend/src/components/IntegrationWizardModal.jsx`)**
  - [x] Interactive 3-tab modal:
    - Tab 1: 📧 Email SMTP (Host, Port, User, Password, Sender Email)
    - Tab 2: 💬 WhatsApp Business (Meta Cloud API / Twilio credentials)
    - Tab 3: 💳 Razorpay Live Keys (Key ID, Key Secret)
  - [x] **1-Click "Send Test to My Phone"** action with phone number input.
  - [x] Toggle for "Sandbox Simulation Mode".

- [x] **3.2. WhatsApp D2C Template Studio Modal (`frontend/frontend/src/components/TemplateStudioModal.jsx`)**
  - [x] Selector for 4 D2C templates.
  - [x] Live interactive iPhone preview with editable copy bubbles.
  - [x] Dynamic variable pills (`{{customer_name}}`, `{{product_name}}`, `{{discount}}`, `{{razorpay_link}}`).

- [x] **3.3. Executive Growth Summary Modal (`frontend/frontend/src/components/ExecutiveReportModal.jsx`)**
  - [x] Branded high-resolution report preview (Potential Revenue: `₹20,00,049`, 20 Cohorts, 3 High Priority).
  - [x] Instant **Download CSV** and **Print / Save as PDF** buttons.

- [x] **3.4. Quickstart Guide & Video Hero (`frontend/frontend/src/components/QuickstartGuideHero.jsx`)**
  - [x] Replaces the 3D cone on the dashboard.
  - [x] Includes **16:9 Video Walkthrough Frame** (ready for final video recording).
  - [x] Storytelling tabs: "60s Quick Tour", "The RakshFit Story", "How Autopilot Works".
  - [x] Primary Action CTA: *"Approve Top 3 Campaigns (₹9.4L)"*.

- [x] **3.5. Actionable Bento KPI Grid (`frontend/frontend/src/components/KPICards.jsx`)**
  - [x] Re-architect into a high-density Bento Grid with zero wasted space.
  - [x] Editorial serif typography for numbers (`₹20,00,049`, `6.4x`).
  - [x] Micro-sparklines and embedded 1-click action triggers on each card.

- [x] **3.6. Dashboard Page Assembly (`frontend/frontend/src/pages/DashboardPage.jsx`)**
  - [x] Mount 3-Step Guided Progress Stepper (`1. Ingest Data → 2. AI Scans Cohorts → 3. 1-Click Launch`).
  - [x] Mount `QuickstartGuideHero`, Bento KPI Grid, and Integration Gateway check.
  - [x] Add "Export Report" and "Template Studio" action buttons in the top toolbar.

---

## 📌 Phase 4: Restyling All 3D Visualizations (Claude Warmth Shaders)

- [x] **4.1. 3D Customer Cohort Galaxy (`frontend/frontend/src/components/ThreeCustomerGlobe.jsx`)**
  - [x] Restyle cohorts to warm palette:
    - VIP Whales: Toasted Gold (`#E5A93C`) & Champagne (`#E8C59D`)
    - Replenishment Due: Terracotta (`#D97757`)
    - Price Sensitive: Warm Sandstone (`#C8A97E`)
    - Churn / Dormant: Dusty Brick (`#A85A48`)
  - [x] Restyle starfield from cyan dots to warm ambient dust particles.
  - [x] Update node hover popup cards to warm linen glassmorphism.

- [x] **4.2. 3D Conversion Vortex (`frontend/frontend/src/components/ThreeConversionFunnel.jsx`)**
  - [x] Restyle 5 funnel stages on Results page into warm gradient:
    - Audience Target: Warm Sandstone (`#B8A898`)
    - Delivered: Warm Copper (`#C97A56`)
    - Opened: Warm Terracotta (`#D97757`)
    - Clicked: Rich Amber (`#E5A93C`)
    - Orders Attributed: Toasted Gold & Sage Green (`#7C9A82` / `#F0C368`)
  - [x] Warm particle stream and glowing ring shaders.

- [x] **4.3. 3D Schema Vector Matcher (`frontend/frontend/src/components/ThreeVectorMatcher.jsx`)**
  - [x] Restyle embeddings on Import Data page with warm amber/terracotta connection lines.

---

## 📌 Phase 5: Mobile Ergonomics & Conversational D2C WhatsApp Preview

- [x] **5.1. Triage Decision Deck (`frontend/frontend/src/components/OpportunityFeed.jsx`)**
  - [x] 2-second decision cards with Conversational D2C copy.
  - [x] Live split-screen iPhone WhatsApp preview drawer.
  - [x] Margin & Safety Shield breakdown on every card (`🛡️ 31.4% Net Margin Guaranteed`).

- [x] **5.2. Campaign Email/WhatsApp Simulator Modal (`frontend/frontend/src/components/CampaignEmailSimulatorModal.jsx`)**
  - [x] Upgrade modal into a sleek mobile device frame with Razorpay payment link.

- [x] **5.3. Mobile Action Dock (`frontend/frontend/src/components/MobileActionDock.jsx`)**
  - [x] Sticky bottom thumb-friendly action dock for 1-tap mobile campaign launches.

---

## 📌 Phase 6: Verification, Automated Build & Cloud Deployment

- [x] **6.1. Build & Lint Verification**
  - [x] Run `npm run build` in `frontend/frontend` (zero build errors).
  - [x] Test API integration routes locally.
- [x] **6.2. End-to-End User Flow Testing**
  - [x] Verify Dashboard, Opportunities, Results, and Import pages.
  - [x] Test 1-Click "Send Test to My Phone".
  - [x] Test CSV & PDF Export.
  - [x] Test Mobile Viewport (iPhone 14 / Android).
- [x] **6.3. Cloud Deployment Readiness**
  - [x] Build and test suite verified for production deployment.
