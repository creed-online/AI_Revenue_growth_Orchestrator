import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, LineChart, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchCampaignResults,
  measureCampaignResults,
} from "../api/client";

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function pct(n) {
  return `${(Number(n || 0) * 100).toFixed(1)}%`;
}

export default function CampaignResultsPage() {
  const { campaignId } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["campaign-results", campaignId],
    queryFn: () => fetchCampaignResults(campaignId),
  });

  const measure = useMutation({
    mutationFn: () => measureCampaignResults(campaignId),
    onSuccess: (payload) => {
      queryClient.setQueryData(["campaign-results", campaignId], payload);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="skeleton h-72 rounded-2xl" />
      </main>
    );
  }

  if (isError || !data?.campaign) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-display text-xl font-bold text-white">Campaign not found</p>
        <Link to="/campaigns" className="mt-4 inline-block text-sm text-mint">
          Back to campaigns
        </Link>
      </main>
    );
  }

  const { campaign, predicted, actual, delta } = data;
  const chartData = [
    {
      metric: "Revenue",
      predicted: predicted?.revenue || 0,
      actual: actual?.revenue || 0,
    },
    {
      metric: "Net revenue",
      predicted: predicted?.netRevenue || 0,
      actual: actual?.netRevenue || 0,
    },
    {
      metric: "Discount cost",
      predicted: predicted?.discountCost || 0,
      actual: actual?.discountCost || 0,
    },
  ];

  const canMeasure =
    (campaign.status === "running" || campaign.status === "completed") && !actual;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6">
      <Link
        to="/campaigns"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Campaigns
      </Link>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint">
            Predicted vs actual
          </p>
          <h1 className="font-display mt-1 text-2xl font-extrabold text-white">
            {campaign.name}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            Status {campaign.status} · {campaign.offerValue}% offer · audience{" "}
            {campaign.audienceSize}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/campaigns/${campaignId}/audit`}
            className="rounded-xl border border-ink-border px-3 py-2 text-xs font-semibold text-ink-soft"
          >
            Audit trail
          </Link>
          {canMeasure || campaign.status === "running" ? (
            <button
              type="button"
              onClick={() => measure.mutate()}
              disabled={measure.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-3 py-2 text-xs font-bold text-ink disabled:opacity-60"
            >
              {measure.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LineChart className="h-3.5 w-3.5" />
              )}
              Measure results
            </button>
          ) : null}
        </div>
      </header>

      {measure.error && (
        <p className="mb-4 text-xs text-rose-signal">
          {measure.error?.response?.data?.message || measure.error.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Predicted revenue", value: money(predicted?.revenue) },
          { label: "Actual revenue", value: actual ? money(actual.revenue) : "—" },
          { label: "Predicted ROI", value: `${Number(predicted?.roi || 0).toFixed(2)}x` },
          { label: "Actual ROI", value: actual ? `${Number(actual.roi).toFixed(2)}x` : "—" },
        ].map((item) => (
          <div key={item.label} className="panel rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">{item.label}</p>
            <p className="mt-1 font-display text-lg font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel mt-6 rounded-2xl p-5 sm:p-6"
      >
        <h2 className="font-display text-lg font-bold text-white">Side-by-side</h2>
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(28,42,61,0.8)" vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: "#8b9bb4", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#8b9bb4", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0c121c",
                  border: "1px solid #1c2a3d",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => money(v)}
              />
              <Legend />
              <Bar dataKey="predicted" name="Predicted" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive />
              <Bar dataKey="actual" name="Actual" fill="#2dd4a8" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {actual && (
        <section className="panel mt-4 overflow-x-auto rounded-2xl p-5">
          <h2 className="font-display mb-3 text-lg font-bold text-white">Accuracy</h2>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium">Predicted</th>
                <th className="pb-2 font-medium">Actual</th>
                <th className="pb-2 font-medium">Delta</th>
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              <tr className="border-t border-ink-border">
                <td className="py-2">Revenue</td>
                <td>{money(predicted.revenue)}</td>
                <td className="text-mint">{money(actual.revenue)}</td>
                <td>{money(delta?.revenue)}</td>
              </tr>
              <tr className="border-t border-ink-border">
                <td className="py-2">Net revenue</td>
                <td>{money(predicted.netRevenue)}</td>
                <td>{money(actual.netRevenue)}</td>
                <td>{money(delta?.netRevenue)}</td>
              </tr>
              <tr className="border-t border-ink-border">
                <td className="py-2">ROI</td>
                <td>{Number(predicted.roi).toFixed(2)}x</td>
                <td>{Number(actual.roi).toFixed(2)}x</td>
                <td>{Number(delta?.roi || 0).toFixed(2)}x</td>
              </tr>
              <tr className="border-t border-ink-border">
                <td className="py-2">Conversion</td>
                <td>{pct(predicted.conversionRate)}</td>
                <td>{pct(actual.conversionRate)}</td>
                <td>{pct(delta?.conversionRate)}</td>
              </tr>
              <tr className="border-t border-ink-border">
                <td className="py-2">Reach / conversions</td>
                <td>{predicted.audienceSize} audience</td>
                <td>
                  {actual.reach} reach · {actual.conversions} conversions
                </td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
