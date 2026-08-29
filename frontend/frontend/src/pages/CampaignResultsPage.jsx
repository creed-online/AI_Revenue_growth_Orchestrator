import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  LineChart,
  RefreshCw,
  TrendingUp,
  Users,
  Mail,
  Eye,
  MousePointer,
  ShoppingBag,
  ShieldCheck,
  Tag,
  ExternalLink,
  FileDown,
} from "lucide-react";
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
import CampaignEmailSimulatorModal from "../components/CampaignEmailSimulatorModal";
import ThreeConversionFunnel from "../components/ThreeConversionFunnel";
import { generateCampaignPDF } from "../utils/exportPDF";

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function pct(n) {
  return `${(Number(n || 0) * 100).toFixed(1)}%`;
}

export default function CampaignResultsPage() {
  const { campaignId } = useParams();
  const queryClient = useQueryClient();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // "all" | "live" | "test"
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["campaign-results", campaignId],
    queryFn: () => fetchCampaignResults(campaignId),
  });

  const measure = useMutation({
    mutationFn: () => measureCampaignResults(campaignId),
    onSuccess: (payload) => {
      queryClient.setQueryData(["campaign-results", campaignId], payload);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["opportunity"] });
    },
  });


  const handleExportPDF = async () => {
    if (!data) return;
    setIsPdfGenerating(true);
    try {
      await generateCampaignPDF({
        campaign: data.campaign,
        predicted: data.predicted,
        actual: data.actual,
        delta: data.delta,
        funnel: data.funnel,
        attributedOrders: data.attributedOrders || [],
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton h-72 rounded-2xl bg-slate-900/60 border border-slate-800" />
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

  const { campaign, predicted, actual, delta, funnel, attributedOrders = [] } = data;

  const filteredOrders = attributedOrders.filter((o) => {
    if (filterMode === "live") return !o.isTestMode;
    if (filterMode === "test") return o.isTestMode;
    return true;
  });

  const chartData = [
    {
      metric: "Gross Revenue",
      predicted: predicted?.revenue || 0,
      actual: actual?.revenue || 0,
    },
    {
      metric: "Net Profit",
      predicted: predicted?.netRevenue || 0,
      actual: actual?.netRevenue || 0,
    },
    {
      metric: "Discount Burn",
      predicted: predicted?.discountCost || 0,
      actual: actual?.discountCost || 0,
    },
  ];

  const audienceSize = funnel?.audienceSize || campaign.audienceSize || 0;
  const delivered = funnel?.delivered || campaign.notifications?.length || 0;
  const opened = funnel?.opened || 0;
  const clicked = funnel?.clicked || 0;
  const conversions = funnel?.conversions || (actual?.conversions ?? 0);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      {/* Back Navigation */}
      <Link
        to="/campaigns"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-white transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-mint">
              Real-World Outcome & Attribution
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Campaign #{campaign.id}
            </span>
          </div>
          <h1 className="font-display mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            {campaign.name}
          </h1>
          <p className="mt-1 text-xs text-ink-muted flex items-center gap-2">
            <span>Status: <strong className="text-white capitalize">{campaign.status}</strong></span>
            &bull;
            <span>Offer: <strong className="text-mint">{campaign.offerValue}% OFF</strong></span>
            &bull;
            <span>Audience: <strong className="text-white">{audienceSize} customers</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* PDF Export Button */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isPdfGenerating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3.5 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20 transition shadow-sm disabled:opacity-60 disabled:cursor-wait"
          >
            {isPdfGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            {isPdfGenerating ? "Generating PDF..." : "Export PDF Report"}
          </button>

          <button
            type="button"
            onClick={() => setIsSimulatorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3.5 py-2 text-xs font-bold text-teal-300 hover:bg-teal-500/20 transition shadow-sm"
          >
            <span>✉️</span> Interactive Testing Lab
          </button>

          <Link
            to={`/campaigns/${campaignId}/audit`}
            className="rounded-xl border border-ink-border bg-ink/30 px-3.5 py-2 text-xs font-semibold text-ink-soft hover:text-white transition"
          >
            Audit Trail
          </Link>

          <button
            type="button"
            onClick={() => measure.mutate()}
            disabled={measure.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-4 py-2 text-xs font-bold text-ink shadow-[0_0_20px_-5px_rgba(45,212,168,0.4)] transition hover:brightness-110 disabled:opacity-60"
          >
            {measure.isPending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Measuring Real DB Outcomes...
              </>
            ) : (
              <>
                <LineChart className="h-3.5 w-3.5" />
                Re-Measure & Sync Live Orders
              </>
            )}
          </button>
        </div>
      </header>

      {/* 3D Isometric Glass Conversion Funnel */}
      <ThreeConversionFunnel funnelData={funnel} />

      {/* 5-Stage Live Conversion Funnel */}
      <section className="mb-8 rounded-2xl border border-ink-border bg-ink-panel/70 p-5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
            <span>📊</span> 5-Stage Conversion Funnel Metrics
          </h2>
          <span className="text-[11px] text-teal-400 font-mono">
            Overall Conversion: {pct(audienceSize > 0 ? conversions / audienceSize : 0)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {/* Stage 1: Audience */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Audience</span>
              <Users className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="mt-1 text-xl font-bold text-white">{audienceSize}</div>
            <div className="mt-1 text-[10px] text-slate-500">Targeted buyers</div>
          </div>

          {/* Stage 2: Delivered */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Delivered</span>
              <Mail className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="mt-1 text-xl font-bold text-sky-300">{delivered}</div>
            <div className="mt-1 text-[10px] text-slate-500">
              {pct(audienceSize > 0 ? delivered / audienceSize : 1)} send rate
            </div>
          </div>

          {/* Stage 3: Opened */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Opened</span>
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-300">{opened}</div>
            <div className="mt-1 text-[10px] text-slate-500">
              {pct(delivered > 0 ? opened / delivered : 0)} open rate
            </div>
          </div>

          {/* Stage 4: Clicked */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Clicked</span>
              <MousePointer className="h-3.5 w-3.5 text-teal-400" />
            </div>
            <div className="mt-1 text-xl font-bold text-teal-300">{clicked}</div>
            <div className="mt-1 text-[10px] text-slate-500">
              {pct(delivered > 0 ? clicked / delivered : 0)} click rate
            </div>
          </div>

          {/* Stage 5: Purchased */}
          <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-teal-300 text-xs font-semibold">
              <span>Purchased</span>
              <ShoppingBag className="h-3.5 w-3.5 text-teal-400" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-mint">{conversions}</div>
            <div className="mt-1 text-[10px] text-teal-400/80">
              {attributedOrders.length} total orders
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <div className="panel rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Actual Gross Revenue</p>
          <p className="mt-1 font-display text-xl font-bold text-mint">
            {actual ? money(actual.revenue) : "—"}
          </p>
          <p className="text-[10px] text-ink-muted mt-1">
            Predicted: {money(predicted?.revenue)} ({delta ? money(delta.revenue) : "0"})
          </p>
        </div>

        <div className="panel rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Actual Net Profit</p>
          <p className="mt-1 font-display text-xl font-bold text-white">
            {actual ? money(actual.netRevenue) : "—"}
          </p>
          <p className="text-[10px] text-ink-muted mt-1">
            Predicted: {money(predicted?.netRevenue)}
          </p>
        </div>

        <div className="panel rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Campaign ROI</p>
          <p className="mt-1 font-display text-xl font-bold text-sky-400">
            {actual ? `${Number(actual.roi).toFixed(2)}x` : "—"}
          </p>
          <p className="text-[10px] text-ink-muted mt-1">
            Predicted: {Number(predicted?.roi || 0).toFixed(2)}x
          </p>
        </div>

        <div className="panel rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Total Cost Burn</p>
          <p className="mt-1 font-display text-xl font-bold text-rose-400">
            {actual ? money(actual.discountCost + actual.campaignCost) : "—"}
          </p>
          <p className="text-[10px] text-ink-muted mt-1">
            Discounts: {actual ? money(actual.discountCost) : "₹0"}
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel rounded-2xl p-5 sm:p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-bold text-white">
            Predicted vs. Real-World Actual Performance
          </h2>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(28,42,61,0.8)" vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: "#8b9bb4", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#8b9bb4", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
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
              <Bar dataKey="predicted" name="AI Projected" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="actual" name="Real Captured" fill="#2dd4a8" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Attributed Orders Table */}
      <section className="panel rounded-2xl p-5 sm:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <span>🧾</span> Attributed Customer Orders ({filteredOrders.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified orders linked to Campaign #{campaign.id} via tracking tokens & payment webhooks.
            </p>
          </div>

          {/* Test/Live Filter Toggle */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-lg transition ${
                filterMode === "all" ? "bg-teal-500/20 text-teal-300 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              All Orders ({attributedOrders.length})
            </button>
            <button
              onClick={() => setFilterMode("live")}
              className={`px-3 py-1 rounded-lg transition ${
                filterMode === "live" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Live Verified
            </button>
            <button
              onClick={() => setFilterMode("test")}
              className={`px-3 py-1 rounded-lg transition ${
                filterMode === "test" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Test Mode
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <ShoppingBag className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No attributed orders placed yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Use the <strong>"Interactive Testing Lab"</strong> above to simulate opens, clicks, and Razorpay payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Gross Amount</th>
                  <th className="py-2.5 px-3">Discount</th>
                  <th className="py-2.5 px-3">Attribution Method</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{order.customerName}</div>
                      <div className="text-[11px] text-slate-500">{order.customerEmail}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-mint">
                      {money(order.totalPrice)}
                    </td>
                    <td className="py-3 px-3 text-rose-400">
                      -{money(order.discountAmount)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                        {order.attributionType}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {order.isTestMode ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                          TEST MODE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                          LIVE ORDER
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Interactive Testing Modal */}
      <CampaignEmailSimulatorModal
        campaignId={campaign.id}
        campaignName={campaign.name}
        offerValue={campaign.offerValue || 10}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onOrderCreated={() => {
          measure.mutate();
        }}
      />
    </main>
  );
}
