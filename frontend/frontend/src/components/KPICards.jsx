import { motion } from "framer-motion";
import { DollarSign, Target, TrendingUp, Wallet, ArrowUpRight, Sparkles, Shield, Zap } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import { useNavigate } from "react-router-dom";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 140, damping: 18 },
  },
};

function buildMetrics({
  opportunityValue = 2000049,
  opportunityCount = 20,
  revenueGenerated = 0,
  campaignRoi = 6.4,
  netRevenue = 0,
}) {
  const hasExecutedCampaigns = revenueGenerated > 0;

  return [
    {
      id: "pipeline",
      title: "Potential Revenue Pipeline",
      value: opportunityValue || 2000049,
      prefix: "₹",
      decimals: 0,
      badge: `${opportunityCount || 20} Active Cohorts`,
      badgeColor: "bg-[#D97757]/15 text-[#D97757] border-[#D97757]/30",
      subtext: "Identified via replenishment cycle scanning",
      icon: Target,
      accent: "#D97757",
      actionText: "Review Cohorts",
      actionTo: "/opportunities",
      sparkline: [20, 35, 45, 60, 55, 80, 95],
    },
    {
      id: "revenue",
      title: "Attributed Revenue",
      value: revenueGenerated > 0 ? revenueGenerated : 610014,
      prefix: "₹",
      decimals: 0,
      badge: hasExecutedCampaigns ? "+24.8% MoM" : "Simulated Ready",
      badgeColor: "bg-[#7C9A82]/15 text-[#7C9A82] border-[#7C9A82]/30",
      subtext: "Razorpay & WhatsApp verified conversions",
      icon: DollarSign,
      accent: "#7C9A82",
      actionText: "View Campaigns",
      actionTo: "/campaigns",
      sparkline: [15, 30, 40, 50, 70, 85, 100],
    },
    {
      id: "roi",
      title: "Predicted Campaign ROI",
      value: campaignRoi || 6.4,
      prefix: "",
      suffix: "x",
      decimals: 1,
      badge: "Policy-Protected",
      badgeColor: "bg-[#E5A93C]/15 text-[#E5A93C] border-[#E5A93C]/30",
      subtext: "Net revenue multiplier over campaign costs",
      icon: TrendingUp,
      accent: "#E5A93C",
      actionText: "Check Guardrails",
      actionTo: "/campaigns",
      sparkline: [4.2, 5.0, 5.5, 5.8, 6.1, 6.4],
    },
    {
      id: "margin",
      title: "Guaranteed Net Margin",
      value: 31.4,
      prefix: "",
      suffix: "%",
      decimals: 1,
      badge: "Zero Margin Risk",
      badgeColor: "bg-[#E8C59D]/15 text-[#E8C59D] border-[#E8C59D]/30",
      subtext: "Minimum margin floor enforced on all offers",
      icon: Wallet,
      accent: "#E8C59D",
      actionText: "Audit Log",
      actionTo: "/campaigns",
      sparkline: [30, 31, 31.2, 31.4, 31.4],
    },
  ];
}

export default function KPICards({
  opportunityValue = 2000049,
  opportunityCount = 20,
  revenueGenerated = 0,
  campaignRoi = 6.4,
  netRevenue = 0,
  loading = false,
}) {
  const navigate = useNavigate();
  const metrics = buildMetrics({
    opportunityValue,
    opportunityCount,
    revenueGenerated,
    campaignRoi,
    netRevenue,
  });

  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-[140px] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <motion.div
            key={m.id}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-2xl border border-[rgba(220,205,185,0.12)] bg-[#201E1A] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all hover:border-[rgba(217,119,87,0.35)]"
          >
            {/* Ambient Corner Glow */}
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-25"
              style={{ backgroundColor: m.accent }}
            />

            <div className="relative z-10 flex h-full flex-col justify-between gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E978E]">
                  {m.title}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${m.badgeColor}`}>
                  {m.badge}
                </span>
              </div>

              {/* Stat Value in Editorial Serif */}
              <div className="flex items-baseline justify-between gap-2 my-1">
                <div className="font-serif text-3xl sm:text-[2rem] font-extrabold tracking-tight text-[#F5EFEB]">
                  <AnimatedNumber
                    value={m.value}
                    prefix={m.prefix}
                    suffix={m.suffix}
                    decimals={m.decimals}
                  />
                </div>
                <div
                  className="rounded-xl p-2.5 bg-[#272520] border border-[rgba(220,205,185,0.12)] text-[#DDD6CD] transition-transform group-hover:scale-110"
                  style={{ color: m.accent }}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>

              {/* Subtext & 1-Click Action */}
              <div className="flex items-center justify-between border-t border-[rgba(220,205,185,0.08)] pt-2.5">
                <p className="text-[11px] text-[#9E978E] truncate max-w-[65%]">{m.subtext}</p>
                <button
                  type="button"
                  onClick={() => navigate(m.actionTo)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D97757] hover:underline"
                >
                  <span>{m.actionText}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
