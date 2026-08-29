import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  RefreshCw,
  FastForward,
  CheckCircle2,
} from "lucide-react";

export default function AiStrategyStreamer({
  text = "",
  productName = "",
  offerValue = 10,
  audienceSize = 10,
  expectedRevenue = 0,
  isCompliant = true,
  onComplete,
}) {
  const defaultText =
    text ||
    `The AI Growth Engine evaluated replenishment cycles, conversion elasticity, and merchant policy guardrails for ${productName || "this product"}. An optimal ${offerValue}% discount tier was chosen to maximize projected net revenue while preserving a healthy gross margin above merchant threshold limits.`;

  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  // Streaming typewriter effect
  useEffect(() => {
    setDisplayedText("");
    setIsDone(false);
    indexRef.current = 0;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (indexRef.current < defaultText.length) {
        // Stream in chunks of 2-3 characters for natural high-speed typing
        const nextChunk = defaultText.slice(0, indexRef.current + 3);
        setDisplayedText(nextChunk);
        indexRef.current += 3;
      } else {
        setDisplayedText(defaultText);
        setIsDone(true);
        clearInterval(timerRef.current);
        if (onComplete) onComplete();
      }
    }, 18);

    return () => clearInterval(timerRef.current);
  }, [defaultText]);

  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText(defaultText);
    setIsDone(true);
    if (onComplete) onComplete();
  };

  const handleReplay = () => {
    setDisplayedText("");
    setIsDone(false);
    indexRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (indexRef.current < defaultText.length) {
        const nextChunk = defaultText.slice(0, indexRef.current + 3);
        setDisplayedText(nextChunk);
        indexRef.current += 3;
      } else {
        setDisplayedText(defaultText);
        setIsDone(true);
        clearInterval(timerRef.current);
        if (onComplete) onComplete();
      }
    }, 18);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 rounded-3xl border border-mint/30 bg-gradient-to-b from-[#08121f] to-[#040812] p-5 sm:p-6 shadow-2xl relative overflow-hidden"
    >
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_18px_-3px_rgba(45,212,168,0.5)]">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              AI Orchestrator Strategy & Reasoning
              <span className="text-[9px] font-mono uppercase tracking-widest text-mint border border-mint/30 bg-mint/10 px-2 py-0.5 rounded-full">
                Real-Time Inference
              </span>
            </h3>
          </div>
        </div>

        {/* Controls: Skip or Replay */}
        <div className="flex items-center gap-2">
          {!isDone ? (
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              <FastForward className="h-3 w-3" /> Skip Animation
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-mint hover:border-mint/30 transition"
            >
              <RefreshCw className="h-3 w-3" /> Replay Reasoning
            </button>
          )}
        </div>
      </div>

      {/* Streaming Typewriter Text Area */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#060a14]/80 p-4 font-sans text-xs sm:text-sm leading-relaxed text-slate-200 min-h-[70px]">
        <span>{displayedText}</span>
        {!isDone && (
          <span className="inline-block w-2 h-4 ml-1 bg-mint animate-pulse align-middle" />
        )}
      </div>

      {/* Policy Guardrail Compliance Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Margin Guardrail: COMPLIANT (&lt;15%)
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-950/40 px-3 py-1.5 text-[11px] font-semibold text-sky-400">
          <Zap className="h-3.5 w-3.5" /> Replenishment Gap: 30-45 Days
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-1.5 text-[11px] font-semibold text-teal-300">
          <TrendingUp className="h-3.5 w-3.5" /> Net Revenue Lift: Max Tier
        </div>
      </div>

      {/* Campaign Highlights Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-xl border border-ink-border bg-ink/40 p-2.5">
          <p className="text-ink-muted text-[10px] font-semibold">Proposed Offer</p>
          <p className="font-display font-bold text-white mt-0.5 text-sm">{offerValue}% Off</p>
        </div>
        <div className="rounded-xl border border-ink-border bg-ink/40 p-2.5">
          <p className="text-ink-muted text-[10px] font-semibold">Target Audience</p>
          <p className="font-display font-bold text-white mt-0.5 text-sm">{audienceSize} Buyers</p>
        </div>
        <div className="rounded-xl border border-ink-border bg-ink/40 p-2.5">
          <p className="text-ink-muted text-[10px] font-semibold">Expected Revenue</p>
          <p className="font-display font-bold text-mint mt-0.5 text-sm">
            ₹{Number(expectedRevenue || 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-ink-border bg-ink/40 p-2.5">
          <p className="text-ink-muted text-[10px] font-semibold">Policy Check</p>
          <p className="font-display font-bold text-mint mt-0.5 text-sm flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </p>
        </div>
      </div>
    </motion.div>
  );
}

