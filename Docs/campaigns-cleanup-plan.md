# Campaigns Page Data Integrity & Reset Architecture Plan

## 1. Problem Analysis & Root Cause

### Root Cause
1. **Persistent Seed / Prior Test Records in PostgreSQL Database**:
   - In `PostgreSQL`, table `public.Campaign` currently contains **7 historical campaigns** (IDs 1 through 7) created during previous testing on August 26/27.
   - When `CampaignsPage.jsx` mounts, it calls `GET /api/campaigns?merchantId=1`, which queries `prisma.campaign.findMany({ where: { merchantId: 1 } })` and returns these 7 historical campaigns.
2. **No User-Facing Reset or Deletion Controls**:
   - The backend currently lacks `DELETE /api/campaigns` (to purge test campaigns) and `DELETE /api/campaigns/:id` (to delete individual campaigns).
   - The merchant has no way from the UI to reset their campaign workspace to a clean state after testing.
3. **Cascading Relational Dependencies**:
   - In `schema.prisma`, `Campaign` has relational children: `CampaignVariant`, `ApprovalRequest`, `CampaignResult`, and `NotificationSend`.
   - Deleting campaigns requires a safe transactional cascade delete so no foreign key constraint violations occur.

---

## 2. Target State & Architecture

```
                                 MERCHANT CAMPAIGN CONTROL LOOP
                                 
  [CampaignsPage.jsx] ────────────► "Clear History" or "Delete" ────────────┐
          ▲                                                                 │
          │                                                                 ▼
  [Live UI Invalidation] ◄─── [HTTP 200 OK] ◄─── [Transactional Cascade Delete]
  (queryClient.invalidate)                       - NotificationSend
                                                 - CampaignResult
                                                 - CampaignVariant
                                                 - ApprovalRequest
                                                 - Campaign
```

---

## 3. End-to-End Implementation Plan

### 📋 Phase 1: Backend Deletion & Cascade Clean-Up APIs
- [ ] **Task 1.1 — Implement `deleteCampaign` & `clearAllCampaigns` in `campaignService.js`**
  - Safely delete related `NotificationSend`, `CampaignResult`, `CampaignVariant`, and `ApprovalRequest` records inside `prisma.$transaction`.
- [ ] **Task 1.2 — Expose `DELETE /api/campaigns` & `DELETE /api/campaigns/:id` in `campaigns-route.js`**
  - Add merchant isolation checks and return `{ success: true, deletedCount }`.

### 📋 Phase 2: Frontend Client & UI Controls
- [ ] **Task 2.1 — Add API client methods in `frontend/frontend/src/api/client.js`**
  - `deleteCampaign(id, merchantId)`
  - `clearAllCampaigns(merchantId)`
- [ ] **Task 2.2 — Update `CampaignsPage.jsx` with Delete & Reset Controls**
  - Add **"Clear All Campaigns"** header action with confirmation modal.
  - Add individual **Delete / Trash** button on each campaign card.
  - Invalidate `["campaigns"]` and `["dashboard"]` queries upon deletion.
  - Render an engaging **Zero-State Empty View** with CTA to `/dashboard` to launch fresh campaigns.

### 📋 Phase 3: Automated Verification & Testing
- [ ] **Task 3.1 — Purge old seed campaigns**
  - Reset merchant 1 campaign table to 0.
- [ ] **Task 3.2 — End-to-End Orchestration Cycle Test**
  - Verify `CampaignsPage` starts at 0 campaigns.
  - Orchestrate an opportunity from the live Opportunity Feed (`POST /api/orchestrator/run`).
  - Verify exactly 1 campaign appears with status `pending_approval`.
  - Approve and execute campaign.
  - Delete campaign and verify clean return to 0 state.

