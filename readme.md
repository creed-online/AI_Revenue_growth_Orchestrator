# ARGOES — AI Revenue & Growth Orchestrator

<div align="center">

**An autonomous AI-powered revenue engine for D2C merchants — [argoes.app](https://argoes.app)**  
Predict replenishment windows • Propose discount campaigns • Execute & attribute real-world results

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Powered by Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-F54E42?style=flat-square)](https://groq.com)
[![Prisma ORM](https://img.shields.io/badge/ORM-Prisma%207-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![Express.js](https://img.shields.io/badge/Backend-Express%205-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-072654?style=flat-square)](https://razorpay.com)

</div>

---

## 📋 Table of Contents

- [What is ARGO?](#what-is-argo)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Demo Mode)](#quick-start-demo-mode)
- [Full Setup Guide](#full-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Backend](#running-the-backend)
  - [Running the Frontend](#running-the-frontend)
- [How to Use ARGO](#how-to-use-argo)
  - [1. Demo Mode](#1-demo-mode)
  - [2. Import Your Own Data](#2-import-your-own-data)
  - [3. Review Opportunities](#3-review-opportunities)
  - [4. Approve & Execute Campaigns](#4-approve--execute-campaigns)
  - [5. Measure Results](#5-measure-results)
- [API Reference](#api-reference)
- [Demo CSV Files](#demo-csv-files)
- [Environment Variables Reference](#environment-variables-reference)
- [Architecture](#architecture)
- [License](#license)

---

## 🤖 What is ARGO?

**ARGO** is an autonomous AI revenue orchestration platform built for D2C (Direct-to-Consumer) merchants. It connects to your customer and order data, identifies replenishment and re-engagement opportunities using AI, proposes optimised discount campaigns with full policy guardrails, and then executes them — sending real emails, tracking opens/clicks, and attributing payments.

> Built for **Razorpay Buildathon Track 01** — demonstrates a complete agentic AI loop: sense → reason → propose → approve → execute → measure.

### The ARGO Loop

```
Customer Order Data  →  AI Replenishment Scan  →  Opportunity Feed
        ↓
  AI Orchestrator (Groq Llama 3.3)  →  Policy Guardrail Check
        ↓
  Merchant: Approve / Reject
        ↓
  Campaign Execution (Email + Tracking Tokens)
        ↓
  Razorpay Payment Attribution  →  Real Revenue Measurement
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **AI Opportunity Engine** | Detects replenishment windows by analysing order intervals, cohort behaviour, and product cycle data |
| 🌐 **3D Customer Retention Galaxy** | WebGL globe showing customer segments (VIPs, At-Risk, Price Sensitive) in interactive 3D |
| 💡 **AI Strategy Streaming** | Groq Llama 3.3 streams reasoning live as it evaluates discount tiers and policy compliance |
| 🛡️ **Policy Guardrails** | Hard-coded merchant policy engine prevents margin-destroying discounts (configurable cap) |
| ✅ **Merchant Approval Gate** | No campaign executes without explicit Approve then Execute from the merchant |
| 📧 **Universal SMTP Dispatch** | Real email delivery with click-tracking pixels, voucher codes, and live delivery logs |
| 💳 **Razorpay Attribution** | Test-mode Razorpay checkout attributes purchases back to specific campaigns |
| 📈 **3D Conversion Funnel** | Glass isometric 3D funnel: Audience → Delivered → Opened → Clicked → Purchased |
| 🗂️ **AI Schema Matcher** | Upload any CSV — AI maps your columns to the internal schema with confidence scores |
| ⌨️ **Command Palette** | Cmd+K global search across pages, quick actions, and workspace switching |
| 📄 **PDF Report Export** | One-click branded executive PDF report for any campaign |
| 📱 **Mobile First** | Swipe-to-orchestrate on cards, bottom navigation dock, responsive card views |
| 🔔 **Notification Preferences** | Per-customer Email / SMS / WhatsApp digest scheduling and quiet hours |

---

## 🛠 Tech Stack

### Frontend

| Technology | Role |
|---|---|
| **React 19** | UI framework |
| **Vite** | Build tool and dev server (port `5173`) |
| **Tailwind CSS v4** | Utility-first styling with custom dark design system |
| **Framer Motion** | Animations, page transitions, swipe gestures |
| **@react-three/fiber + Three.js** | 3D WebGL visualisations (Galaxy, Funnel, Schema Matcher) |
| **TanStack Query v5** | Server state, caching, optimistic mutations |
| **Recharts** | Bar charts and comparison visualisations |
| **jsPDF** | Client-side PDF report generation |
| **canvas-confetti** | Celebration micro-interactions |

### Backend

| Technology | Role |
|---|---|
| **Express.js v5** | REST API server (port `3000`) |
| **Prisma ORM v7** | Type-safe database access |
| **Prisma Postgres** | Managed PostgreSQL database |
| **Groq SDK** | Llama 3.3 AI reasoning and campaign proposal generation |
| **Anthropic SDK** | Claude fallback for complex reasoning |
| **Nodemailer** | SMTP email dispatch with tracking |
| **Razorpay SDK** | Payment order creation and webhook attribution |
| **JWT + bcrypt** | Authentication and merchant session management |
| **Multer** | CSV file upload handling |

---

## 📁 Project Structure

```
AI Revenue growth Orchestrator/
├── backend/
│   └── src/
│       ├── index.js                     # Express app entry point
│       ├── routes/                      # API route handlers
│       │   ├── auth-route.js
│       │   ├── orchestrator-route.js
│       │   ├── approval-route.js
│       │   ├── campaign-route.js
│       │   ├── campaigns-route.js
│       │   ├── opportunities-route.js
│       │   ├── import-route.js
│       │   ├── schema-route.js
│       │   ├── tracking-route.js
│       │   ├── razorpay-execution-route.js
│       │   └── notificationPrefsRoute.js
│       ├── services/                    # Business logic
│       │   ├── orchestratorService.js   # AI campaign proposal
│       │   ├── approvalService.js       # Approve/reject lifecycle
│       │   ├── emailService.js          # SMTP dispatch
│       │   └── authService.js           # JWT auth
│       ├── middleware/
│       │   └── auth.js                 # requireMerchantAccess guard
│       └── lib/
│           └── prisma.js               # Prisma client singleton
│
├── frontend/frontend/
│   ├── public/
│   │   └── argo-logo.png              # App logo (navbar + favicon)
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── AppLayout.jsx
│       │   ├── CommandPalette.jsx
│       │   ├── MobileActionDock.jsx
│       │   ├── OpportunityFeed.jsx
│       │   ├── ThreeCustomerGlobe.jsx       # 3D retention galaxy
│       │   ├── ThreeConversionFunnel.jsx    # 3D glass funnel
│       │   ├── ThreeVectorMatcher.jsx       # 3D schema neural field
│       │   ├── AiStrategyStreamer.jsx
│       │   ├── InteractiveProfitSlider.jsx
│       │   └── CampaignEmailSimulatorModal.jsx
│       ├── pages/
│       │   ├── DashboardPage.jsx
│       │   ├── OpportunityDetailPage.jsx
│       │   ├── CampaignResultsPage.jsx
│       │   ├── ImportDataPage.jsx
│       │   ├── NotificationPreferencesPage.jsx
│       │   └── AuditTrailPage.jsx
│       ├── api/client.js               # Axios API client
│       ├── context/AuthContext.jsx
│       └── utils/
│           ├── confetti.js             # Celebration fireworks
│           └── exportPDF.js            # jsPDF report generator
│
├── prisma/
│   └── schema.prisma                  # Database schema
├── .env                               # Environment variables (never commit)
├── demo_customers_dataset.csv         # Sample customer data
├── demo_orders_dataset.csv            # Sample order data
└── Docs/                              # Planning and enhancement docs
```

---

## ⚡ Quick Start (Demo Mode)

The fastest way to explore ARGO. Uses a pre-seeded demo fitness supplement store.

### Step 1 — Clone the repository

```bash
git clone <your-repo-url>
cd "AI Revenue growth Orchestrator"
```

### Step 2 — Create your .env file

Create `.env` in the project root:

```env
PORT=3000
DATABASE_URL="postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require"
GROQ_API_KEY="gsk_..."
```

### Step 3 — Start the Backend

```bash
cd backend
npm install
npm run dev
# Server starts on http://localhost:3000
```

### Step 4 — Start the Frontend (in a new terminal)

```bash
cd frontend/frontend
npm install
npm run dev
# Vite starts on http://localhost:5173
```

### Step 5 — Open and explore

Visit **http://localhost:5173** and click **"Try Demo"**.

---

## 🔧 Full Setup Guide

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Prisma Postgres** database — free tier at [prisma.io](https://prisma.io)
- A **Groq API key** — free at [console.groq.com](https://console.groq.com)
- Optional: **Razorpay** test account, **Gmail** SMTP credentials

---

### Environment Variables

Create a `.env` file in the **project root** (same level as `/backend` and `/frontend`):

```env
# Server
PORT=3000

# Database
DATABASE_URL="postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require"

# AI Models
GROQ_API_KEY="gsk_..."
ANTHROPIC_API_KEY="sk-ant-..."         # Optional

# Razorpay (test mode)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."

# SMTP Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"          # Gmail App Password, not your real password
SMTP_FROM="ARGO <your@gmail.com>"
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords → Mail

---

### Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: seed demo data
npx prisma db seed
```

---

### Running the Backend

```bash
cd backend
npm install
npm run dev          # Hot-reload dev server
# OR
npm start            # Production mode
```

Starts on **http://localhost:3000**

---

### Running the Frontend

```bash
cd frontend/frontend
npm install
npm run dev          # Vite dev server with HMR
# OR
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

Starts on **http://localhost:5173**

Vite automatically proxies all `/api/*` requests to `localhost:3000` in development.

---

## 📖 How to Use ARGO

### 1. Demo Mode

1. Visit `http://localhost:5173`
2. Click **"Try Demo"** — no registration needed
3. Logged in as **RakshFit** (a demo fitness supplements merchant)
4. Explore the Dashboard, Opportunity Feed, and sample campaigns

---

### 2. Import Your Own Data

1. Navigate to **Import CSV** from the navbar or `Cmd+K`
2. Upload your **customers CSV** — needs at minimum: `name`, `email`
3. Upload your **orders CSV** — needs at minimum: customer identifier, `order_date`, `total_amount`, `product_name`
4. AI Schema Matcher maps your columns automatically — review in the 3D neural field
5. Click **"Confirm & Import"** — data indexes and AI analysis starts immediately

Demo CSV files included in root:
- `demo_customers_dataset.csv`
- `demo_orders_dataset.csv`
- `retail_store_customers_demo.csv`
- `retail_store_orders_demo.csv`

---

### 3. Review Opportunities

1. Go to **Overview (Dashboard)** → scroll to Opportunity Feed
2. Each card shows: product, audience size, AI confidence %, and potential revenue
3. Click **"Review"** to open the detail page:
   - AI Simulation Chart — net revenue across discount tiers
   - Interactive Profit Slider — real-time margin impact
   - Target Customer Table — who will receive the campaign

> On mobile: swipe cards **right to orchestrate**, **left to snooze**

---

### 4. Approve and Execute Campaigns

| Step | Action | Result |
|---|---|---|
| 1 | Click **"Ask AI to Propose Campaign"** | Groq Llama 3.3 evaluates and streams reasoning |
| 2 | Review the AI strategy and policy check | See offer value, audience, expected revenue |
| 3 | Click **"Approve Proposal"** | Campaign status → `approved`; confetti fires 🎉 |
| 4 | Click **"Execute Campaign Now"** | Real emails dispatched; live dispatch log appears |
| 5 | (Optional) Use **"Interactive Testing Lab"** | Simulate opens, clicks, and Razorpay test payments |

---

### 5. Measure Results

1. Go to **Campaigns** → find your campaign → **"View Results"**
2. See the **5-stage 3D Conversion Funnel**
3. Review **Predicted vs. Actual** performance chart
4. Check **Attributed Orders** table
5. Click **"Export PDF Report"** for a branded executive summary
6. Click **"Audit Trail"** for the full immutable decision ledger

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/demo-session
```

### Opportunities
```
GET /api/opportunities?merchantId=1
GET /api/opportunities/:productId?merchantId=1
```

### AI Orchestrator
```
POST /api/orchestrate
Body: { merchantId, opportunityIndex }
```

### Approvals
```
GET  /api/approvals
GET  /api/approvals/:id
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
```

### Campaigns
```
GET  /api/campaigns?merchantId=1
GET  /api/campaigns/:id
POST /api/campaigns/:id/execute
GET  /api/campaigns/:id/results
GET  /api/campaigns/:id/audit
```

### Import and Schema Matching
```
POST /api/import/customers     (multipart/form-data)
POST /api/import/orders        (multipart/form-data)
POST /api/schema/match         (AI column matching)
POST /api/schema/feedback      (learning feedback loop)
```

### Tracking
```
GET /api/track/open/:token     (email open pixel)
GET /api/track/click/:token    (link click redirect)
```

### Notification Preferences
```
GET  /api/customers/notification-prefs
PUT  /api/customers/notification-prefs
GET  /api/customers/notification-prefs/:customerId
PUT  /api/customers/notification-prefs/:customerId
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Backend port — default `3000` |
| `DATABASE_URL` | **Yes** | Prisma Postgres connection string |
| `GROQ_API_KEY` | **Yes** | Groq API key for Llama 3.3 |
| `ANTHROPIC_API_KEY` | No | Anthropic Claude fallback |
| `RAZORPAY_KEY_ID` | No | Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | No | Razorpay test key secret |
| `SMTP_HOST` | No | SMTP server host |
| `SMTP_PORT` | No | SMTP port — `587` for TLS |
| `SMTP_USER` | No | SMTP username / email address |
| `SMTP_PASS` | No | SMTP password or app password |
| `SMTP_FROM` | No | From display name and email |

> Without Razorpay and SMTP credentials the system runs in simulation mode — all AI features still work fully.

---

## 🏛 Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Browser (Vite + React)              │
│  Dashboard · Opportunities · Campaigns · Import      │
│  3D Visuals (Three.js) · Command Palette · PDF       │
└──────────────────────┬───────────────────────────────┘
                       │  HTTP /api/*
┌──────────────────────▼───────────────────────────────┐
│             Express.js API (port 3000)               │
│  Auth · Orchestrator · Approvals · Campaigns         │
│  Import · Schema · Tracking · Notifications          │
└──────┬───────────────┬──────────────┬────────────────┘
       │               │              │
┌──────▼──────┐  ┌─────▼──────┐  ┌───▼──────────┐
│  Prisma DB  │  │  Groq AI   │  │  Razorpay    │
│  (Postgres) │  │ Llama 3.3  │  │  + SMTP      │
└─────────────┘  └────────────┘  └──────────────┘
```

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built for **Razorpay Buildathon 2025** • ARGO — AI Revenue & Growth Orchestrator

</div>
