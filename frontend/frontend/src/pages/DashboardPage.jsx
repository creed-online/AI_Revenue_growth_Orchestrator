import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ShieldCheck } from "lucide-react";
import KPICards from "../components/KPICards";
import OpportunityChart from "../components/OpportunityChart";
import OpportunityFeed from "../components/OpportunityFeed";
import FloatingAuthBox from "../components/FloatingAuthBox";
import ErrorBoundary from "../components/ErrorBoundary";
import { fetchCampaigns, fetchOpportunities } from "../api/client";
import { useAuth } from "../context/AuthContext";

const Hero3D = lazy(() => import("../components/Hero3D"));
const ThreeCustomerGlobe = lazy(() => import("../components/ThreeCustomerGlobe"));

function HeroFallback() {
  return (
    <div className="mt-4 h-[300px] animate-pulse rounded-2xl border border-ink-border bg-ink-elevated lg:h-[340px]" />
  );
}

function GlobeFallback() {
  return (
    <div className="mt-8 h-[360px] animate-pulse rounded-3xl border border-ink-border bg-ink-elevated" />
  );
}

export default function DashboardPage() {
  const { merchantId, isAuthenticated, merchant } = useAuth();
  const isDemoMode = merchantId === 1;

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", merchantId],
    queryFn: () => fetchOpportunities(merchantId),
    enabled: true,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", merchantId],
    queryFn: () => fetchCampaigns(merchantId),
    enabled: true,
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
    const revenueGenerated = completed.reduce(
      (s, c) => s + Number(c.actualRevenue || 0),
      0
    );
    const netRevenue = completed.reduce((s, c) => {
      const cost = Number(c.actualCost || 0);
      return s + (Number(c.actualRevenue || 0) - cost);
    }, 0);
    const rois = completed
      .map((c) => Number(c.actualRoi))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const campaignRoi =
      rois.length > 0
        ? Number((rois.reduce((a, b) => a + b, 0) / rois.length).toFixed(2))
        : 0;

    return {
      opportunityCount: list.length,
      opportunityValue,
      revenueGenerated,
      netRevenue,
      campaignRoi,
    };
  }, [opportunities, campaigns]);

  return (
    <>
      {!isAuthenticated && <FloatingAuthBox />}
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6 lg:px-8">

        {/* AI Engine Status Bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-ink-border bg-ink-elevated/70 px-2.5 py-1 text-[11px] text-ink-soft">
            <Activity className="h-3 w-3 text-sky live-dot" />
            <span>Model: <strong className="font-semibold text-white">Groq Llama 3.3</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-mint/25 bg-mint/8 px-2.5 py-1 text-[11px] font-medium text-mint/90">
            <ShieldCheck className="h-3 w-3" />
            Policy guardrails on
          </div>
        </div>

        <ErrorBoundary fallback={<HeroFallback />}>
          <Suspense fallback={<HeroFallback />}>
            <Hero3D
              opportunityCount={stats.opportunityCount}
              pipelineValue={stats.opportunityValue}
            />
          </Suspense>
        </ErrorBoundary>

        <KPICards
          loading={isLoading}
          opportunityCount={stats.opportunityCount}
          opportunityValue={stats.opportunityValue}
          revenueGenerated={stats.revenueGenerated}
          campaignRoi={stats.campaignRoi}
          netRevenue={stats.netRevenue}
        />

        {isDemoMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 flex items-center gap-2 rounded-xl border border-amber-signal/30 bg-amber-signal/10 px-4 py-2.5"
          >
            <span className="text-[11px] font-semibold text-amber-signal">🧪 Demo Mode</span>
            <span className="text-[11px] text-ink-muted">
              Exploring Demo Fitness Store data.{" "}
              <Link to="/import" className="text-mint font-semibold underline hover:brightness-110">
                Import your own database / CSV
              </Link>{" "}
              or{" "}
              <Link to="/register" className="text-sky font-semibold underline hover:brightness-110">
                create your merchant account
              </Link>
              .
            </span>
          </motion.div>
        )}

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

        {/* 3D Interactive Customer Retention Globe */}
        <ErrorBoundary fallback={<GlobeFallback />}>
          <Suspense fallback={<GlobeFallback />}>
            <ThreeCustomerGlobe />
          </Suspense>
        </ErrorBoundary>

        <OpportunityFeed />
      </main>
    </>
  );
}
