import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Navbar from "./components/Navbar";
import Hero3D from "./components/Hero3D";
import KPICards from "./components/KPICards";
import OpportunityChart from "./components/OpportunityChart";
import OpportunityFeed from "./components/OpportunityFeed";
import { fetchOpportunities } from "./api/client";

export default function App() {
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", 1],
    queryFn: () => fetchOpportunities(1),
  });

  const stats = useMemo(() => {
    const list = Array.isArray(opportunities) ? opportunities : [];
    const opportunityValue = list.reduce(
      (sum, op) => sum + Number(op.potentialRevenue || 0),
      0
    );
    // Placeholder campaign outcomes until results APIs are wired (Day 13)
    const revenueGenerated = Math.round(opportunityValue * 0.38) || 148250;
    const netRevenue = Math.round(revenueGenerated * 0.82) || 121400;
    const campaignRoi = opportunityValue
      ? Number(((revenueGenerated / Math.max(opportunityValue * 0.12, 1)) ).toFixed(2))
      : 4.82;

    return {
      opportunityCount: list.length,
      opportunityValue,
      revenueGenerated,
      netRevenue,
      campaignRoi: Math.min(campaignRoi, 9.99),
    };
  }, [opportunities]);

  return (
    <div className="app-shell text-ink-soft">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6 lg:px-8">
        <Hero3D
          opportunityCount={stats.opportunityCount}
          pipelineValue={stats.opportunityValue}
        />

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
            id="campaigns"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Operator loop
              </p>
              <h2 className="font-display mt-2 text-lg font-bold text-white">
                Who → What → When → Why
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted sm:text-sm">
                The orchestrator observes merchant data, proposes a campaign,
                simulates outcomes, enforces discount policy, then waits for your approval.
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
          </motion.aside>
        </div>

        <OpportunityFeed />
      </main>

      <footer className="border-t border-ink-border/80 py-6 text-center text-[11px] text-ink-muted">
        AI Revenue & Growth Orchestrator · Razorpay Buildathon Track 01
      </footer>
    </div>
  );
}
