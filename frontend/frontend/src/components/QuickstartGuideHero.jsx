import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play, CheckCircle2, Key, FileText, MessageSquare, Shield, Clock, Award, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ArgoLogo from "./ArgoLogo";

const STORY_TABS = [
  {
    id: "quick_tour",
    title: "60s Quick Tour",
    icon: Zap,
    headline: "Autonomous Revenue Optimization in 3 Simple Steps",
    bullets: [
      "1. Ingest customer & product order histories (CSV or Shopify)",
      "2. AI detects repurchase cycles & runs margin-guarded simulations",
      "3. 1-Click execute personalized WhatsApp nudges with 1-tap Razorpay checkout",
    ],
    highlight: "₹20,00,049 Addressable Revenue Pipeline Detected",
  },
  {
    id: "rakshfit_story",
    title: "The RakshFit Story",
    icon: Award,
    headline: "From Manual Discounting to 6.4x Predictable Rebuy ROI",
    bullets: [
      "Consumable nutrition products (Whey Protein, Creatine) follow strict 28-35 day cycles",
      "Blanket 20% sales were eroding 34% product margins",
      "ARGOES zeroed in on the exact 3-day rebuy window per customer, maintaining 31.4% net margins",
    ],
    highlight: "+42% Higher Customer Lifetime Value Recorded",
  },
  {
    id: "autopilot_guardrails",
    title: "How Autopilot Works",
    icon: Shield,
    headline: "AI Reasoning with Deterministic Financial Guardrails",
    bullets: [
      "Claude 3.7 / Groq LLMs analyze repurchase probabilities and draft conversational copy",
      "Deterministic Policy Engine enforces max 15% discount and opt-out checks before execution",
      "Merchant retains full oversight: 1-click approvals with live audit logs",
    ],
    highlight: "100% Policy-Safe & Zero Brand Erosion",
  },
];

export default function QuickstartGuideHero({
  opportunityCount = 20,
  pipelineValue = 2000049,
  onOpenWizard,
  onOpenReport,
  onOpenStudio,
}) {
  const [activeStoryTab, setActiveStoryTab] = useState("quick_tour");
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const navigate = useNavigate();

  const currentTab = STORY_TABS.find((t) => t.id === activeStoryTab) || STORY_TABS[0];

  return (
    <section className="relative mt-3 overflow-hidden rounded-2xl border border-[rgba(220,205,185,0.14)] bg-[#201E1A] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
      {/* Background Ambient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#D97757]/10 via-[#E5A93C]/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 h-64 w-64 bg-[#D97757]/8 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(220,205,185,0.1)] bg-[#181714] px-5 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D97757]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#D97757] border border-[#D97757]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D97757] animate-pulse" />
            Active Growth Engine
          </span>
          <span className="text-xs text-[#9E978E] hidden sm:inline">
            | Merchant Autopilot: <strong className="text-white font-medium">RakshFit Nutrition</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenWizard}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(220,205,185,0.15)] bg-[#272520] px-2.5 py-1 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition-colors"
          >
            <Key className="h-3 w-3 text-[#E5A93C]" />
            <span>BYO Channels</span>
          </button>
          <button
            type="button"
            onClick={onOpenStudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(220,205,185,0.15)] bg-[#272520] px-2.5 py-1 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition-colors"
          >
            <MessageSquare className="h-3 w-3 text-[#7C9A82]" />
            <span>WhatsApp Studio</span>
          </button>
          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(220,205,185,0.15)] bg-[#272520] px-2.5 py-1 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition-colors"
          >
            <FileText className="h-3 w-3 text-[#D97757]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Hero Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 p-5 sm:p-7">
        {/* Left Column: Storytelling & Quick Launch CTAs */}
        <div className="flex flex-col justify-between space-y-5">
          <div>
            {/* Story Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-[rgba(220,205,185,0.1)] bg-[#181714] p-1 mb-4 w-fit">
              {STORY_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveStoryTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeStoryTab === tab.id
                        ? "bg-[#D97757] text-[#181714] font-bold shadow-sm"
                        : "text-[#9E978E] hover:text-[#DDD6CD]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.title}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <h1 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight">
                  {currentTab.headline}
                </h1>

                <ul className="space-y-2 pt-1">
                  {currentTab.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#DDD6CD] leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D97757] mt-1.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="inline-flex items-center gap-2 rounded-lg bg-[#272520] border border-[rgba(220,205,185,0.14)] px-3 py-1.5 text-xs font-semibold text-[#E5A93C] mt-2">
                  <ArgoLogo className="h-3.5 w-3.5" />
                  <span>{currentTab.highlight}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/opportunities")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-5 py-3 text-xs font-bold text-[#181714] shadow-[0_4px_20px_rgba(217,119,87,0.35)] transition hover:brightness-110"
            >
              <span>Approve Top 3 Campaigns (₹9.4L)</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-2 rounded-xl border border-[rgba(220,205,185,0.2)] bg-[#181714] px-4 py-3 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition-colors"
            >
              <Key className="h-3.5 w-3.5 text-[#E5A93C]" />
              <span>Connect Live WhatsApp / Razorpay</span>
            </button>
          </div>
        </div>

        {/* Right Column: 16:9 Video Walkthrough Frame */}
        <div className="relative flex flex-col justify-center">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[rgba(220,205,185,0.18)] bg-[#181714] shadow-[0_12px_36px_rgba(0,0,0,0.6)] group">
            {isPlayingVideo ? (
              <div className="relative h-full w-full bg-black flex items-center justify-center">
                {/* Embedded Video Player */}
                <video
                  src="/demo-video.mp4"
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // Fallback to demo.mp4 if demo-video.mp4 is not yet present
                    if (!e.target.dataset.triedFallback) {
                      e.target.dataset.triedFallback = "true";
                      e.target.src = "/demo.mp4";
                    }
                  }}
                >
                  <source src="/demo-video.mp4" type="video/mp4" />
                  <source src="/demo.mp4" type="video/mp4" />
                  Your browser does not support HTML5 video.
                </video>

                {/* Top Overlay Controls */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlayingVideo(false)}
                    className="rounded-lg bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 transition border border-white/15"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative h-full w-full">
                {/* Poster Background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#181714] via-[#201E1A] to-[#272520] flex items-center justify-center">
                  <div className="text-center p-6 space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVideo(true)}
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#D97757] to-[#E5A93C] text-[#181714] shadow-[0_0_30px_rgba(217,119,87,0.5)] transition-transform group-hover:scale-110 cursor-pointer"
                      title="Play Demo Video"
                    >
                      <Play className="h-6 w-6 fill-current ml-0.5" />
                    </button>
                    <p className="font-display text-sm font-bold text-white pt-2">
                      Watch ARGOES 2-Minute Demo Tour
                    </p>
                    <p className="text-[11px] text-[#9E978E]">
                      1080p Full HD Walkthrough · Ingestion to 1-Tap Razorpay Checkout
                    </p>
                  </div>
                </div>

                {/* Video Badges */}
                <div className="absolute top-3 left-3 rounded-md bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white border border-white/10">
                  1080p HD
                </div>
                <div className="absolute bottom-3 right-3 rounded-md bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-mono text-[#DDD6CD] border border-white/10">
                  02:00
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

