import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Percent,
  Coins,
} from "lucide-react";

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function InteractiveProfitSlider({
  audienceSize = 10,
  avgItemPrice = 2500,
  recommendedDiscount = 10,
  maxPolicyDiscount = 15,
  onDiscountSelect,
}) {
  const [discount, setDiscount] = useState(recommendedDiscount);

  // Dynamic unit economics calculation
  const calculations = useMemo(() => {
    const d = Number(discount) || 0;
    // Elasticity model: base 8% conversion with diminishing returns as discount increases
    const baseConv = 0.08;
    const elasticityMultiplier = 1 + (d * 0.12) - Math.pow(d / 100, 2) * 1.5;
    const estConversionRate = Math.min(0.75, Math.max(0.04, baseConv * elasticityMultiplier));

    const estBuyers = Math.max(1, Math.round(audienceSize * estConversionRate));
    const grossTotal = estBuyers * avgItemPrice;
    const discountBurn = Math.round(grossTotal * (d / 100));
    const emailDeliveryCost = Math.round(audienceSize * 0.5);
    const totalCost = discountBurn + emailDeliveryCost;
    const netProfit = Math.max(0, grossTotal - totalCost);
    const roi = totalCost > 0 ? (netProfit / totalCost).toFixed(1) : "0.0";

    const isPolicyViolation = d > maxPolicyDiscount;
    const isRecommended = d === recommendedDiscount;

    return {
      discount: d,
      estConversionRate: (estConversionRate * 100).toFixed(1),
      estBuyers,
      grossTotal,
      discountBurn,
      emailDeliveryCost,
      totalCost,
      netProfit,
      roi,
      isPolicyViolation,
      isRecommended,
    };
  }, [discount, audienceSize, avgItemPrice, recommendedDiscount, maxPolicyDiscount]);

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setDiscount(val);
    if (onDiscountSelect) {
      onDiscountSelect(val);
    }
  };

  return (
    <div className="mt-6 rounded-3xl border border-ink-border bg-gradient-to-b from-[#080d1a] to-[#040711] p-5 sm:p-7 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_20px_-4px_rgba(45,212,168,0.5)]">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              Interactive Margin & Net Profit Simulator
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-mint border border-mint/30 bg-mint/10 px-2 py-0.5 rounded-full">
                Real-Time Elasticity
              </span>
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Drag the discount slider to test custom promotional tiers against margin safety limits.
            </p>
          </div>
        </div>

        {/* Selected Tier Badge */}
        <div className="flex items-center gap-2">
          {calculations.isRecommended && (
            <span className="inline-flex items-center gap-1 rounded-full border border-mint/40 bg-mint/15 px-3 py-1 text-xs font-bold text-mint shadow">
              <Sparkles className="h-3.5 w-3.5" /> AI Recommended Tier
            </span>
          )}
          {calculations.isPolicyViolation && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-signal/40 bg-rose-signal/15 px-3 py-1 text-xs font-bold text-rose-signal">
              <ShieldAlert className="h-3.5 w-3.5" /> Exceeds {maxPolicyDiscount}% Policy Limit
            </span>
          )}
        </div>
      </div>

      {/* Main Draggable Slider Control */}
      <div className="rounded-2xl border border-slate-800 bg-[#070b14]/90 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Percent className="h-4 w-4 text-sky" /> Promotional Discount
          </span>
          <span className="font-mono text-2xl font-black text-white flex items-baseline gap-1">
            <span className={calculations.isPolicyViolation ? "text-rose-400" : "text-mint"}>
              {discount}%
            </span>
            <span className="text-xs font-normal text-slate-400">OFF</span>
          </span>
        </div>

        {/* Range Slider Track */}
        <div className="relative py-2">
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={discount}
            onChange={handleSliderChange}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-mint hover:accent-mint-deep transition-all"
          />

          {/* Quick Snap Markers */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 px-1">
            <span>0% (Full Price)</span>
            <span className="text-sky font-bold">5% (Standard)</span>
            <span className="text-mint font-bold">10% (AI Optimal)</span>
            <span className="text-amber-400 font-bold">15% (Max Guardrail)</span>
            <span className="text-rose-400 font-bold">25% (High Burn)</span>
            <span className="text-rose-500">30%</span>
          </div>
        </div>

        {/* Real-Time Unit Economics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          {/* KPI 1: Net Profit */}
          <div className="rounded-xl border border-slate-800 bg-ink/50 p-3">
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-mint" /> Projected Net Profit
            </p>
            <p className="font-display text-xl font-bold text-mint mt-1">
              {money(calculations.netProfit)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">After discounts & delivery</p>
          </div>

          {/* KPI 2: Gross Revenue */}
          <div className="rounded-xl border border-slate-800 bg-ink/50 p-3">
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-sky" /> Gross Order Value
            </p>
            <p className="font-display text-xl font-bold text-white mt-1">
              {money(calculations.grossTotal)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{calculations.estBuyers} Estimated Buyers</p>
          </div>

          {/* KPI 3: Discount Cost */}
          <div className="rounded-xl border border-slate-800 bg-ink/50 p-3">
            <p className="text-[11px] text-slate-400">Discount Burn</p>
            <p className="font-display text-xl font-bold text-rose-400 mt-1">
              {money(calculations.discountBurn)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Margin trade-off</p>
          </div>

          {/* KPI 4: Expected ROI */}
          <div className="rounded-xl border border-slate-800 bg-ink/50 p-3">
            <p className="text-[11px] text-slate-400">Projected ROI</p>
            <p className="font-display text-xl font-bold text-teal-300 mt-1">
              {calculations.roi}x
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{calculations.estConversionRate}% Conversion</p>
          </div>
        </div>
      </div>
    </div>
  );
}

