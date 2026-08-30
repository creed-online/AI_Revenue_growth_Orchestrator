import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, TrendingUp } from "lucide-react";
import ArgoLogo from "./ArgoLogo";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  replenishment: "#2dd4a8",
  reactivation: "#38bdf8",
  "cross-sell": "#a78bfa",
  cross_sell: "#a78bfa",
  upsell: "#f5b94a",
  other: "#64748b",
};

const STRATEGY_LABELS = {
  replenishment: "Replenishment",
  reactivation: "Win-Back",
  "cross-sell": "Promotions",
  cross_sell: "Promotions",
  upsell: "VIP Upsell",
  other: "Other",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const label = STRATEGY_LABELS[row?.name] || row?.name;

  return (
    <div className="rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-xs shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: COLORS[row?.name] || COLORS.other }}
        />
        <p className="font-bold text-white capitalize">{label}</p>
      </div>
      <p className="mt-2 text-base font-extrabold text-mint">
        ₹{Number(row?.value || 0).toLocaleString("en-IN")}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-muted">
        {row?.count || 0} active {row?.count === 1 ? "opportunity" : "opportunities"}
      </p>
    </div>
  );
}

export default function OpportunityChart({ opportunities = [] }) {
  const list = Array.isArray(opportunities) ? opportunities : [];

  const { chartData, totalValue, totalCount } = (() => {
    const map = new Map();
    let sum = 0;

    for (const op of list) {
      const key = (op.opportunityType || "other").toLowerCase();
      const val = Number(op.potentialRevenue || 0);
      const prev = map.get(key) || { name: key, value: 0, count: 0 };
      prev.value += val;
      prev.count += 1;
      sum += val;
      map.set(key, prev);
    }

    const rows = Array.from(map.values()).sort((a, b) => b.value - a.value);
    return {
      chartData: rows,
      totalValue: sum,
      totalCount: list.length,
    };
  })();

  if (list.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="panel mt-6 flex min-h-[340px] flex-col items-center justify-center rounded-2xl p-8 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-mint/20 bg-mint/10 text-mint">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h3 className="font-display mt-4 text-base font-bold text-white sm:text-lg">
          No opportunities generated yet
        </h3>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-muted sm:text-sm">
          Upload your customer or orders CSV dataset to immediately detect dormant win-backs, VIP loyalty upsells, and replenishment cycles.
        </p>
        <Link
          to="/import"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-4 py-2.5 text-xs font-bold text-[#181714] transition hover:brightness-110"
        >
          <ArgoLogo className="h-4 w-4" />
          <span>Import Customer Dataset →</span>
        </Link>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="panel mt-6 rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
              Opportunity Distribution
            </h2>
            <span className="rounded-md border border-mint/25 bg-mint/10 px-2 py-0.5 text-[10px] font-bold text-mint">
              {totalCount} Active
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted sm:text-sm">
            Live potential revenue grouped by growth strategy.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="block text-[10px] uppercase tracking-wider text-ink-muted">
            Total Pipeline Potential
          </span>
          <span className="font-display text-lg font-black text-mint sm:text-xl">
            ₹{Math.round(totalValue).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div className="h-[240px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(28,42,61,0.8)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#8b9bb4", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => STRATEGY_LABELS[v] || String(v).replace("-", " ")}
            />
            <YAxis
              tick={{ fill: "#8b9bb4", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`
              }
              width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(45,212,168,0.06)" }} />
            <Bar
              dataKey="value"
              radius={[8, 8, 4, 4]}
              maxBarSize={56}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[entry.name] || COLORS.other}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
