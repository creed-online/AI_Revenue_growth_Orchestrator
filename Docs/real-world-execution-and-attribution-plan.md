# 🚀 Real-World Campaign Execution, Email Delivery, Razorpay Testing & Attribution Plan

## 1. Executive Summary & Objective

Currently, when a merchant approves and executes a campaign, the system creates placeholder notification records and computes results using formulaic random seeds (`seed = campaign.id * 17`). 

This blueprint transitions the entire execution pipeline into a **production-grade, real-world marketing, payment, and revenue attribution engine**:
1. **Real Personalized Email Delivery**: Generates custom branded HTML emails with dynamic discount codes, live call-to-action buttons, and open tracking pixels dispatched via SMTP/Nodemailer (or Dev Test Mailbox).
2. **Real-Time Open & Click Tracking Infrastructure**: Tracks actual email opens and link clicks with unique signed tracking tokens (`/api/track/open/:token` and `/api/track/click/:token`).
3. **Razorpay Test Gateway & Deterministic Order Attribution**: Enables end-to-end checkout testing where customers click their email, pay via **Razorpay Test Gateway** (or standard checkout), and have their purchases automatically attributed to the campaign in PostgreSQL.
4. **Honest Data-Driven Result & ROI Calculation**: Measures actual conversion rates, gross revenue, discount burn, and net ROI exclusively from real database orders and tracked interactions.
5. **Postman Ready-to-Test Routes**: Every major milestone includes an explicit, copy-paste ready API route for Postman testing.
6. **Comprehensive Final Documentation**: Concludes with a complete, production-grade guide (`Docs/real-world-execution-and-attribution-guide.md`) documenting all systems, architectures, and operational runbooks.

---

## 2. End-to-End Architectural Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        REAL-WORLD EXECUTION & ATTRIBUTION PIPELINE                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  1. CAMPAIGN EXECUTION TRIGGER (POST /api/campaigns/:id/execute)                       │
│     ├── Query audience customer records (names, emails, preferences)                   │
│     ├── Generate unique cryptographic tracking token per recipient                     │
│     ├── Render personalized HTML template (AI copy + Discount code + CTA + Open pixel) │
│     └── Dispatch email via SMTP / Nodemailer (Recorded in NotificationSend)            │
│                                                                                        │
│  2. REAL-TIME INTERACTION TRACKING                                                     │
│     ├── Customer Opens Email ──► GET /api/track/open/:token ──► NotificationSend.openedAt│
│     └── Customer Clicks CTA  ──► GET /api/track/click/:token ──► NotificationSend.clickedAt │
│                                      │                                                 │
│                                      ▼ (Redirects with ?utm_campaign & cookie)         │
│  3. RAZORPAY TEST GATEWAY & PURCHASE ATTRIBUTION                                       │
│     ├── Customer lands on Checkout / Storefront                                        │
│     ├── Customer completes payment via Razorpay Test Gateway (or direct order API)    │
│     ├── POST /api/track/checkout/verify-payment or Webhook receives payment.captured   │
│     └── Attribution Engine matches Order to Campaign:                                  │
│           • Direct Token Match (argo_ref in checkout) OR                               │
│           • Email + Product + Time-Window Match (within 14-day attribution window)     │
│           └── Sets Order.campaignId = campaign.id & Order.isAttributed = true          │
│                                                                                        │
│  4. HONEST RESULT & ROI MEASUREMENT (POST /api/campaigns/:id/measure)                  │
│     ├── Real Reach: Count(emailSent == true)                                           │
│     ├── Real Opens: Count(openedAt != null)                                            │
│     ├── Real Clicks: Count(clickedAt != null)                                          │
│     ├── Real Conversions: Count(Unique Orders attributed to campaign)                  │
│     ├── Real Gross Revenue: Sum(attributed Order.totalPrice)                           │
│     ├── Real Net Profit: Gross Revenue - Sum(Discounts) - Total Email Send Cost        │
│     └── Real ROI: Net Profit / Total Cost (Honest 0.0x if no orders placed yet)        │
│                                                                                        │
│  5. LIVE VISUAL FUNNEL & AUDIT (Campaign Results UI)                                   │
│     └── Funnel: Audience ──► Delivered ──► Opened ──► Clicked ──► Purchased (Orders)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Postman Ready-to-Test API Routes Overview

Every major feature includes a dedicated test endpoint:

| Feature Area | Method | Endpoint | Purpose |
| :--- | :---: | :--- | :--- |
| **1. Orchestration** | `POST` | `/api/orchestrator/run` | Propose AI campaign proposal & policy check |
| **2. Approval** | `POST` | `/api/approvals/:id/approve` | Approve proposed campaign draft |
| **3. Real Execution** | `POST` | `/api/campaigns/:id/execute` | Execute campaign & dispatch personalized tracked emails |
| **4. Email Log Inspection**| `GET` | `/api/campaigns/:id/notifications` | Inspect all sent emails, tracking tokens & delivery status |
| **5. Open Tracking Pixel** | `GET` | `/api/track/open/:token` | Record email open event (returns 1x1 GIF) |
| **6. Click Tracking** | `GET` | `/api/track/click/:token` | Record CTA click & redirect with attribution cookie |
| **7. Razorpay Order Create**| `POST` | `/api/track/checkout/create-order` | Create Razorpay test order for recipient |
| **8. Razorpay Verify Pay**| `POST` | `/api/track/checkout/verify-payment` | Verify test payment & persist attributed Order |
| **9. Razorpay Webhook** | `POST` | `/api/track/razorpay-webhook` | Ingest live/test `payment.captured` webhooks |
| **10. 1-Click Purchase Sim**| `POST` | `/api/track/simulate-purchase` | Instantly simulate a real customer order in 1 click |
| **11. Honest Measurement** | `POST` | `/api/campaigns/:id/measure` | Calculate real conversions, revenue & ROI from DB rows |
| **12. Audit Trail** | `GET` | `/api/campaigns/:id/audit-trail` | Fetch chronological compliance & interaction logs |

---

## 4. Detailed Phase-by-Phase To-Do Plan

---

### 📋 Phase 1: Database Schema Expansion for Tracking & Attribution
- [x] **Task 1.1 — Extend `NotificationSend` Model in `prisma/schema.prisma`**
  - Add tracking columns:
    - `trackingToken`: String (unique cryptographic token per recipient, e.g. `uuidv4`).
    - `openedAt`: DateTime (nullable, set upon pixel load).
    - `clickedAt`: DateTime (nullable, set upon CTA click).
    - `openCount`: Int (default 0).
    - `clickCount`: Int (default 0).
    - `ipAddress`: String (nullable).
    - `userAgent`: String (nullable).
- [x] **Task 1.2 — Extend `Order` Model for Campaign Attribution**
  - Add attribution columns:
    - `campaignId`: Int (nullable, relational link to `Campaign`).
    - `attributionType`: String (nullable, `"token_click"`, `"razorpay_test"`, `"email_window"`, `"direct"`).
    - `discountAmount`: Float (default 0.0).
    - `isTestMode`: Boolean (default false).
- [x] **Task 1.3 — Run Prisma Migration & Client Regeneration**
  - Execute `npx prisma generate` to update Prisma Client typings.

---

### 📋 Phase 2: Production-Grade Email Dispatcher & Template Engine
- [x] **Task 2.1 — Upgrade `backend/src/services/emailService.js`**
  - Universal SMTP transport (supports Gmail, Brevo, SendGrid, AWS SES, Resend).
  - Development Ethereal sandbox fallback with live web preview URLs (`nodemailer.getTestMessageUrl(info)`).
  - Remove demo email blocker (`@example.com` filter) so emails are dispatched reliably to all test and designated inboxes.
- [x] **Task 2.2 — Design Responsive Marketing Email HTML Template**
  - Modern responsive layout featuring:
    - Personalized greeting with customer name.
    - AI-crafted persuasive copy and product details.
    - Prominent discount code callout badge (e.g. `SAVE10`, `VIP-2026`).
    - High-visibility Call-To-Action button with embedded tracking link:  
      `http://localhost:3000/api/track/click/${trackingToken}?target=${encodeURIComponent(storeUrl)}`
    - Invisible 1x1 Open Tracking Pixel:  
      `<img src="http://localhost:3000/api/track/open/${trackingToken}" width="1" height="1" style="display:none;" />`
    - Unsubscribe & merchant footer.
- [x] **Task 2.3 — Refactor `sendSimulatedNotifications` in `notificationService.js`**
  - Generate unique `trackingToken` for every customer recipient.
  - Record send details with `emailSent = true` and `sentAt = new Date()`.
  - Expose `GET /api/campaigns/:id/notifications` for inspecting generated emails and tracking tokens.

---

### 📋 Phase 3: Real-Time Click & Open Tracking Endpoints
- [x] **Task 3.1 — Build Open Tracking Endpoint (`GET /api/track/open/:token`)**
  - Looks up `NotificationSend` by `trackingToken`.
  - If first open: sets `openedAt = new Date()`, increments `openCount`, and writes an `AuditLog` entry.
  - Returns a binary 1x1 transparent GIF (`image/gif`) with headers `Cache-Control: no-cache, no-store, must-revalidate`.
- [x] **Task 3.2 — Build Click Tracking & Redirect Endpoint (`GET /api/track/click/:token`)**
  - Looks up `NotificationSend` by `trackingToken`.
  - Sets `clickedAt = new Date()`, increments `clickCount`, and writes an `AuditLog` entry.
  - Sets signed HTTP cookie `argo_campaign_ref` containing `{ campaignId, customerId, trackingToken }`.
  - Returns HTTP 302 redirect to the storefront or simulated checkout page with `?utm_campaign=${campaignId}&argo_token=${trackingToken}`.
- [x] **Task 3.3 — Register Tracking Routes in Express App**
  - Mount `app.use("/api/track", trackingRoute)` in `backend/src/index.js`.

---

### 📋 Phase 4: Razorpay Test Gateway & Conversion Attribution Engine
- [x] **Task 4.1 — Razorpay Test Gateway Checkout Integration (`backend/src/routes/tracking-route.js`)**
  - **`POST /api/track/checkout/create-order`**:
    - Creates a Razorpay order in test mode (`rzp_test_...`) with campaign discount applied.
    - Tags notes with `{ campaignId, customerId, trackingToken }`.
  - **`POST /api/track/checkout/verify-payment`**:
    - Verifies test payment signature (or mock-approves in test mode).
    - Persists an `Order` and `OrderItem` in PostgreSQL.
    - Sets `Order.campaignId = campaignId` and `Order.attributionType = "razorpay_test"`.
    - Writes `AuditLog` (`action: "campaign_order_converted"`).
- [x] **Task 4.2 — Razorpay Webhook Ingestion (`POST /api/track/razorpay-webhook`)**
  - Ingests `payment.captured` / `order.paid` webhooks from Razorpay test dashboard.
  - Resolves `notes.campaignId` and automatically creates/attributes orders in PostgreSQL.
- [x] **Task 4.3 — Secondary Email & Time-Window Attribution Service (`attributionService.js`)**
  - Matches customer email against executed campaigns within a 14-day attribution window.
  - Works with manual order imports (`POST /api/import/process`) and standard eCommerce checkouts.
- [x] **Task 4.4 — 1-Click Purchase Simulation Endpoint (`POST /api/track/simulate-purchase`)**
  - Postman/UI-ready endpoint that simulates an end-to-end customer purchase for any campaign recipient in 1 click.

---

### 📋 Phase 5: Honest Data-Driven Outcome & ROI Measurement
- [x] **Task 5.1 — Overhaul `measureCampaignResults` in `campaignService.js`**
  - Eliminate all fake random seed formulas (`seed = campaign.id * 17`).
  - Calculate metrics purely from live PostgreSQL database rows:
    - **Total Audience**: `campaign.audienceSize`
    - **Delivered**: `prisma.notificationSend.count({ where: { campaignId, emailSent: true } })`
    - **Opens**: `prisma.notificationSend.count({ where: { campaignId, openedAt: { not: null } } })`
    - **Clicks**: `prisma.notificationSend.count({ where: { campaignId, clickedAt: { not: null } } })`
    - **Conversions**: `prisma.order.count({ where: { campaignId } })`
    - **Actual Gross Revenue**: `prisma.order.aggregate({ where: { campaignId }, _sum: { totalPrice: true } })`
    - **Actual Discount Burn**: `prisma.order.aggregate({ where: { campaignId }, _sum: { discountAmount: true } })`
    - **Actual Delivery Cost**: $\text{Delivered Count} \times ₹0.50$ (standard email dispatch cost)
    - **Actual Net Revenue**: $\text{Gross Revenue} - \text{Discount Burn} - \text{Delivery Cost}$
    - **Actual ROI**: $\frac{\text{Actual Net Revenue}}{\text{Discount Burn} + \text{Delivery Cost}}$ (Honest `0.0x` if 0 orders)
- [x] **Task 5.2 — Persist Real Outcomes to `CampaignResult` and Update `Campaign`**
  - Save accurate numbers in `CampaignResult` and update `Campaign.actualRevenue`, `Campaign.actualCost`, `Campaign.actualRoi`.

---

### 📋 Phase 6: Frontend Results Page & Interactive Testing UI
- [x] **Task 6.1 — Interactive Email Preview & Test Dispatch Modal on Opportunity Page**
  - Modal displaying the rendered HTML email with customer selector.
  - Interactive Action Buttons:
    - *"Simulate Customer Open"* (fires open tracking pixel).
    - *"Simulate Customer Click"* (fires click tracking link).
    - *"Simulate Razorpay Test Payment"* (launches Razorpay test modal or 1-click purchase).
- [x] **Task 6.2 — Overhaul Campaign Results Page (`frontend/frontend/src/pages/CampaignResultsPage.jsx`)**
  - **Visual 5-Stage Conversion Funnel**:
    $$\text{Targeted Audience} \longrightarrow \text{Delivered} \longrightarrow \text{Opened} \longrightarrow \text{Clicked} \longrightarrow \text{Purchased}$$
  - **Predicted vs Actual KPI Comparison Cards**:
    - Revenue (Predicted vs Real Actual)
    - Conversion Rate (Predicted vs Real Actual)
    - Net Profit & ROI (Predicted vs Real Actual)
  - **Attributed Orders Table**:
    - Order #, Customer Name, Email, Items Purchased, Total Amount, Attribution Type, Date.
  - **Live Re-Measure / Sync Button**: Pulls latest real-time conversions from the database.

---

### 📋 Phase 7: Verification & Automated End-to-End Test Suite
- [x] **Task 7.1 — Automated Test Suite (`test-real-world-attribution.js`)**
  - Orchestrate & approve campaign $\rightarrow$ Execute campaign.
  - Verify email generation with unique tokens in `NotificationSend`.
  - Simulate open pixel call $\rightarrow$ verify `openedAt` set in database.
  - Simulate CTA click call $\rightarrow$ verify `clickedAt` set in database.
  - Simulate Razorpay test payment $\rightarrow$ verify order linked to campaign.
  - Measure results $\rightarrow$ verify exact mathematical match of gross revenue, discount, net profit, and ROI against database orders.
  - Verify 0-order scenario yields honest ₹0 and 0.0x ROI.

---

### 📋 Phase 8: Final Production Documentation Guide
- [x] **Task 8.1 — Production Setup & Testing Guide (`Docs/real-world-execution-and-attribution-guide.md`)**
  - Architecture Diagrams (SMTP Delivery, Tracking Pixels, Razorpay Checkout, Time-Window Matching, ROI Engine).
  - Environment Configuration Guide (`.env`).
  - Production SMTP Setup Guide (Gmail, Brevo, SendGrid, Amazon SES, Resend).
  - Razorpay Test & Live Mode Setup Guide (Webhooks & Custom Notes).
  - Complete Postman & cURL API Testing Catalog.
  - Verification Checklist & Database Queries.

---

## 5. Postman Request & Response Specifications

### 📮 Request 1: Execute Campaign & Dispatch Emails
```http
POST http://localhost:3000/api/campaigns/10/execute
Content-Type: application/json
x-demo-mode: true
```
**Response (200 OK):**
```json
{
  "campaign": {
    "id": 10,
    "name": "VIP Exclusive Loyalty & Early Access Campaign",
    "status": "running",
    "audienceSize": 56,
    "offerValue": 10
  },
  "razorpayOrder": {
    "id": "order_TVVJr7NWmaagZY",
    "amount": 13056173,
    "currency": "INR"
  },
  "notifications": {
    "sentCount": 56,
    "channel": "email"
  }
}
```

---

### 📮 Request 2: Inspect Sent Notifications & Tracking Tokens
```http
GET http://localhost:3000/api/campaigns/10/notifications
x-demo-mode: true
```
**Response (200 OK):**
```json
{
  "campaignId": 10,
  "totalSent": 56,
  "notifications": [
    {
      "id": 1,
      "customerId": 20,
      "customerEmail": "priya.sharma@example.com",
      "subject": "Exclusive 10% Off Your Next Restock",
      "trackingToken": "trk_9f8b7a6c5d4e3f2a",
      "openUrl": "http://localhost:3000/api/track/open/trk_9f8b7a6c5d4e3f2a",
      "clickUrl": "http://localhost:3000/api/track/click/trk_9f8b7a6c5d4e3f2a",
      "openedAt": null,
      "clickedAt": null
    }
  ]
}
```

---

### 📮 Request 3: Open Tracking Pixel
```http
GET http://localhost:3000/api/track/open/trk_9f8b7a6c5d4e3f2a
```
**Response (200 OK):**  
*Returns binary `image/gif` (1x1 transparent pixel) and marks `NotificationSend.openedAt` in DB.*

---

### 📮 Request 4: Click Tracking & Redirect
```http
GET http://localhost:3000/api/track/click/trk_9f8b7a6c5d4e3f2a?target=http%3A%2F%2Flocalhost%3A5173%2Fcheckout
```
**Response (302 Found):**  
*Sets cookie `argo_campaign_ref` and redirects to `http://localhost:5173/checkout?utm_campaign=10&argo_token=trk_9f8b7a6c5d4e3f2a`.*

---

### 📮 Request 5: Razorpay Test Payment Verification & Conversion
```http
POST http://localhost:3000/api/track/checkout/verify-payment
Content-Type: application/json
x-demo-mode: true

{
  "trackingToken": "trk_9f8b7a6c5d4e3f2a",
  "customerId": 20,
  "campaignId": 10,
  "items": [
    { "productId": 25, "quantity": 2, "unitPrice": 1499.00 }
  ],
  "razorpayPaymentId": "pay_test_987654321",
  "razorpayOrderId": "order_test_123456789",
  "discountPercent": 10
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "orderId": 108,
  "orderNumber": "ORD-2026-108",
  "totalPrice": 2698.20,
  "discountAmount": 299.80,
  "campaignId": 10,
  "attributionType": "razorpay_test"
}
```

---

### 📮 Request 6: Measure Honest Real-World Outcomes
```http
POST http://localhost:3000/api/campaigns/10/measure
Content-Type: application/json
x-demo-mode: true
```
**Response (200 OK):**
```json
{
  "campaignId": 10,
  "funnel": {
    "audienceSize": 56,
    "delivered": 56,
    "opened": 42,
    "clicked": 28,
    "conversions": 14
  },
  "financials": {
    "grossRevenue": 37774.80,
    "discountBurn": 4197.20,
    "emailSendCost": 28.00,
    "netRevenue": 33549.60,
    "actualRoi": 7.94
  },
  "attributedOrders": [
    {
      "orderId": 108,
      "orderNumber": "ORD-2026-108",
      "customerName": "Priya Sharma",
      "totalPrice": 2698.20,
      "discountAmount": 299.80,
      "attributionType": "razorpay_test",
      "createdAt": "2026-08-29T07:45:12.000Z"
    }
  ]
}
```

---

*This blueprint is ready for implementation across Phases 1 through 8 upon approval.*
