import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
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

function findRelatedCampaign(campaigns, productId) {
  const needle = `Product ${productId}`;
  return (campaigns || []).find((c) => String(c.name || "").includes(needle));
}

export default function OpportunityDetailPage() {
  const { productId } = useParams();
  const { merchantId } = useAuth();
  const queryClient = useQueryClient();

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

  const related = findRelatedCampaign(campaigns, productId);
  const pendingApproval = related?.approvalRequests?.[0];

  const orchestrate = useMutation({
    mutationFn: () => runOrchestrator(merchantId, opportunityIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const approve = useMutation({
    mutationFn: () => approveCampaignRequest(pendingApproval.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] }),
  });

  const reject = useMutation({
    mutationFn: () =>
      rejectCampaignRequest(pendingApproval.id, "merchant", "Merchant rejected from detail page"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] }),
  });

  const execute = useMutation({
    mutationFn: () => executeCampaignOrder(related.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns", merchantId] }),
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
            <strong className="text-ink-soft">{opportunity.catalogAvgCycleDays} days</strong>.
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
                  <tr key={c.customerId} className="border-t border-ink-border/70">
                    <td className="px-3 py-2 text-white">{c.customerName}</td>
                    <td className="px-3 py-2">{Math.round(c.daysSinceLastPurchase)}</td>
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

      <section className="panel mt-4 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-white">Merchant decision</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Orchestrate an AI proposal, then approve or reject. Execute only after approval.
        </p>

        {orchestrate.data?.aiText && (
          <p className="mt-4 rounded-xl border border-ink-border bg-ink/40 px-4 py-3 text-sm leading-relaxed text-ink-soft">
            {orchestrate.data.aiText}
          </p>
        )}

        {related && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-ink-border bg-ink/40 px-2 py-1 text-ink-soft">
              Campaign #{related.id} · {related.status}
            </span>
            {related.status === "running" || related.status === "completed" ? (
              <>
                <Link to={`/campaigns/${related.id}/results`} className="text-mint hover:underline">
                  Results
                </Link>
                <Link to={`/campaigns/${related.id}/audit`} className="text-sky hover:underline">
                  Audit trail
                </Link>
              </>
            ) : null}
          </div>
        )}

        {actionError && (
          <p className="mt-3 text-xs text-rose-signal">{actionError}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => orchestrate.mutate()}
            disabled={orchestrate.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-4 py-2.5 text-xs font-bold text-ink disabled:opacity-60"
          >
            {orchestrate.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Ask AI to propose
          </button>

          {pendingApproval?.status === "pending" && (
            <>
              <button
                type="button"
                onClick={() => approve.mutate()}
                disabled={approve.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-mint/30 bg-mint/10 px-4 py-2.5 text-xs font-bold text-mint"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => reject.mutate()}
                disabled={reject.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-signal/30 bg-rose-signal/10 px-4 py-2.5 text-xs font-bold text-rose-signal"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </>
          )}

          {related?.status === "approved" && (
            <button
              type="button"
              onClick={() => execute.mutate()}
              disabled={execute.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-sky/30 bg-sky/10 px-4 py-2.5 text-xs font-bold text-sky"
            >
              <Play className="h-3.5 w-3.5" />
              Execute campaign
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
