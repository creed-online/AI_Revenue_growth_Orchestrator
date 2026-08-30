import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  ExternalLink,
  Megaphone,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import ArgoLogo from "../components/ArgoLogo";
import { clearAllCampaigns, deleteCampaign, fetchCampaigns } from "../api/client";
import { useAuth } from "../context/AuthContext";

const statusStyle = {
  pending_approval: "border-amber-signal/30 bg-amber-signal/10 text-amber-signal",
  approved: "border-sky/30 bg-sky/10 text-sky",
  running: "border-mint/30 bg-mint/10 text-mint",
  completed: "border-mint/40 bg-mint/15 text-mint",
  rejected: "border-rose-signal/30 bg-rose-signal/10 text-rose-signal",
  draft: "border-ink-border text-ink-muted",
};

export default function CampaignsPage() {
  const { merchantId } = useAuth();
  const queryClient = useQueryClient();
  const [showClearModal, setShowClearModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const { data: campaigns = [], isLoading, isError } = useQuery({
    queryKey: ["campaigns", merchantId],
    queryFn: () => fetchCampaigns(merchantId),
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id) => deleteCampaign(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllCampaigns(),
    onSuccess: () => {
      setShowClearModal(false);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint">
            Campaigns
          </p>
          <h1 className="font-display mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            Orchestrated Campaigns
          </h1>
          <p className="mt-1 text-xs text-ink-muted sm:text-sm">
            Track approvals, executions, predicted vs actual results, and audit history.
          </p>
        </div>

        {campaigns.length > 0 && (
          <button
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-signal/30 bg-rose-signal/10 px-4 py-2.5 text-xs font-bold text-rose-signal transition hover:bg-rose-signal/20 hover:border-rose-signal/50 self-start sm:self-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Campaigns
          </button>
        )}
      </header>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full rounded-2xl border border-ink-border bg-ink-elevated p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-signal">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-display text-lg font-bold text-white">Reset Campaign History?</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                This will permanently remove all {campaigns.length} past orchestrated campaigns, approval requests, and results, resetting your campaign workspace to a clean state.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowClearModal(false)}
                  disabled={clearAllMutation.isPending}
                  className="rounded-xl border border-ink-border px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => clearAllMutation.mutate()}
                  disabled={clearAllMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-signal px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {clearAllMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-rose-signal">Could not load campaigns.</p>
      )}

      {!isLoading && campaigns.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel flex flex-col items-center justify-center rounded-2xl p-12 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-mint/20 bg-mint/10 text-mint">
            <Megaphone className="h-7 w-7" />
          </div>
          <h3 className="font-display mt-4 text-lg font-bold text-white">No campaigns orchestrated yet</h3>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-muted sm:text-sm">
            Launch an AI-generated win-back, VIP loyalty, or replenishment opportunity from your live feed to track its execution and revenue here.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-5 py-2.5 text-xs font-bold text-[#181714] transition hover:brightness-110"
          >
            <ArgoLogo className="h-4 w-4" />
            <span>Explore Opportunity Feed →</span>
          </Link>
        </motion.div>
      )}

      <motion.div
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
        }}
      >
        {campaigns.map((c) => (
          <motion.article
            key={c.id}
            variants={{ hidden: { y: 14, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="panel-interactive group relative rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-white">{c.name}</h2>
                <p className="mt-1 text-[11px] capitalize text-ink-muted">
                  {c.type} · audience {c.audienceSize} · {c.offerValue ?? 0}% offer
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    statusStyle[c.status] || statusStyle.draft
                  }`}
                >
                  {String(c.status).replace("_", " ")}
                </span>
                <button
                  onClick={() => deleteOneMutation.mutate(c.id)}
                  disabled={deletingId === c.id}
                  title="Delete Campaign"
                  className="rounded-lg p-1.5 text-ink-muted opacity-60 transition hover:bg-rose-signal/10 hover:text-rose-signal hover:opacity-100 disabled:opacity-30"
                >
                  {deletingId === c.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-ink-border bg-ink/30 p-3">
                <p className="text-ink-muted">Expected revenue</p>
                <p className="mt-1 font-bold text-white">
                  ₹{Number(c.expectedRevenue || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-ink-border bg-ink/30 p-3">
                <p className="text-ink-muted">Actual revenue</p>
                <p className="mt-1 font-bold text-mint">
                  {c.actualRevenue != null
                    ? `₹${Number(c.actualRevenue).toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/campaigns/${c.id}/results`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-border px-3 py-2 text-[11px] font-semibold text-ink-soft hover:border-mint/30"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Results
              </Link>
              <Link
                to={`/campaigns/${c.id}/audit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-border px-3 py-2 text-[11px] font-semibold text-ink-soft hover:border-sky/30"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Audit
              </Link>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </main>
  );
}
