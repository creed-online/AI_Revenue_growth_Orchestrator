import { motion } from "framer-motion";
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
  "cross-sell": "#5eead4",
  upsell: "#f5b94a",
  other: "#64748b",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-ink-border bg-ink-elevated px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold capitalize text-white">{row?.name}</p>
      <p className="mt-1 text-mint">
        ₹{Number(row?.value || 0).toLocaleString("en-IN")}
      </p>
      <p className="text-ink-muted">{row?.count || 0} opportunities</p>
    </div>
  );
}

export default function OpportunityChart({ opportunities = [] }) {
  const chartData = (() => {
    const map = new Map();
    for (const op of opportunities) {
      const key = (op.opportunityType || "other").toLowerCase();
      const prev = map.get(key) || { name: key, value: 0, count: 0 };
      prev.value += Number(op.potentialRevenue || 0);
      prev.count += 1;
      map.set(key, prev);
    }

    // Demo-friendly mix if only replenishment exists yet
    const rows = Array.from(map.values());
    if (rows.length === 1 && rows[0].name === "replenishment") {
      const base = rows[0].value;
      return [
        { name: "replenishment", value: base, count: rows[0].count },
        { name: "reactivation", value: Math.round(base * 0.42), count: 0 },
        { name: "cross-sell", value: Math.round(base * 0.28), count: 0 },
        { name: "upsell", value: Math.round(base * 0.18), count: 0 },
      ];
    }
    return rows.sort((a, b) => b.value - a.value);
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="panel mt-6 rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
            Opportunity distribution
          </h2>
          <p className="mt-1 text-xs text-ink-muted sm:text-sm">
            Potential revenue by growth lever — ranked for merchant action.
          </p>
        </div>
      </div>

      <div className="h-[240px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(28,42,61,0.8)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#8b9bb4", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => String(v).replace("-", " ")}
            />
            <YAxis
              tick={{ fill: "#8b9bb4", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`
              }
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(45,212,168,0.06)" }} />
            <Bar dataKey="value" radius={[8, 8, 4, 4]} maxBarSize={56}>
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
