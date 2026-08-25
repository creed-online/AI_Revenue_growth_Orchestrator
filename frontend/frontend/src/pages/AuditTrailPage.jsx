import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Shield, Store, Workflow } from "lucide-react";
import { fetchAuditTrail, fetchCampaign } from "../api/client";

const actorIcon = {
  ai: Bot,
  merchant: Store,
  system: Workflow,
};

function formatAction(action) {
  return String(action || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditTrailPage() {
  const { campaignId } = useParams();

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetchCampaign(campaignId),
  });

  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ["audit", campaignId],
    queryFn: () => fetchAuditTrail(campaignId),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        to="/campaigns"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Campaigns
      </Link>

      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky">
          Audit trail
        </p>
        <h1 className="font-display mt-1 text-2xl font-extrabold text-white">
          {campaign?.name || `Campaign #${campaignId}`}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every gated step — draft, policy, approval, execute, measure — in order.
        </p>
      </header>

      {isLoading && <div className="skeleton h-64 rounded-2xl" />}
      {isError && <p className="text-sm text-rose-signal">Could not load audit logs.</p>}

      {!isLoading && logs.length === 0 && (
        <div className="panel rounded-2xl p-8 text-center text-sm text-ink-muted">
          No audit events yet. Orchestrate and approve a campaign first.
        </div>
      )}

      <ol className="relative space-y-0 border-l border-ink-border pl-6">
        {logs.map((log, index) => {
          const Icon = actorIcon[log.actor] || Shield;
          return (
            <motion.li
              key={log.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.12, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative pb-8"
            >
              <span className="absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full border border-mint/30 bg-ink-elevated text-mint">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="panel rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{formatAction(log.action)}</p>
                  <time className="text-[11px] text-ink-muted">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </time>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-muted">
                  {log.actor}
                </p>
                {log.reason && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{log.reason}</p>
                )}
                {log.inputSummary && (
                  <p className="mt-2 font-mono text-[11px] text-ink-muted">{log.inputSummary}</p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </main>
  );
}
