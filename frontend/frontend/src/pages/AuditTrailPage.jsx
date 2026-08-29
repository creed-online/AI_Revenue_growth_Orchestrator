import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Shield,
  Store,
  Workflow,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { fetchAuditTrail, fetchCampaign } from "../api/client";

const actorConfig = {
  ai: { icon: Bot, color: "text-sky", bg: "bg-sky-500/10 border-sky-500/30" },
  merchant: { icon: Store, color: "text-mint", bg: "bg-mint/10 border-mint/30" },
  system: { icon: Workflow, color: "text-amber-signal", bg: "bg-amber-signal/10 border-amber-signal/30" },
};

function formatAction(action) {
  return String(action || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditTrailPage() {
  const { campaignId } = useParams();
  const [filterActor, setFilterActor] = useState("all");

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetchCampaign(campaignId),
  });

  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ["audit", campaignId],
    queryFn: () => fetchAuditTrail(campaignId),
  });

  const filteredLogs = useMemo(() => {
    if (filterActor === "all") return logs;
    return logs.filter((l) => l.actor === filterActor);
  }, [logs, filterActor]);

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-campaign-${campaignId}.json`;
    link.click();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        to="/campaigns"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-white transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Campaigns
      </Link>

      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-sky" /> Cryptographic Ledger
          </p>
          <h1 className="font-display mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            {campaign?.name || `Campaign #${campaignId}`}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-ink-muted">
            Immutable trace of every decision step — proposal, policy checks, approvals, dispatch & attribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-border bg-ink-elevated px-3.5 py-2 text-xs font-semibold text-ink-soft hover:text-white transition disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {["all", "ai", "merchant", "system"].map((actor) => (
          <button
            key={actor}
            type="button"
            onClick={() => setFilterActor(actor)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              filterActor === actor
                ? "bg-mint text-ink font-bold"
                : "bg-ink-elevated/60 text-ink-muted border border-ink-border hover:text-white"
            }`}
          >
            {actor === "all" ? `All Events (${logs.length})` : `${actor} (${logs.filter((l) => l.actor === actor).length})`}
          </button>
        ))}
      </div>

      {isLoading && <div className="skeleton h-64 rounded-2xl" />}
      {isError && <p className="text-sm text-rose-signal">Could not load audit logs.</p>}

      {!isLoading && filteredLogs.length === 0 && (
        <div className="panel rounded-2xl p-8 text-center text-sm text-ink-muted">
          No audit events found for this filter.
        </div>
      )}

      <ol className="relative space-y-0 border-l border-ink-border ml-3 sm:ml-4 pl-6 sm:pl-8">
        {filteredLogs.map((log, index) => {
          const cfg = actorConfig[log.actor] || actorConfig.system;
          const Icon = cfg.icon;

          return (
            <motion.li
              key={log.id || index}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative pb-8"
            >
              <span className={`absolute -left-[35px] sm:-left-[39px] flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border ${cfg.bg} ${cfg.color} shadow-lg`}>
                <Icon className="h-4 w-4" />
              </span>

              <div className="panel rounded-2xl p-4 sm:p-5 border border-ink-border bg-ink-elevated/60 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    {formatAction(log.action)}
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {log.actor}
                    </span>
                  </p>
                  <time className="text-[11px] text-ink-muted font-mono">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </time>
                </div>

                {log.reason && (
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-200">
                    {log.reason}
                  </p>
                )}

                {log.inputSummary && (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-ink/60 p-2.5 font-mono text-[11px] text-slate-400 overflow-x-auto">
                    {log.inputSummary}
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </main>
  );
}
