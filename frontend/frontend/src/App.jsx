import React from 'react';
import Navbar from './components/Navbar';
import Hero3D from './components/Hero3D';
import KPICards from './components/KPICards';
import OpportunityFeed from './components/OpportunityFeed';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* Interactive 3D Canvas Centerpiece */}
        <Hero3D />

        {/* Animated KPI Analytics */}
        <KPICards />

        {/* Live Opportunity Feed */}
        <OpportunityFeed />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400">
        AI Revenue & Growth Orchestrator • Day 12 Build Completed
      </footer>
    </div>
  );
}
