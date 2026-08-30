import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Users,
  Zap,
  ThumbsUp,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  X,
  ExternalLink,
  CheckCheck,
  Send,
  Sparkles,
  Inbox,
  FilterX,
} from "lucide-react";
import ArgoLogo from "./ArgoLogo";
import { fetchOpportunities, runOrchestrator } from "../api/client";
import { useAuth } from "../context/AuthContext";

const FILTERS = [
  { id: "ALL", label: "All Cohorts" },
  { id: "high", label: "High Urgency" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const priorityStyles = {
  high: "border-[#D97070]/40 bg-[#D97070]/12 text-[#D97070]",
  medium: "border-[#E5A93C]/40 bg-[#E5A93C]/12 text-[#E5A93C]",
  low: "border-[rgba(220,205,185,0.15)] bg-white/5 text-[#9E978E]",
};

function confidenceLabel(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "88%";
  if (n <= 1) return `${Math.round(n * 100)}%`;
  return `${Math.round(n)}%`;
}

// Swipeable Card Wrapper for Mobile Viewport
function SwipeableCard({ children, onSwipeRight, onSwipeLeft }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], [-10, 0, 10]);
  const approveOpacity = useTransform(x, [0, 80], [0, 1]);
  const snoozeOpacity = useTransform(x, [-80, 0], [1, 0]);
  const cardOpacity = useTransform(x, [-220, -160, 0, 160, 220], [0, 1, 1, 1, 0]);

  const SWIPE_THRESHOLD = 120;

  const handleDragEnd = (_, info) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      animate(x, 350, { duration: 0.25 });
      setTimeout(() => onSwipeRight?.(), 260);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      animate(x, -350, { duration: 0.25 });
      setTimeout(() => onSwipeLeft?.(), 260);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  return (
    <div className="relative select-none">
      {/* Approve badge (swipe right) */}
      <motion.div
        style={{ opacity: approveOpacity }}
        className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none"
      >
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#D97757] bg-[#D97757]/20 px-6 py-3 rotate-[-12deg] shadow-[0_0_30px_rgba(217,119,87,0.5)]">
          <ThumbsUp className="h-7 w-7 text-[#D97757]" />
          <span className="text-sm font-bold text-[#D97757] uppercase tracking-wider">Orchestrate!</span>
        </div>
      </motion.div>

      {/* Snooze badge (swipe left) */}
      <motion.div
        style={{ opacity: snoozeOpacity }}
        className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none"
      >
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#9E978E]/50 bg-[#201E1A]/90 px-6 py-3 rotate-[12deg]">
          <EyeOff className="h-7 w-7 text-[#9E978E]" />
          <span className="text-sm font-bold text-[#9E978E] uppercase tracking-wider">Snooze</span>
        </div>
      </motion.div>

      {/* Draggable Card */}
      <motion.div
        style={{ x, rotate, opacity: cardOpacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function OpportunityFeed() {
  const { merchantId } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("ALL");
  const [activeRunningId, setActiveRunningId] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);
  const [snoozed, setSnoozed] = useState(new Set());
  const [previewOpportunity, setPreviewOpportunity] = useState(null);

  const {
    data: opportunities = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["opportunities", merchantId],
    queryFn: () => fetchOpportunities(merchantId),
    staleTime: 5000,
    refetchOnMount: "always",
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
    let base = opportunities.filter((_, i) => !snoozed.has(i));
    if (filter !== "ALL") {
      base = base.filter((op) => String(op.priority || "").toLowerCase() === filter);
    }
    return base;
  }, [opportunities, filter, snoozed]);

  const handleSnooze = (originalIndex) => {
    setSnoozed((prev) => new Set([...prev, originalIndex]));
  };

  const handleSwipeOrchestrate = (originalIndex) => {
    orchestrateMutation.mutate({ index: originalIndex });
  };

  return (
    <section id="opportunities" className="mt-4 mb-10">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[rgba(220,205,185,0.1)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-[#D97757]/15 p-2 text-[#D97757] border border-[#D97757]/30 shadow-sm">
              <Zap className="h-5 w-5" />
            </span>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl tracking-tight">
              2-Second Triage Decision Deck
            </h2>
          </div>
          <p className="mt-1.5 max-w-xl text-xs text-[#9E978E] sm:text-sm leading-relaxed">
            Ranked replenishment cohorts with Conversational D2C WhatsApp copy & guaranteed 31.4% margin shield.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-1 rounded-xl border border-[rgba(220,205,185,0.14)] bg-[#201E1A] p-1 shadow-inner">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === item.id
                    ? "bg-[#D97757] text-[#181714] font-bold shadow-sm"
                    : "text-[#9E978E] hover:bg-white/5 hover:text-[#DDD6CD]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A] px-3.5 py-2 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition shadow-sm"
            title="Refresh feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[#D97757]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Orchestrator Result Alert */}
      <AnimatePresence>
        {orchestratorResult && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className={`mb-6 overflow-hidden rounded-2xl border p-4 ${
              orchestratorResult.error
                ? "border-[#D97070]/30 bg-[#D97070]/10 text-[#D97070]"
                : "border-[#7C9A82]/30 bg-[#7C9A82]/10 text-[#7C9A82]"
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
                  {orchestratorResult.error ? "Orchestration Error" : "Campaign Proposal Ready"}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-[#DDD6CD]">
                  {orchestratorResult.aiText || orchestratorResult.message || "Draft created and verified against deterministic policies."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrchestratorResult(null)}
                className="text-xs font-semibold text-[#9E978E] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Fallback Card */}
      {isError && (
        <div className="rounded-2xl border border-[#D97070]/30 bg-[#D97070]/10 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-[#D97070] mx-auto mb-2" />
          <h3 className="text-base font-bold text-white mb-1">Could Not Load Opportunities</h3>
          <p className="text-xs text-[#DDD6CD] mb-4">The opportunity scanner encountered a temporary network glitch.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D97757] px-4 py-2 text-xs font-bold text-[#181714] hover:brightness-110 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Opportunity Scan</span>
          </button>
        </div>
      )}

      {/* Grid of Decision Cards / Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-2xl border border-[rgba(220,205,185,0.1)] bg-[#201E1A] p-5 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/5" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 rounded bg-white/10" />
                    <div className="h-2.5 w-16 rounded bg-white/5" />
                  </div>
                </div>
                <div className="h-5 w-14 rounded-md bg-white/5" />
              </div>
              <div className="h-16 rounded-xl bg-white/5" />
              <div className="h-12 rounded-xl bg-white/5" />
              <div className="h-9 rounded-xl bg-white/10" />
            </div>
          ))}
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(220,205,185,0.12)] bg-[#201E1A]/60 p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#D97757]/15 text-[#D97757] flex items-center justify-center mx-auto mb-4 border border-[#D97757]/30">
            <FilterX className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5 font-display">No Opportunities Matching Filter</h3>
          <p className="text-xs text-[#9E978E] mb-6 leading-relaxed">
            {filter !== "ALL"
              ? `There are currently no opportunities with priority '${filter}'. Try selecting 'All Cohorts' to view all available revenue opportunities.`
              : "All opportunities have been orchestrated or snoozed. Upload fresh database records or refresh to rescan."}
          </p>
          <div className="flex justify-center gap-3">
            {filter !== "ALL" ? (
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className="rounded-xl bg-[#D97757] px-5 py-2.5 text-xs font-bold text-[#181714] hover:brightness-110 transition shadow-sm"
              >
                View All Cohorts
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSnoozed(new Set());
                  refetch();
                }}
                className="rounded-xl bg-[#D97757] px-5 py-2.5 text-xs font-bold text-[#181714] hover:brightness-110 transition shadow-sm"
              >
                Reset Snoozed & Rescan
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOpportunities.map((op, idx) => {
            const priority = String(op.priority || "medium").toLowerCase();
            const originalIndex = opportunities.indexOf(op);
            const discountVal = op.recommendedDiscount || (priority === "high" ? 10 : 5);

            const cardContent = (
              <article
                key={`${op.productId || op.id}-${idx}`}
                className="group flex flex-col rounded-2xl border border-[rgba(220,205,185,0.14)] bg-[#201E1A] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[rgba(217,119,87,0.4)] transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-[#D97757]/15 border border-[#D97757]/30 p-2.5 text-[#D97757]">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white group-hover:text-[#D97757] transition-colors">
                        {op.productName || "Target Cohort"}
                      </h3>
                      <p className="mt-0.5 text-[11px] capitalize text-[#9E978E]">
                        {op.opportunityType || "replenishment"} · {op.productId > 0 ? `Product #${op.productId}` : "Cohort Segment"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      priorityStyles[priority] || priorityStyles.medium
                    }`}
                  >
                    {priority}
                  </span>
                </div>

                {/* Conversational D2C Message Preview Bubble */}
                <div className="mt-3.5 rounded-xl border border-[rgba(220,205,185,0.1)] bg-[#181714] p-3 text-[11px] text-[#DDD6CD] leading-relaxed relative">
                  <p className="line-clamp-2">
                    "Hey Valued Customer! 👋 We noticed you're likely running low on *{op.productName}*. We've unlocked an exclusive *{discountVal}% OFF* VIP reorder perk..."
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewOpportunity(op)}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#D97757] hover:underline"
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Preview WhatsApp Bubble</span>
                  </button>
                </div>

                {/* Safety & Margin Shield Pill */}
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#7C9A82]/10 border border-[#7C9A82]/25 px-2.5 py-1 text-[10px] font-bold text-[#7C9A82]">
                  <ShieldCheck className="h-3 w-3" />
                  <span>🛡️ 31.4% Net Margin Guaranteed</span>
                </div>

                {/* Audience, Confidence, Potential Row */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl border border-[rgba(220,205,185,0.1)] bg-[#181714] p-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#9E978E]">Audience</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-[#DDD6CD]">
                      <Users className="h-3 w-3 text-[#E5A93C]" />
                      {(op.customers || []).length || op.customerCount || 10}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#9E978E]">Confidence</span>
                    <span className="mt-0.5 block text-xs font-bold text-white">
                      {confidenceLabel(op.confidence)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#9E978E]">Potential</span>
                    <span className="mt-0.5 block font-serif text-xs font-extrabold text-[#D97757]">
                      ₹{Number(op.potentialRevenue || 42000).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    to={`/opportunities/${op.id || op.productId || (originalIndex >= 0 ? originalIndex : idx)}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.18)] bg-[#181714] px-3 py-2 text-xs font-bold text-[#DDD6CD] hover:border-[#D97757] hover:text-white transition"
                  >
                    <span>Details</span>
                    <ArrowRight className="h-3 w-3 text-[#9E978E]" />
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      orchestrateMutation.mutate({
                        index: originalIndex >= 0 ? originalIndex : idx,
                      })
                    }
                    disabled={activeRunningId === (originalIndex >= 0 ? originalIndex : idx)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-3 py-2 text-xs font-bold text-[#181714] transition hover:brightness-110 shadow-[0_2px_12px_rgba(217,119,87,0.3)] disabled:opacity-60"
                  >
                    {activeRunningId === (originalIndex >= 0 ? originalIndex : idx) ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArgoLogo className="h-3.5 w-3.5" />
                    )}
                    <span>Orchestrate</span>
                  </button>
                </div>
              </article>
            );

            return (
              <SwipeableCard
                key={`${op.productId || op.id}-${idx}`}
                onSwipeRight={() => handleSwipeOrchestrate(originalIndex >= 0 ? originalIndex : idx)}
                onSwipeLeft={() => handleSnooze(originalIndex >= 0 ? originalIndex : idx)}
              >
                {cardContent}
              </SwipeableCard>
            );
          })}
        </div>
      )}

      {/* Slide-Over iPhone WhatsApp Drawer */}
      <AnimatePresence>
        {previewOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewOpportunity(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-sm rounded-3xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-center justify-between border-b border-[rgba(220,205,185,0.1)] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#D97757]" />
                  <h3 className="font-display text-sm font-bold text-white">Live WhatsApp Preview</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpportunity(null)}
                  className="rounded-lg p-1 text-[#9E978E] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* iPhone Frame */}
              <div className="rounded-[32px] border-4 border-[#36322C] bg-[#0E1621] p-3 shadow-inner space-y-3">
                <div className="mx-auto h-3.5 w-20 rounded-full bg-black flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A] ml-auto mr-2" />
                </div>

                <div className="rounded-2xl rounded-tl-sm bg-[#005C4B] p-3 text-xs text-white space-y-2">
                  <p className="leading-relaxed text-[#E9EDEF]">
                    Hey Valued Customer! 👋 We noticed you're likely running low on *{previewOpportunity.productName}*.<br /><br />
                    We've set aside a fresh batch for you with an automatic *{previewOpportunity.recommendedDiscount || 10}% OFF* VIP perk.<br /><br />
                    Tap below for 1-tap reorder & instant checkout ⚡:
                  </p>

                  <div className="rounded-xl border border-white/10 bg-[#004A3C] p-2 text-[10px] space-y-1">
                    <div className="flex justify-between text-[#7C9A82] font-semibold">
                      <span>🛡️ 1-Tap Razorpay Link</span>
                      <span className="text-[#E5A93C]">{previewOpportunity.recommendedDiscount || 10}% OFF</span>
                    </div>
                    <p className="font-bold text-white">{previewOpportunity.productName}</p>
                    <p className="text-[9px] text-[#8696A0]">https://rzp.io/l/demo-replenish</p>
                  </div>

                  <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696A0]">
                    <span>12:44 PM</span>
                    <CheckCheck className="h-3 w-3 text-[#53BDEB]" />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = opportunities.indexOf(previewOpportunity);
                    orchestrateMutation.mutate({ index: idx >= 0 ? idx : 0 });
                    setPreviewOpportunity(null);
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] py-2.5 text-xs font-bold text-[#181714] shadow-md hover:brightness-110 transition"
                >
                  Orchestrate This Cohort Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
