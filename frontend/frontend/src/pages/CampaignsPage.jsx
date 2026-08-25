import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardList, ExternalLink, Megaphone } from "lucide-react";
import { fetchCampaigns } from "../api/client";
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
  const { data: campaigns = [], isLoading, isError } = useQuery({
    queryKey: ["campaigns", merchantId],
    queryFn: () => fetchCampaigns(merchantId),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint">
          Campaigns
        </p>
        <h1 className="font-display mt-1 text-2xl font-extrabold text-white sm:text-3xl">
          Orchestrated campaigns
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Track approval, execution, predicted vs actual results, and audit history.
        </p>
      </header>

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
        <div className="panel rounded-2xl p-10 text-center">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
          <p className="font-display font-bold text-white">No campaigns yet</p>
          <p className="mt-1 text-xs text-ink-muted">
            Open an opportunity and orchestrate a proposal.
          </p>
          <Link to="/opportunities" className="mt-4 inline-block text-sm font-semibold text-mint">
            Go to opportunities →
          </Link>
        </div>
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
            className="panel-interactive rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-white">{c.name}</h2>
                <p className="mt-1 text-[11px] capitalize text-ink-muted">
                  {c.type} · audience {c.audienceSize} · {c.offerValue ?? 0}% offer
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  statusStyle[c.status] || statusStyle.draft
                }`}
              >
                {String(c.status).replace("_", " ")}
              </span>
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
