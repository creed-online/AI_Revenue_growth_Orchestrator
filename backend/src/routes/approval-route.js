// src/routes/approval-route.js
import express from "express";
import {
  listApprovalRequests,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
} from "../services/approvalService.js";

const router = express.Router();

// GET /api/approvals?merchantId=1&status=pending
router.get("/", async (req, res) => {
  const merchantId = Number(req.query.merchantId) || 1;
  const status = req.query.status; // optional
  const requests = await listApprovalRequests(merchantId, status);
  res.json(requests);
});

// GET /api/approvals/:id
router.get("/:id", async (req, res) => {
  const request = await getApprovalRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "not_found" });
  res.json(request);
});

// POST /api/approvals/:id/approve
router.post("/:id/approve", async (req, res) => {
  const result = await approveRequest(req.params.id, req.body?.decidedBy);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// POST /api/approvals/:id/reject
router.post("/:id/reject", async (req, res) => {
  const result = await rejectRequest(req.params.id, req.body?.decidedBy);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

export default router;