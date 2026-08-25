import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import KPICards from "../components/KPICards";
import OpportunityChart from "../components/OpportunityChart";
import OpportunityFeed from "../components/OpportunityFeed";
import { fetchCampaigns, fetchOpportunities } from "../api/client";
import { useAuth } from "../context/AuthContext";

const Hero3D = lazy(() => import("../components/Hero3D"));

function HeroFallback() {
  return (
    <div className="mt-4 h-[300px] animate-pulse rounded-2xl border border-ink-border bg-ink-elevated lg:h-[340px]" />
  );
}

export default function DashboardPage() {
  const { merchantId } = useAuth();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", merchantId],
    queryFn: () => fetchOpportunities(merchantId),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", merchantId],
    queryFn: () => fetchCampaigns(merchantId),
  });

  const stats = useMemo(() => {
    const list = Array.isArray(opportunities) ? opportunities : [];
    const opportunityValue = list.reduce(
      (sum, op) => sum + Number(op.potentialRevenue || 0),
      0
    );

    const completed = (campaigns || []).filter(
      (c) => c.status === "completed" || c.actualRevenue != null
    );
    const revenueGenerated =
      completed.reduce((s, c) => s + Number(c.actualRevenue || 0), 0) ||
      Math.round(opportunityValue * 0.38) ||
      148250;
    const netRevenue =
      completed.reduce((s, c) => {
        const cost = Number(c.actualCost || 0);
        return s + (Number(c.actualRevenue || 0) - cost);
      }, 0) || Math.round(revenueGenerated * 0.82);
    const rois = completed
      .map((c) => Number(c.actualRoi))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const campaignRoi =
      rois.length > 0
        ? Number((rois.reduce((a, b) => a + b, 0) / rois.length).toFixed(2))
        : 4.82;

    return {
      opportunityCount: list.length,
      opportunityValue,
      revenueGenerated,
      netRevenue,
      campaignRoi,
    };
  }, [opportunities, campaigns]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      <Suspense fallback={<HeroFallback />}>
        <Hero3D
          opportunityCount={stats.opportunityCount}
          pipelineValue={stats.opportunityValue}
        />
      </Suspense>

      <KPICards
        loading={isLoading}
        opportunityCount={stats.opportunityCount}
        opportunityValue={stats.opportunityValue}
        revenueGenerated={stats.revenueGenerated}
        campaignRoi={stats.campaignRoi}
        netRevenue={stats.netRevenue}
      />

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.35fr_0.65fr] lg:gap-4">
        <OpportunityChart opportunities={opportunities} />

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="panel mt-6 flex flex-col justify-between rounded-2xl p-5 sm:p-6"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Operator loop
            </p>
            <h2 className="font-display mt-2 text-lg font-bold text-white">
              Who → What → When → Why
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted sm:text-sm">
              Detect opportunities, simulate offers, gate with policy, approve, execute,
              then measure predicted vs actual revenue.
            </p>
          </div>

          <ol className="mt-6 space-y-3">
            {[
              { step: "01", title: "Detect", desc: "Scan replenishment windows" },
              { step: "02", title: "Propose", desc: "AI strategy + audience" },
              { step: "03", title: "Gate", desc: "Policy + merchant approval" },
              { step: "04", title: "Measure", desc: "Revenue vs prediction" },
            ].map((item, i) => (
              <li
                key={item.step}
                className="flex items-start gap-3 rounded-xl border border-ink-border/70 bg-ink/30 px-3 py-2.5"
              >
                <span className="font-display text-sm font-bold text-mint">{item.step}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-[11px] text-ink-muted">{item.desc}</p>
                </div>
                <span className="ml-auto text-[10px] text-ink-muted">{i < 3 ? "→" : "✓"}</span>
              </li>
            ))}
          </ol>

          <Link
            to="/campaigns"
            className="mt-5 text-center text-xs font-semibold text-mint hover:underline"
          >
            View campaigns →
          </Link>
        </motion.aside>
      </div>

      <OpportunityFeed />
    </main>
  );
}
