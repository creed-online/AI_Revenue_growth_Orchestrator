import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  ExternalLink,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
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

  return (
    campaigns.find(
      (c) =>
        c.name?.toLowerCase().includes(opportunity.productName?.toLowerCase()) ||
        (opportunity.productId != null &&
          String(c.name).includes(`Product ${opportunity.productId}`)) ||
        (opportunity.opportunityType &&
          c.type === opportunity.opportunityType &&
          c.status !== "cancelled")
    ) || null
  );
}

export default function OpportunityDetailPage() {
  const { productId } = useParams();
  const { merchantId } = useAuth();
  const queryClient = useQueryClient();
  const [orchestratorData, setOrchestratorData] = useState(null);

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

  const activeCampaign = findActiveCampaign(campaigns, opportunity, orchestratorData);
  const activeApproval =
    orchestratorData?.approvalRequest ||
    activeCampaign?.approvalRequests?.[0] ||
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
      return executeCampaignOrder(campaignId);
    },
    onSuccess: () => {
      if (activeCampaign) {
        setOrchestratorData((prev) => ({
          ...(prev || {}),
          campaign: { ...(prev?.campaign || activeCampaign), status: "running" },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
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

  const currentStatus = activeCampaign?.status || (orchestrate.data ? "pending_approval" : null);

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
          {opportunity.opportunityType} · #{opportunity.productId}
        </p>
        <h1 className="font-display mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {opportunity.productName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          {opportunity.recommendedAction}
        </p>
      </motion.header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Audience", value: opportunity.customerCount },
          { label: "Potential", value: money(opportunity.potentialRevenue) },
          { label: "Confidence", value: confidenceLabel(opportunity.confidence) },
          { label: "Priority", value: String(opportunity.priority || "—").toUpperCase() },
        ].map((item) => (
          <div key={item.label} className="panel rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">{item.label}</p>
            <p className="mt-1 font-display text-lg font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel rounded-2xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-white">Why this opportunity</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Customers who buy <strong className="text-ink-soft">{opportunity.productName}</strong>{" "}
            typically repurchase every{" "}
            <strong className="text-ink-soft">{opportunity.catalogAvgCycleDays || 30} days</strong>.
            {opportunity.customerCount} buyers are now inside that window, so a timed reminder
            (with a policy-safe offer) recovers revenue that would otherwise slip.
          </p>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Recommended audience
          </h3>
          <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-ink-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-elevated text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Days since</th>
                  <th className="px-3 py-2 font-medium">Potential</th>
                </tr>
              </thead>
              <tbody>
                {(opportunity.customers || []).slice(0, 12).map((c) => (
                  <tr key={c.customerId || c.id} className="border-t border-ink-border/70">
                    <td className="px-3 py-2 text-white">{c.customerName || c.email}</td>
                    <td className="px-3 py-2">{Math.round(c.daysSinceLastPurchase || 0)}</td>
                    <td className="px-3 py-2 text-mint">{money(c.potentialRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel rounded-2xl p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-mint" />
            <h2 className="font-display text-lg font-bold text-white">Simulation</h2>
          </div>
          <p className="mb-4 text-xs text-ink-muted">
            0% / 5% / 10% discount tiers. The AI picks the highest expected net revenue.
          </p>
          <div className="h-[220px]">
            {simLoading ? (
              <div className="skeleton h-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(28,42,61,0.8)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8b9bb4", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#8b9bb4", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0c121c",
                      border: "1px solid #1c2a3d",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => money(v)}
                  />
                  <Bar dataKey="net" radius={[8, 8, 4, 4]} maxBarSize={42} isAnimationActive animationDuration={800}>
                    {chartData.map((row) => (
                      <Cell
                        key={row.name}
                        fill={
                          simulation?.recommendedTier === row.discountPercent
                            ? "#2dd4a8"
                            : TIER_COLORS[row.discountPercent] || "#64748b"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {simulation?.recommendedScenario && (
            <p className="mt-3 rounded-xl border border-mint/25 bg-mint/10 px-3 py-2 text-xs text-mint">
              Recommended: {simulation.recommendedTier}% off · net{" "}
              {money(simulation.recommendedScenario.netRevenue)}
            </p>
          )}
        </section>
      </div>

      {/* Merchant Decision & AI Proposal Workflow */}
      <section className="panel mt-6 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Merchant Control & AI Proposal</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Review AI reasoning, inspect policy guardrails, approve or reject proposals, and trigger campaign execution.
            </p>
          </div>

          {activeCampaign && (
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-ink-border bg-ink/60 px-3 py-1.5 text-xs font-bold text-white">
                Campaign #{activeCampaign.id}
              </span>
              <span
                className={`rounded-lg border px-3 py-1.5 text-xs font-extrabold uppercase ${
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

        {/* AI Proposal Box */}
        <AnimatePresence>
          {(orchestrate.data?.aiText || activeCampaign) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl border border-ink-border bg-ink-elevated/40 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 text-mint">
                <Sparkles className="h-4 w-4" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-mint">
                  AI Orchestrator Strategy & Proposal
                </h3>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-ink-soft sm:text-sm">
                {orchestrate.data?.aiText ||
                  `The AI evaluated conversion probability and margin safety for ${opportunity.productName}. A ${
                    activeCampaign?.offerValue ?? simulation?.recommendedTier ?? 10
                  }% discount tier was chosen to maximize projected net revenue while respecting merchant policy guardrails.`}
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl border border-ink-border bg-ink/30 p-2.5">
                  <p className="text-ink-muted text-[10px]">Proposed Offer</p>
                  <p className="font-bold text-white mt-0.5">
                    {activeCampaign?.offerValue ?? simulation?.recommendedTier ?? 10}% Off
                  </p>
                </div>
                <div className="rounded-xl border border-ink-border bg-ink/30 p-2.5">
                  <p className="text-ink-muted text-[10px]">Target Audience</p>
                  <p className="font-bold text-white mt-0.5">
                    {activeCampaign?.audienceSize ?? opportunity.customerCount} Buyers
                  </p>
                </div>
                <div className="rounded-xl border border-ink-border bg-ink/30 p-2.5">
                  <p className="text-ink-muted text-[10px]">Expected Revenue</p>
                  <p className="font-bold text-mint mt-0.5">
                    {money(activeCampaign?.expectedRevenue ?? opportunity.potentialRevenue)}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-border bg-ink/30 p-2.5">
                  <p className="text-ink-muted text-[10px]">Policy Check</p>
                  <p className="font-bold text-mint mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Compliant
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {actionError && (
          <div className="mt-4 rounded-xl border border-rose-signal/30 bg-rose-signal/10 p-3 text-xs text-rose-signal flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* 1. Propose Button (Available if no campaign or if user wants to re-propose) */}
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
                  <Sparkles className="h-4 w-4" />
                  Ask AI to Propose Campaign
                </>
              )}
            </button>
          )}

          {/* 2. Approve & Reject Buttons (Visible when pending_approval) */}
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

          {/* 3. Execute Button (Visible after approval) */}
          {currentStatus === "approved" && (
            <button
              type="button"
              onClick={() => execute.mutate()}
              disabled={execute.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky to-sky-400 px-5 py-3 text-xs font-bold text-ink shadow-[0_0_24px_-6px_rgba(56,189,248,0.4)] transition hover:brightness-110 disabled:opacity-60"
            >
              {execute.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executing & Delivering Notifications...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute Campaign Now
                </>
              )}
            </button>
          )}

          {/* 4. Results & Audit Links (Visible after execution) */}
          {(currentStatus === "running" || currentStatus === "completed") && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-mint">
                <CheckCircle2 className="h-4 w-4" /> Campaign Executed & Live
              </span>
              <Link
                to={`/campaigns/${activeCampaign.id}/results`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-mint/30 bg-mint/10 px-4 py-2.5 text-xs font-bold text-mint hover:bg-mint/20 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Campaign Results
              </Link>
              <Link
                to={`/campaigns/${activeCampaign.id}/audit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky/30 bg-sky/10 px-4 py-2.5 text-xs font-bold text-sky hover:bg-sky/20 transition"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                View Audit Trail
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
