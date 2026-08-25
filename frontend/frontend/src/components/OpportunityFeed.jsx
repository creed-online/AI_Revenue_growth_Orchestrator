import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchOpportunities, runOrchestrator } from '../api/client';
import { Sparkles, ShoppingBag, Users, Zap, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function OpportunityFeed() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [activeRunningId, setActiveRunningId] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);

  const { data: opportunities, isLoading, isError, refetch } = useQuery({
    queryKey: ['opportunities', 1],
    queryFn: () => fetchOpportunities(1),
  });

  const orchestrateMutation = useMutation({
    mutationFn: ({ index }) => runOrchestrator(1, index),
    onMutate: ({ index }) => {
      setActiveRunningId(index);
      setOrchestratorResult(null);
    },
    onSuccess: (data) => {
      setActiveRunningId(null);
      setOrchestratorResult(data);
      queryClient.invalidateQueries(['approvals']);
    },
    onError: (error) => {
      setActiveRunningId(null);
      setOrchestratorResult({ error: true, message: error.message });
    },
  });

  const filteredOpportunities = React.useMemo(() => {
    if (!opportunities || !Array.isArray(opportunities)) return [];
    if (filter === 'ALL') return opportunities;
    return opportunities.filter((op) => op.priority === filter);
  }, [opportunities, filter]);

  return (
    <div className="my-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400/20" />
            Replenishment Opportunity Feed
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Detected purchase interval windows ranked by customer confidence & revenue impact.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {['ALL', 'HIGH', 'MEDIUM'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === type
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {type === 'ALL' ? 'All Opportunities' : `${type} Priority`}
            </button>
          ))}

          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            title="Refresh feed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Execution Banner Feedback */}
      <AnimatePresence>
        {orchestratorResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${
              orchestratorResult.error
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {orchestratorResult.error ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="text-sm font-bold">
                {orchestratorResult.error ? 'Orchestration Error' : 'AI Proposal Created Successfully'}
              </h4>
              <p className="text-xs mt-1 text-slate-300">
                {orchestratorResult.aiText || orchestratorResult.message || 'Draft passed policy check and created an Approval Request.'}
              </p>
            </div>
            <button
              onClick={() => setOrchestratorResult(null)}
              className="text-xs font-semibold hover:underline text-slate-400"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-xl glass-card animate-pulse p-5 border border-slate-800" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-8 rounded-xl glass-card border border-rose-500/30 text-center my-4">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">Failed to connect to Opportunities API</h3>
          <p className="text-xs text-slate-400 mt-1">Make sure the backend Express server is running on port 3000.</p>
        </div>
      )}

      {/* Opportunities List */}
      {!isLoading && !isError && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {filteredOpportunities.map((op, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -3 }}
              className="p-5 rounded-xl glass-card border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {op.productName}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Product #{op.productId} • {op.category || 'General'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      op.priority === 'HIGH'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {op.priority || 'NORMAL'}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Target Audience
                    </span>
                    <span className="text-sm font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      {op.customerCount} buyers
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Est. Opportunity
                    </span>
                    <span className="text-sm font-extrabold text-emerald-400 mt-0.5 block">
                      ₹{Number(op.potentialRevenue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => orchestrateMutation.mutate({ index: idx })}
                disabled={activeRunningId === idx}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-60"
              >
                {activeRunningId === idx ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Reasoning Loop...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Orchestrate Campaign</span>
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

