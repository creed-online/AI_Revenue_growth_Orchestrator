import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetchOpportunities = async (merchantId = 1) => {
  const response = await api.get(`/opportunities?merchantId=${merchantId}`);
  const payload = response.data;
  // Backend returns { merchantId, count, opportunities }
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.opportunities)) return payload.opportunities;
  return [];
};

export const fetchApprovals = async (merchantId = 1, status = "") => {
  const query = status
    ? `?merchantId=${merchantId}&status=${status}`
    : `?merchantId=${merchantId}`;
  const response = await api.get(`/approvals${query}`);
  return response.data;
};

export const runOrchestrator = async (merchantId = 1, opportunityIndex = 0) => {
  const response = await api.post("/orchestrator/run", {
    merchantId,
    opportunityIndex,
  });
  return response.data;
};

export const approveCampaignRequest = async (requestId, decidedBy = "merchant") => {
  const response = await api.post(`/approvals/${requestId}/approve`, { decidedBy });
  return response.data;
};

export const rejectCampaignRequest = async (requestId, decidedBy = "merchant") => {
  const response = await api.post(`/approvals/${requestId}/reject`, { decidedBy });
  return response.data;
};

export const executeCampaignOrder = async (campaignId) => {
  const response = await api.post(`/campaigns/${campaignId}/execute`);
  return response.data;
};

export const fetchAuditTrail = async (campaignId) => {
  const response = await api.get(`/campaigns/${campaignId}/audit-trail`);
  return response.data;
};

export default api;
