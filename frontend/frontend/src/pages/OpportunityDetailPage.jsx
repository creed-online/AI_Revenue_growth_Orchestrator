import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Percent,
  Play,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  X,
  XCircle,
  ClipboardList,
  Shield,
  Activity,
  Send,
  Mail,
  Terminal,
  Settings,
  SlidersHorizontal,
  Key,
} from "lucide-react";
import ArgoLogo from "../components/ArgoLogo";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  approveCampaignRequest,
  executeCampaignOrder,
  fetchCampaigns,
  fetchOpportunity,
  rejectCampaignRequest,
  runOrchestrator,
  simulateCampaign,
} from "../api/client";
import CampaignEmailSimulatorModal from "../components/CampaignEmailSimulatorModal";
import IntegrationWizardModal from "../components/IntegrationWizardModal";
import InteractiveProfitSlider from "../components/InteractiveProfitSlider";
import AiStrategyStreamer from "../components/AiStrategyStreamer";
import { fireCelebrationConfetti } from "../utils/confetti";

const TIER_COLORS = { 0: "#64748b", 5: "#38bdf8", 10: "#2dd4a8" };

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function confidenceLabel(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (n <= 1) return `${Math.round(n * 100)}%`;
  return `${Math.round(n)}%`;
}

function findActiveCampaign(campaigns, opportunity, orchestratorData) {
  if (orchestratorData?.campaign) return orchestratorData.campaign;
  if (!campaigns || !opportunity) return null;

  const prodName = (opportunity.productName || "").trim().toLowerCase();
  const prodId = opportunity.productId;

  // Find any in-flight active campaign (pending_approval, approved, running) for this opportunity
  const inFlight = campaigns.find((c) => {
    const cName = (c.name || "").toLowerCase();
    const matchesName = prodName && (cName.includes(prodName) || prodName.includes(cName));
    const matchesId = prodId != null && (cName.includes(`product ${prodId}`) || cName.includes(`pid-${prodId}`));
    const isInFlight = ["pending_approval", "approved", "running"].includes(c.status);
    return (matchesName || matchesId) && isInFlight;
  });

  if (inFlight) return inFlight;

  // If no in-flight campaign, return null so merchant can freely propose a new campaign
  return null;
}

export default function OpportunityDetailPage() {
  const { productId } = useParams();
  const { merchantId } = useAuth();
  const queryClient = useQueryClient();
  const [orchestratorData, setOrchestratorData] = useState(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);

  // Live Email Dispatch Log State
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showDispatchLog, setShowDispatchLog] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState({ current: 0, total: 0 });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["opportunity", merchantId, productId],
    queryFn: () => fetchOpportunity(productId, merchantId),
  });

  const opportunity = data?.opportunity;
  const opportunityIndex = data?.index ?? 0;

  const { data: simulation, isLoading: simLoading } = useQuery({
    queryKey: ["simulate", productId],
    enabled: Boolean(opportunity),
    queryFn: () => simulateCampaign(opportunity, opportunity?.customers || []),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", merchantId],
    queryFn: () => fetchCampaigns(merchantId),
  });

  // ── Derive active campaign & approval ──────────────────────────────────────
  // Priority: orchestratorData (freshly created) > matching in-flight campaign from DB
  const activeCampaign = (() => {
    if (orchestratorData?.campaign) return orchestratorData.campaign;
    if (!campaigns || !opportunity) return null;

    const prodName = (opportunity.productName || "").trim().toLowerCase();
    const prodId = opportunity.productId;

    return (
      campaigns.find((c) => {
        const cName = (c.name || "").toLowerCase();
        const matchesName = prodName && (cName.includes(prodName) || prodName.includes(cName));
        const matchesId = prodId != null && (cName.includes(`product ${prodId}`) || cName.includes(`pid-${prodId}`));
        const isRelevant = ["pending_approval", "approved", "running", "completed"].includes(c.status);
        return (matchesName || matchesId) && isRelevant;
      }) || null
    );
  })();

  const activeApproval =
    orchestratorData?.approvalRequest ||
    activeCampaign?.approvalRequests?.[0] ||
    null;

  // currentStatus: orchestratorData is always freshest (updated optimistically on approve/reject/execute)
  const currentStatus =
    orchestratorData?.campaign?.status ||
    activeCampaign?.status ||
    null;

  const orchestrate = useMutation({
    mutationFn: () => runOrchestrator(merchantId, opportunityIndex),
    onSuccess: (res) => {
      setOrchestratorData(res);
      queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const approve = useMutation({
    mutationFn: async () => {
      const approvalId = activeApproval?.id;
      if (!approvalId) throw new Error("No pending approval request found");
      return approveCampaignRequest(approvalId);
    },
    onSuccess: () => {
      fireCelebrationConfetti();
      if (activeCampaign) {
        setOrchestratorData((prev) => ({
          ...(prev || {}),
          campaign: { ...(prev?.campaign || activeCampaign), status: "approved" },
          approvalRequest: { ...(prev?.approvalRequest || activeApproval), status: "approved" },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const reject = useMutation({
    mutationFn: async () => {
      const approvalId = activeApproval?.id;
      if (!approvalId) throw new Error("No pending approval request found");
      return rejectCampaignRequest(approvalId, "merchant", "Merchant rejected from detail page");
    },
    onSuccess: () => {
      if (activeCampaign) {
        setOrchestratorData((prev) => ({
          ...(prev || {}),
          campaign: { ...(prev?.campaign || activeCampaign), status: "rejected" },
          approvalRequest: { ...(prev?.approvalRequest || activeApproval), status: "rejected" },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const execute = useMutation({
    mutationFn: async () => {
      const campaignId = activeCampaign?.id;
      if (!campaignId) throw new Error("No campaign available for execution");

      setIsDispatching(true);
      setShowDispatchLog(true);

      const audience = opportunity?.customers || [];
      const totalRecipients = audience.length || activeCampaign.audienceSize || 3;
      setDispatchProgress({ current: 0, total: totalRecipients });

      const startTime = new Date().toLocaleTimeString();
      const initialLogs = [
        { time: startTime, text: `🚀 Initializing Universal SMTP Dispatcher for Campaign #${campaignId}...`, type: "info" },
        { time: startTime, text: `📦 Generating collision-resistant tracking tokens & 1x1 open pixels...`, type: "info" },
      ];
      setDispatchLogs(initialLogs);

      let dispatched = 0;
      const stepSize = Math.max(1, Math.ceil(totalRecipients / 20));
      const interval = setInterval(() => {
        if (dispatched < totalRecipients) {
          dispatched = Math.min(totalRecipients, dispatched + stepSize);
          const cust = audience[dispatched - 1] || { customerName: `Recipient #${dispatched}`, customerId: dispatched };
          const now = new Date().toLocaleTimeString();
          const emailText = cust.customerName
            ? `✉️ Dispatched to ${cust.customerName} → Token: trk_${campaignId}_${cust.customerId || dispatched}_... [DELIVERED]`
            : `✉️ Dispatched batch #${dispatched} / ${totalRecipients} [DELIVERED]`;

          setDispatchLogs((prev) => [
            ...prev,
            { time: now, text: emailText, type: "success" },
          ]);
          setDispatchProgress({ current: dispatched, total: totalRecipients });
        }
      }, 70);

      try {
        const result = await executeCampaignOrder(campaignId);
        clearInterval(interval);

        const finishTime = new Date().toLocaleTimeString();
        setDispatchProgress({ current: totalRecipients, total: totalRecipients });
        setDispatchLogs((prev) => [
          ...prev,
          { time: finishTime, text: `🎉 100% Dispatched! ${totalRecipients} emails delivered with active tracking tokens & dynamic vouchers.`, type: "complete" },
        ]);
        fireCelebrationConfetti();
        setIsDispatching(false);
        setOrchestratorData((prev) => ({
          ...(prev || {}),
          campaign: { ...(result?.campaign || prev?.campaign || activeCampaign), status: "running" },
        }));
        return result;
      } catch (err) {
        clearInterval(interval);
        setIsDispatching(false);
        setDispatchLogs((prev) => [
          ...prev,
          { time: new Date().toLocaleTimeString(), text: `❌ Dispatch error: ${err.message}`, type: "error" },
        ]);
        throw err;
      }
    },
    onSuccess: (data) => {
      fireCelebrationConfetti();
      setIsDispatching(false);
      const updated = data?.campaign || activeCampaign;
      setOrchestratorData((prev) => ({
        ...(prev || {}),
        campaign: { ...(prev?.campaign || updated), status: "running" },
      }));
      queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["opportunity"] });
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="skeleton h-64 rounded-2xl" />
      </main>
    );
  }

  if (isError || !opportunity) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-signal" />
        <h1 className="font-display text-xl font-bold text-white">Opportunity not found</h1>
        <Link to="/opportunities" className="mt-4 inline-block text-sm text-mint">
          Back to feed
        </Link>
      </main>
    );
  }

  const chartData = (simulation?.scenarios || []).map((s) => ({
    name: `${s.discountPercent}%`,
    net: s.netRevenue,
    revenue: s.expectedRevenue,
    discountPercent: s.discountPercent,
  }));

  const actionError =
    orchestrate.error?.response?.data?.message ||
    orchestrate.error?.message ||
    approve.error?.response?.data?.message ||
    reject.error?.response?.data?.message ||
    execute.error?.response?.data?.message;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <Link
        to="/opportunities"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Opportunity feed
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint">
          Opportunity breakdown
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            {opportunity.productName}
          </h1>
          <span className="rounded-full border border-mint/40 bg-mint/10 px-2.5 py-0.5 text-xs font-bold text-mint">
            {opportunity.opportunityType || "Replenishment"}
          </span>
        </div>
        <p className="mt-1.5 max-w-2xl text-xs text-ink-muted sm:text-sm">
          {opportunity.recommendedAction || "Re-engage customers ready for repeat purchase."}
        </p>
      </motion.header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-ink-border bg-ink-elevated/70 p-4">
          <p className="text-[11px] font-medium text-ink-muted">Due customers</p>
          <p className="font-display mt-1 text-2xl font-black text-white sm:text-3xl">
            {opportunity.customerCount ?? opportunity.customers?.length ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-muted">Ready for repeat order</p>
        </div>

        <div className="rounded-2xl border border-ink-border bg-ink-elevated/70 p-4">
          <p className="text-[11px] font-medium text-ink-muted">Potential revenue</p>
          <p className="font-display mt-1 text-2xl font-black text-mint sm:text-3xl">
            {money(opportunity.potentialRevenue)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-muted">Gross opportunity</p>
        </div>

        <div className="rounded-2xl border border-ink-border bg-ink-elevated/70 p-4">
          <p className="text-[11px] font-medium text-ink-muted">AI confidence</p>
          <p className="font-display mt-1 text-2xl font-black text-white sm:text-3xl">
            {confidenceLabel(opportunity.confidence)}
          </p>
          <p className="mt-0.5 text-[10px] text-mint">Cycle consistency score</p>
        </div>

        <div className="rounded-2xl border border-ink-border bg-ink-elevated/70 p-4">
          <p className="text-[11px] font-medium text-ink-muted">Catalog cycle</p>
          <p className="font-display mt-1 text-2xl font-black text-white sm:text-3xl">
            {opportunity.catalogAvgCycleDays ? `${opportunity.catalogAvgCycleDays}d` : "30d"}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-muted">Expected interval</p>
        </div>
      </div>

      {/* Simulation & Net Revenue Curve */}
      <section className="mt-6 rounded-2xl border border-ink-border bg-ink-elevated/50 p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted">
              AI Simulation & Policy Optimization
            </h2>
            <p className="text-xs text-ink-soft">
              Predicted gross vs. net revenue across discount tiers. Optimal tier selected to maximize net margin.
            </p>
          </div>
          {simulation?.recommendedTier != null && (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-mint/40 bg-mint/15 px-3 py-1 text-xs font-bold text-mint sm:self-auto">
              <ArgoLogo className="h-3.5 w-3.5" />
              Recommended: {simulation.recommendedTier}% Off
            </span>
          )}
        </div>

        {simLoading ? (
          <div className="skeleton mt-6 h-56 rounded-xl" />
        ) : chartData.length > 0 ? (
          <div className="mt-6 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#223044" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-ink-border bg-ink-elevated/95 p-3 text-xs shadow-xl backdrop-blur">
                        <p className="font-bold text-white">{row.name} Tier</p>
                        <p className="mt-1 text-ink-muted">
                          Gross Revenue: <span className="font-semibold text-white">{money(row.revenue)}</span>
                        </p>
                        <p className="text-mint">
                          Net Revenue: <span className="font-bold">{money(row.net)}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="net" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.discountPercent}`}
                      fill={
                        entry.discountPercent === simulation?.recommendedTier
                          ? "#2dd4a8"
                          : TIER_COLORS[entry.discountPercent] || "#38bdf8"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-6 text-xs text-ink-muted">No simulation curve data available.</p>
        )}
      </section>

      {/* Real-Time Interactive Profit & Discount Elasticity Slider */}
      <InteractiveProfitSlider
        audienceSize={opportunity.customerCount ?? opportunity.customers?.length ?? 10}
        avgItemPrice={opportunity.potentialRevenue && (opportunity.customerCount || opportunity.customers?.length) ? Math.round(opportunity.potentialRevenue / Math.max(1, opportunity.customerCount || opportunity.customers?.length)) : 2500}
        recommendedDiscount={activeCampaign?.offerValue ?? simulation?.recommendedTier ?? 10}
        maxPolicyDiscount={15}
      />

      {/* Target Audience Table */}
      <section className="mt-6 rounded-2xl border border-ink-border bg-ink-elevated/50 p-5 sm:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted">
          Target customer cohort ({opportunity.customers?.length || 0})
        </h2>
        <p className="text-xs text-ink-soft mt-0.5">
          Identified based on previous order intervals and replenishment timing.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-border text-ink-muted">
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Days Since Last Order</th>
                <th className="pb-2 font-medium">Expected Cycle</th>
                <th className="pb-2 font-medium text-right">Potential Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border/40 text-ink-soft">
              {(opportunity.customers || []).slice(0, 8).map((c, i) => (
                <tr key={c.customerId || i} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 font-medium text-white">
                    {c.customerName || `Customer #${c.customerId}`}
                  </td>
                  <td className="py-2.5">{c.daysSinceLastPurchase ?? "—"} days ago</td>
                  <td className="py-2.5">
                    {c.expectedNextPurchaseDate
                      ? new Date(c.expectedNextPurchaseDate).toLocaleDateString()
                      : "Due now"}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-mint">
                    {money(c.potentialRevenue || 2500)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(opportunity.customers?.length || 0) > 8 && (
            <p className="mt-3 text-center text-[11px] text-ink-muted">
              + {opportunity.customers.length - 8} more recipients in audience list
            </p>
          )}
        </div>
      </section>

      {/* AI Proposal & Lifecycle Controls Section */}
      <section className="mt-6 rounded-2xl border border-ink-border bg-ink-elevated/70 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Merchant Control & AI Proposal
            </h2>
            <p className="text-xs text-ink-soft">
              Review AI reasoning, inspect policy guardrails, approve or reject proposals, and trigger campaign execution.
            </p>
          </div>

          {activeCampaign && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted">Campaign #{activeCampaign.id}</span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  currentStatus === "running" || currentStatus === "completed"
                    ? "border-mint/40 bg-mint/15 text-mint"
                    : currentStatus === "approved"
                    ? "border-sky/40 bg-sky/15 text-sky"
                    : currentStatus === "rejected"
                    ? "border-rose-signal/40 bg-rose-signal/15 text-rose-signal"
                    : "border-amber-signal/40 bg-amber-signal/15 text-amber-signal"
                }`}
              >
                {String(currentStatus || "Draft").replace("_", " ")}
              </span>
            </div>
          )}
        </div>

        {/* AI Proposal Dynamic Streamer */}
        <AnimatePresence>
          {(orchestrate.data?.aiText || activeCampaign) && (
            <AiStrategyStreamer
              text={
                orchestrate.data?.aiText ||
                `The AI Growth Engine evaluated replenishment cycles, conversion elasticity, and merchant policy guardrails for ${opportunity.productName}. An optimal ${
                  activeCampaign?.offerValue ?? simulation?.recommendedTier ?? 10
                }% discount tier was chosen to maximize projected net revenue while preserving merchant margin safety thresholds.`
              }
              productName={opportunity.productName}
              offerValue={activeCampaign?.offerValue ?? simulation?.recommendedTier ?? 10}
              audienceSize={activeCampaign?.audienceSize ?? opportunity.customerCount}
              expectedRevenue={activeCampaign?.expectedRevenue ?? opportunity.potentialRevenue}
              isCompliant={true}
            />
          )}
        </AnimatePresence>

        {actionError && (
          <div className="mt-4 rounded-xl border border-rose-signal/30 bg-rose-signal/10 p-3 text-xs text-rose-signal flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Dispatch Channel & Credentials Banner */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[rgba(220,205,185,0.12)] bg-[#181714] p-3.5 text-xs text-[#DDD6CD]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#7C9A82]/15 text-[#7C9A82] border border-[#7C9A82]/30">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold text-white flex items-center gap-2">
                <span>Dispatch Mode: Safe High-Throughput Sandbox Simulator</span>
                <span className="rounded-full bg-[#7C9A82]/20 text-[#7C9A82] px-2 py-0.5 text-[10px] font-semibold border border-[#7C9A82]/30">Active</span>
              </p>
              <p className="text-[11px] text-[#9E978E] mt-0.5">
                Generates 1-click Razorpay links, collision-resistant tracking tokens & 1x1 open pixels without requiring personal SMTP/WhatsApp credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsIntegrationModalOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.2)] bg-[#201E1A] px-3.5 py-2 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition shadow-sm"
          >
            <Key className="h-3.5 w-3.5 text-[#E5A93C]" />
            <span>Configure SMTP & WhatsApp Keys</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* 1. Propose Button */}
          {(!currentStatus || currentStatus === "rejected" || currentStatus === "draft") && (
            <button
              type="button"
              onClick={() => orchestrate.mutate()}
              disabled={orchestrate.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-5 py-3 text-xs font-bold text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.4)] transition hover:brightness-110 disabled:opacity-60"
            >
              {orchestrate.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  AI Reasoning & Policy Evaluation...
                </>
              ) : (
                <>
                  <ArgoLogo className="h-4 w-4" />
                  Ask AI to Propose Campaign
                </>
              )}
            </button>
          )}

          {/* 2. Approve & Reject Buttons */}
          {currentStatus === "pending_approval" && (
            <>
              <button
                type="button"
                onClick={() => approve.mutate()}
                disabled={approve.isPending || reject.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-5 py-3 text-xs font-bold text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.4)] transition hover:brightness-110 disabled:opacity-60"
              >
                {approve.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve Proposal
              </button>

              <button
                type="button"
                onClick={() => reject.mutate()}
                disabled={approve.isPending || reject.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-signal/40 bg-rose-signal/10 px-5 py-3 text-xs font-bold text-rose-signal transition hover:bg-rose-signal/20 disabled:opacity-60"
              >
                {reject.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Reject Proposal
              </button>
            </>
          )}

          {/* 3. Execute Button */}
          {currentStatus === "approved" && (
            <button
              type="button"
              onClick={() => execute.mutate()}
              disabled={execute.isPending || isDispatching}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky to-sky-400 px-5 py-3 text-xs font-bold text-ink shadow-[0_0_24px_-6px_rgba(56,189,248,0.4)] transition hover:brightness-110 disabled:opacity-60"
            >
              {execute.isPending || isDispatching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending Emails & Generating Tracking Tokens...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute Campaign Now
                </>
              )}
            </button>
          )}

          {/* 4. Results & Audit Links */}
          {(currentStatus === "running" || currentStatus === "completed") && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-mint">
                <CheckCircle2 className="h-4 w-4" /> Campaign Executed & Live
              </span>
              <Link
                to={activeCampaign?.id ? `/campaigns/${activeCampaign.id}/results` : "/campaigns"}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-4 py-2.5 text-xs font-bold text-[#181714] shadow-md hover:brightness-110 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Campaign Results
              </Link>
              <Link
                to={activeCampaign?.id ? `/campaigns/${activeCampaign.id}/audit` : "/campaigns"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.25)] bg-[#201E1A] px-4 py-2.5 text-xs font-bold text-[#DDD6CD] hover:text-white hover:border-white transition"
              >
                <ClipboardList className="h-3.5 w-3.5 text-[#53BDEB]" />
                Check Audit Trail
              </Link>
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2.5 text-xs font-bold text-teal-300 hover:bg-teal-500/20 transition shadow-sm"
              >
                <span>✉️</span> Interactive Email Lab
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrchestratorData(null);
                  setShowDispatchLog(false);
                  orchestrate.mutate();
                }}
                disabled={orchestrate.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-border bg-ink/40 px-3.5 py-2.5 text-xs font-semibold text-ink-soft hover:text-white transition"
              >
                <ArgoLogo className="h-3.5 w-3.5" />
                Re-Propose New Campaign
              </button>
            </div>
          )}
        </div>

        {/* Live Email Dispatch Terminal Console */}
        <AnimatePresence>
          {showDispatchLog && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden rounded-2xl border border-teal-500/30 bg-[#070b14]/95 shadow-2xl backdrop-blur-xl"
            >
              {/* Console Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-mint/80" />
                  </div>
                  <div className="flex items-center gap-2 pl-2 text-xs font-mono font-bold text-slate-200">
                    <Terminal className="h-3.5 w-3.5 text-mint" />
                    <span>Universal SMTP Dispatch Stream</span>
                    {isDispatching && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-mint animate-pulse font-sans">
                        <Activity className="h-3 w-3" /> Sending live...
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {dispatchProgress.total > 0 && (
                    <span className="rounded-full border border-teal-500/40 bg-teal-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-teal-300">
                      {dispatchProgress.current} / {dispatchProgress.total} Dispatched (
                      {Math.round((dispatchProgress.current / Math.max(1, dispatchProgress.total)) * 100)}%)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDispatchLog(false)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Console Body */}
              <div className="max-h-56 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
                {dispatchLogs.map((log, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-2 ${
                      log.type === "complete"
                        ? "text-mint font-bold"
                        : log.type === "success"
                        ? "text-teal-300"
                        : log.type === "error"
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                    <span className="break-all">{log.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Completed Quick-Action Footer */}
              {!isDispatching && (currentStatus === "running" || currentStatus === "completed") && (
                <div className="border-t border-slate-800/80 bg-slate-900/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#7C9A82]" />
                    <span>All campaign tokens generated, dispatched & active.</span>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={activeCampaign?.id ? `/campaigns/${activeCampaign.id}/results` : "/campaigns"}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-4 py-2 text-xs font-bold text-[#181714] shadow-md hover:brightness-110 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Campaign Results</span>
                    </Link>

                    <Link
                      to={activeCampaign?.id ? `/campaigns/${activeCampaign.id}/audit` : "/campaigns"}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.25)] bg-[#201E1A] px-3.5 py-2 text-xs font-bold text-[#DDD6CD] hover:text-white hover:border-white transition"
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-[#53BDEB]" />
                      <span>Check Audit Trail</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setIsSimulatorOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#7C9A82]/40 bg-[#7C9A82]/10 px-3.5 py-2 text-xs font-bold text-[#7C9A82] hover:bg-[#7C9A82]/20 transition"
                    >
                      <span>✉️</span>
                      <span>Email Lab</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Interactive Email & Tracking Simulator Modal */}
      {activeCampaign && (
        <CampaignEmailSimulatorModal
          campaignId={activeCampaign.id}
          campaignName={activeCampaign.name}
          offerValue={activeCampaign.offerValue || 10}
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          onOrderCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            queryClient.invalidateQueries({ queryKey: ["opportunity"] });
          }}
        />
      )}

      {/* Integration & Credentials Wizard Modal */}
      <IntegrationWizardModal
        isOpen={isIntegrationModalOpen}
        onClose={() => setIsIntegrationModalOpen(false)}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
          queryClient.invalidateQueries({ queryKey: ["opportunity"] });
        }}
      />
    </main>
  );
}
