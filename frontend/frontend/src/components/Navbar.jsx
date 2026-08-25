import React from 'react';
import { Cpu, ShieldCheck, Activity } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight leading-tight m-0">
              AI Revenue Growth <span className="text-gradient-emerald">Orchestrator</span>
            </h1>
            <span className="text-[11px] text-slate-400 font-medium">
              Merchant Autonomous Campaign Engine
            </span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Model: <strong className="text-white font-semibold">Groq Llama 3.3</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Policy Guardrail Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}

