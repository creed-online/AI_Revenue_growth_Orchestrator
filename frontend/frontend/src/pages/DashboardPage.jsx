import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, Key, FileText, MessageSquare, Database, ArrowRight, CheckCircle2, Sparkles, SlidersHorizontal, Zap } from "lucide-react";
import KPICards from "../components/KPICards";
import OpportunityChart from "../components/OpportunityChart";
import OpportunityFeed from "../components/OpportunityFeed";
import FloatingAuthBox from "../components/FloatingAuthBox";
import QuickstartGuideHero from "../components/QuickstartGuideHero";
import IntegrationWizardModal from "../components/IntegrationWizardModal";
import TemplateStudioModal from "../components/TemplateStudioModal";
import ExecutiveReportModal from "../components/ExecutiveReportModal";
import ErrorBoundary from "../components/ErrorBoundary";
import CommandPalette from "../components/CommandPalette";
import ArgoLogo from "../components/ArgoLogo";
import { fetchCampaigns, fetchOpportunities } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ThreeCustomerGlobe = lazy(() => import("../components/ThreeCustomerGlobe"));

function GlobeFallback() {
  return (
    <div className="mt-8 h-[360px] animate-pulse rounded-3xl border border-[rgba(220,205,185,0.12)] bg-[#201E1A]" />
  );
}

export default function DashboardPage() {
  const { merchantId, isAuthenticated, merchant } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = merchantId === 1;

  // Modal States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const { data: opportunities = [], isLoading, refetch: refetchOpps } = useQuery({
    queryKey: ["opportunities", merchantId],
    queryFn: () => fetchOpportunities(merchantId),
    enabled: true,
  });

  const { data: campaigns = [], refetch: refetchCampaigns } = useQuery({
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
        : 6.4;

    return {
      opportunityCount: list.length || 20,
      opportunityValue: opportunityValue || 2000049,
      revenueGenerated,
      netRevenue,
      campaignRoi,
    };
  }, [opportunities, campaigns]);

  return (
    <>
      {!isAuthenticated && <FloatingAuthBox />}

      {/* Integration & Studio Modals */}
      <IntegrationWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onUpdated={() => {
          refetchOpps();
          refetchCampaigns();
        }}
      />
      <TemplateStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
      />
      <ExecutiveReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-3 sm:px-6 lg:px-8 space-y-6">
        {/* Top Guided Stepper + Status Indicators */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[rgba(220,205,185,0.1)] pb-3">
          {/* 3-Step Guided Workflow Progress Stepper */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
            <button
              type="button"
              onClick={() => navigate("/import")}
              className="flex items-center gap-1.5 rounded-lg bg-[#272520] border border-[rgba(220,205,185,0.14)] px-2.5 py-1 text-[#7C9A82] hover:border-[#7C9A82]/50 font-semibold transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>1. Ingest Data</span>
            </button>
            <span className="text-[#9E978E]/60 select-none">→</span>
            <div className="flex items-center gap-1.5 rounded-lg bg-[#D97757]/15 border border-[#D97757]/30 px-2.5 py-1 text-[#D97757] font-bold">
              <ArgoLogo className="h-3.5 w-3.5" />
              <span>2. AI Scans {Array.isArray(opportunities) && opportunities.length > 0 ? opportunities.length : 20} Cohorts</span>
            </div>
            <span className="text-[#9E978E]/60 select-none">→</span>
            <button
              type="button"
              onClick={() => navigate("/opportunities")}
              className="flex items-center gap-1.5 rounded-lg bg-[#201E1A] border border-[rgba(220,205,185,0.18)] px-2.5 py-1 text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] font-semibold transition-colors shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 text-[#E5A93C]" />
              <span>3. 1-Click Launch</span>
            </button>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#201E1A] px-3 py-1.5 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition-colors shadow-sm"
            >
              <Key className="h-3.5 w-3.5 text-[#E5A93C]" />
              <span>Channels Setup</span>
            </button>

            <button
              type="button"
              onClick={() => setIsStudioOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#201E1A] px-3 py-1.5 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition-colors shadow-sm"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#7C9A82]" />
              <span>Template Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-3.5 py-1.5 text-xs font-bold text-[#181714] hover:brightness-110 transition-colors shadow-md"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Executive Report</span>
            </button>
          </div>
        </div>

        {/* Centered Command & Quick Action Search Bar */}
        <div className="mx-auto w-full max-w-2xl px-2">
          <CommandPalette fullWidth />
        </div>

        {/* Quickstart Storytelling Hero with 16:9 Video Slot */}
        <QuickstartGuideHero
          opportunityCount={stats.opportunityCount}
          pipelineValue={stats.opportunityValue}
          onOpenWizard={() => setIsWizardOpen(true)}
          onOpenStudio={() => setIsStudioOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
        />

        {/* Actionable Bento KPI Grid */}
        <KPICards
          loading={isLoading}
          opportunityCount={stats.opportunityCount}
          opportunityValue={stats.opportunityValue}
          revenueGenerated={stats.revenueGenerated}
          campaignRoi={stats.campaignRoi}
          netRevenue={stats.netRevenue}
        />

        {/* Opportunity Chart & Operator Loop Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <OpportunityChart opportunities={opportunities} />

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="panel flex flex-col justify-between rounded-2xl p-5 sm:p-6"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D97757]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#D97757] border border-[#D97757]/30 mb-2">
                <ShieldCheck className="h-3 w-3" />
                Autonomous Guardrail Loop
              </div>
              <h2 className="font-display text-lg font-bold text-white">
                Who → What → When → Why
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#9E978E]">
                Detect replenishment windows, simulate offers with guaranteed 31.4% margin floors, and execute live via BYO channels.
              </p>
            </div>

            <ol className="mt-5 space-y-2.5">
              {[
                { step: "01", title: "Scan Repurchase Windows", desc: "Per-customer consumable consumption tracking" },
                { step: "02", title: "Reason & Simulate", desc: "Groq/Claude drafts personalized D2C copy" },
                { step: "03", title: "Deterministic Policy Gate", desc: "Max 15% discount & opt-out verification" },
                { step: "04", title: "1-Click Channel Dispatch", desc: "Live WhatsApp + Razorpay payment links" },
              ].map((item, i) => (
                <li
                  key={item.step}
                  className="flex items-start gap-3 rounded-xl border border-[rgba(220,205,185,0.1)] bg-[#181714] px-3 py-2.5"
                >
                  <span className="font-serif text-sm font-bold text-[#D97757]">{item.step}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{item.title}</p>
                    <p className="text-[11px] text-[#9E978E]">{item.desc}</p>
                  </div>
                  <span className="ml-auto text-[10px] text-[#7C9A82] font-bold">{i < 3 ? "→" : "✔"}</span>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => navigate("/opportunities")}
              className="mt-4 text-center text-xs font-bold text-[#D97757] hover:underline"
            >
              Review All 20 Active Cohorts →
            </button>
          </motion.aside>
        </div>

        {/* 3D Customer Cohort Retention Galaxy */}
        <ErrorBoundary fallback={<GlobeFallback />}>
          <Suspense fallback={<GlobeFallback />}>
            <ThreeCustomerGlobe />
          </Suspense>
        </ErrorBoundary>

        {/* Ranked Opportunity Feed */}
        <OpportunityFeed />
      </main>
    </>
  );
}
