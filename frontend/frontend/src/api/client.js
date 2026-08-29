import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "argo_token";
const MERCHANT_KEY = "argo_merchant";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  let merchant = null;
  try {
    merchant = JSON.parse(localStorage.getItem(MERCHANT_KEY) || "null");
  } catch {
    merchant = null;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // If user explicitly chose demo mode, send header
  if (localStorage.getItem("argo_demo_mode") === "true") {
    config.headers["x-demo-mode"] = "true";
  }

  return config;
});

export function getStoredAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const merchant = JSON.parse(localStorage.getItem(MERCHANT_KEY) || "null");
    return { token, merchant };
  } catch {
    return { token: null, merchant: null };
  }
}

export function storeAuth(token, merchant) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(MERCHANT_KEY, JSON.stringify(merchant));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MERCHANT_KEY);
}

export const login = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const fetchMe = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const fetchOpportunities = async (merchantId) => {
  const query = merchantId ? `?merchantId=${merchantId}` : "";
  const response = await api.get(`/opportunities${query}`);
  const payload = response.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.opportunities)) return payload.opportunities;
  return [];
};

export const fetchOpportunity = async (productId, merchantId) => {
  const query = merchantId ? `?merchantId=${merchantId}` : "";
  const response = await api.get(`/opportunities/${productId}${query}`);
  return response.data;
};

export const fetchApprovals = async (merchantId, status = "") => {
  const params = new URLSearchParams();
  if (merchantId) params.set("merchantId", merchantId);
  if (status) params.set("status", status);
  const q = params.toString() ? `?${params}` : "";
  const response = await api.get(`/approvals${q}`);
  return response.data;
};

export const fetchApproval = async (id) => {
  const response = await api.get(`/approvals/${id}`);
  return response.data;
};

export const runOrchestrator = async (merchantId = 1, opportunityIndex = 0) => {
  const response = await api.post("/orchestrator/run", {
    merchantId,
    opportunityIndex,
  });
  return response.data;
};

export const simulateCampaign = async (opportunity, audience = []) => {
  const response = await api.post("/simulate-campaign", { opportunity, audience });
  return response.data;
};

export const approveCampaignRequest = async (requestId, decidedBy = "merchant") => {
  const response = await api.post(`/approvals/${requestId}/approve`, { decidedBy });
  return response.data;
};

export const rejectCampaignRequest = async (
  requestId,
  decidedBy = "merchant",
  reason
) => {
  const response = await api.post(`/approvals/${requestId}/reject`, {
    decidedBy,
    reason,
  });
  return response.data;
};

export const fetchCampaigns = async (merchantId, status = "") => {
  const params = new URLSearchParams();
  if (merchantId) params.set("merchantId", merchantId);
  if (status) params.set("status", status);
  const q = params.toString() ? `?${params}` : "";
  const response = await api.get(`/campaigns${q}`);
  const payload = response.data;
  if (Array.isArray(payload)) return payload;
  return payload?.campaigns || [];
};

export const fetchCampaign = async (campaignId) => {
  const response = await api.get(`/campaigns/${campaignId}`);
  return response.data;
};

export const executeCampaignOrder = async (campaignId) => {
  const response = await api.post(`/campaigns/${campaignId}/execute`);
  return response.data;
};

export const notifyCampaign = async (campaignId, channel = "email") => {
  const response = await api.post(`/campaigns/${campaignId}/notify`, { channel });
  return response.data;
};

export const fetchCampaignResults = async (campaignId) => {
  const response = await api.get(`/campaigns/${campaignId}/results`);
  return response.data;
};

export const measureCampaignResults = async (campaignId) => {
  const response = await api.post(`/campaigns/${campaignId}/measure`);
  return response.data;
};

export const fetchAuditTrail = async (campaignId) => {
  const response = await api.get(`/campaigns/${campaignId}/audit-trail`);
  return response.data;
};

export const deleteCampaign = async (campaignId) => {
  const response = await api.delete(`/campaigns/${campaignId}`);
  return response.data;
};

export const clearAllCampaigns = async () => {
  const response = await api.delete("/campaigns");
  return response.data;
};

export default api;
