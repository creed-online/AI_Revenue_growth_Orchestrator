import { motion } from "framer-motion";
import { DollarSign, Target, TrendingUp, Wallet } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 22, opacity: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 16 },
  },
};

function buildMetrics({
  opportunityValue = 0,
  opportunityCount = 0,
  revenueGenerated = 0,
  campaignRoi = 0,
  netRevenue = 0,
}) {
  const hasExecutedCampaigns = revenueGenerated > 0 || campaignRoi > 0;

  return [
    {
      title: "Revenue generated",
      value: revenueGenerated,
      prefix: "₹",
      decimals: 0,
      change: hasExecutedCampaigns ? "+18.4%" : "0 completed",
      subtext: hasExecutedCampaigns ? "executed campaigns · last 30d" : "Execute a campaign to generate revenue",
      icon: DollarSign,
      accent: "mint",
      ring: "border-mint/25",
      badge: hasExecutedCampaigns ? "bg-mint/10 text-mint" : "bg-white/5 text-ink-muted",
      iconBg: "bg-mint/15 text-mint",
      wash: "from-mint/15 via-transparent to-transparent",
    },
    {
      title: "Opportunity value",
      value: opportunityValue,
      prefix: "₹",
      decimals: 0,
      change: `${opportunityCount} live`,
      subtext: "pipeline potential across cohorts",
      icon: Target,
      accent: "sky",
      ring: "border-sky/25",
      badge: "bg-sky/10 text-sky",
      iconBg: "bg-sky/15 text-sky",
      wash: "from-sky/15 via-transparent to-transparent",
    },
    {
      title: "Campaign ROI",
      value: campaignRoi,
      prefix: "",
      suffix: "x",
      decimals: 2,
      change: hasExecutedCampaigns ? "+0.6x" : "—",
      subtext: hasExecutedCampaigns ? "predicted net multiplier" : "Run first campaign to measure ROI",
      icon: TrendingUp,
      accent: "amber",
      ring: "border-amber-signal/25",
      badge: hasExecutedCampaigns ? "bg-amber-signal/10 text-amber-signal" : "bg-white/5 text-ink-muted",
      iconBg: "bg-amber-signal/15 text-amber-signal",
      wash: "from-amber-signal/15 via-transparent to-transparent",
    },
    {
      title: "Net revenue",
      value: netRevenue,
      prefix: "₹",
      decimals: 0,
      change: hasExecutedCampaigns ? "after discounts" : "—",
      subtext: hasExecutedCampaigns ? "expected lift · policy-safe" : "Realized profit after campaign costs",
      icon: Wallet,
      accent: "mint",
      ring: "border-mint-deep/30",
      badge: hasExecutedCampaigns ? "bg-mint-deep/15 text-mint" : "bg-white/5 text-ink-muted",
      iconBg: "bg-mint-deep/15 text-mint",
      wash: "from-mint-deep/20 via-transparent to-transparent",
    },
  ];
}

export default function KPICards({
  opportunityValue = 0,
  opportunityCount = 0,
  revenueGenerated = 0,
  campaignRoi = 0,
  netRevenue = 0,
  loading = false,
}) {
  const metrics = buildMetrics({
    opportunityValue,
    opportunityCount,
    revenueGenerated,
    campaignRoi,
    netRevenue,
  });

  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-[132px] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.title}
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={`panel-interactive group relative overflow-hidden rounded-2xl border p-5 ${metric.ring}`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${metric.wash} opacity-80 transition-opacity group-hover:opacity-100`}
            />

            <div className="relative z-10 flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {metric.title}
                </span>
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-wide transition-transform group-hover:scale-105 ${metric.badge}`}
                >
                  {metric.change}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                  <AnimatedNumber
                    value={metric.value}
                    prefix={metric.prefix}
                    suffix={metric.suffix}
                    decimals={metric.decimals}
                  />
                </div>
                <div
                  className={`rounded-xl p-2.5 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${metric.iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <p className="text-xs text-ink-muted">{metric.subtext}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
