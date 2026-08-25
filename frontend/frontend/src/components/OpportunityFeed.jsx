import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { fetchOpportunities, runOrchestrator } from "../api/client";
import { useAuth } from "../context/AuthContext";

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const priorityStyles = {
  high: "border-rose-signal/35 bg-rose-signal/10 text-rose-signal",
  medium: "border-amber-signal/35 bg-amber-signal/10 text-amber-signal",
  low: "border-ink-border bg-white/5 text-ink-muted",
};

function confidenceLabel(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (n <= 1) return `${Math.round(n * 100)}%`;
  return `${Math.round(n)}%`;
}

export default function OpportunityFeed() {
  const { merchantId } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("ALL");
  const [activeRunningId, setActiveRunningId] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);

  const { data: opportunities = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["opportunities", merchantId],
    queryFn: () => fetchOpportunities(merchantId),
  });

  const orchestrateMutation = useMutation({
    mutationFn: ({ index }) => runOrchestrator(merchantId, index),
    onMutate: ({ index }) => {
      setActiveRunningId(index);
      setOrchestratorResult(null);
    },
    onSuccess: (data) => {
      setActiveRunningId(null);
      setOrchestratorResult(data);
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => {
      setActiveRunningId(null);
      setOrchestratorResult({
        error: true,
        message: error?.response?.data?.message || error.message,
      });
    },
  });

  const filteredOpportunities = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    if (filter === "ALL") return opportunities;
    return opportunities.filter(
      (op) => String(op.priority || "").toLowerCase() === filter
    );
  }, [opportunities, filter]);

  return (
    <section id="opportunities" className="mt-8 mb-4">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display flex items-center gap-2 text-lg font-bold tracking-tight text-white sm:text-xl">
            <Zap className="h-5 w-5 text-amber-signal" />
            Opportunity feed
          </h2>
          <p className="mt-1 max-w-xl text-xs text-ink-muted sm:text-sm">
            Ranked replenishment windows by audience size, confidence, and potential revenue.
            Orchestrate an AI campaign proposal with one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 rounded-xl border border-ink-border bg-ink-elevated/80 p-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === item.id
                    ? "bg-mint text-ink"
                    : "text-ink-muted hover:bg-white/5 hover:text-ink-soft"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-border bg-ink-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-mint/30 hover:text-white"
            title="Refresh feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <AnimatePresence>
        {orchestratorResult && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className={`mb-5 overflow-hidden rounded-xl border p-4 ${
              orchestratorResult.error
                ? "border-rose-signal/30 bg-rose-signal/10 text-rose-signal"
                : "border-mint/30 bg-mint/10 text-mint"
            }`}
          >
            <div className="flex items-start gap-3">
              {orchestratorResult.error ? (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white">
                  {orchestratorResult.error
                    ? "Orchestration failed"
                    : "AI proposal created"}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {orchestratorResult.aiText ||
                    orchestratorResult.message ||
                    "Draft passed policy check and created an approval request."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrchestratorResult(null)}
                className="text-xs font-semibold text-ink-muted hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="panel rounded-2xl border border-rose-signal/30 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-signal" />
          <h3 className="font-display text-base font-bold text-white">
            Couldn’t reach the opportunities API
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-ink-muted">
            Start the Express backend on port 3000, then refresh. Vite proxies{" "}
            <code className="text-mint">/api</code> automatically in dev.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2 text-xs font-bold text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && filteredOpportunities.length === 0 && (
        <div className="panel rounded-2xl p-10 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
          <h3 className="font-display text-base font-bold text-white">
            No opportunities in this filter
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            Try “All” or wait for the next replenishment scan.
          </p>
        </div>
      )}

      {!isLoading && !isError && filteredOpportunities.length > 0 && (
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
          }}
        >
          {filteredOpportunities.map((op, idx) => {
            const priority = String(op.priority || "low").toLowerCase();
            // Use original index in full list for orchestrator
            const originalIndex = opportunities.indexOf(op);

            return (
              <motion.article
                key={`${op.productId}-${idx}`}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 120, damping: 16 },
                  },
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="panel-interactive group flex flex-col rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl border border-mint/20 bg-mint/10 p-2.5 text-mint">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white transition-colors group-hover:text-mint">
                        {op.productName}
                      </h3>
                      <p className="mt-0.5 text-[11px] capitalize text-ink-muted">
                        {op.opportunityType || "replenishment"} · Product #{op.productId}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      priorityStyles[priority] || priorityStyles.low
                    }`}
                  >
                    {priority}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                  {op.recommendedAction ||
                    `Target ${op.customerCount} customers approaching repurchase.`}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-ink-border/80 bg-ink/40 p-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-ink-muted">
                      Audience
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-sm font-bold text-ink-soft">
                      <Users className="h-3.5 w-3.5 text-sky" />
                      {op.customerCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-ink-muted">
                      Confidence
                    </span>
                    <span className="mt-0.5 block text-sm font-bold text-white">
                      {confidenceLabel(op.confidence)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-ink-muted">
                      Potential
                    </span>
                    <span className="mt-0.5 block text-sm font-extrabold text-mint">
                      ₹{Number(op.potentialRevenue || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    to={`/opportunities/${op.productId}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-border bg-ink/40 px-3 py-2.5 text-xs font-bold text-ink-soft transition hover:border-mint/30 hover:text-white"
                  >
                    Review
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      orchestrateMutation.mutate({
                        index: originalIndex >= 0 ? originalIndex : idx,
                      })
                    }
                    disabled={activeRunningId === (originalIndex >= 0 ? originalIndex : idx)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-3 py-2.5 text-xs font-bold text-ink transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                  >
                    {activeRunningId === (originalIndex >= 0 ? originalIndex : idx) ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Orchestrate
                  </button>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
