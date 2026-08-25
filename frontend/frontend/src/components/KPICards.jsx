import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Target, ShieldCheck } from 'lucide-react';

const metrics = [
  {
    title: 'Total Generated Revenue',
    value: '₹1,48,250',
    change: '+18.4%',
    subtext: 'vs last 30 days',
    icon: DollarSign,
    color: 'emerald',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    title: 'Pipeline Opportunity Value',
    value: '₹3,92,400',
    change: '34 Active',
    subtext: 'replenishment windows',
    icon: Target,
    color: 'cyan',
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    border: 'border-cyan-500/30',
    badge: 'bg-cyan-500/10 text-cyan-400',
  },
  {
    title: 'Avg Campaign ROI',
    value: '4.82x',
    change: '+0.6x',
    subtext: 'net revenue multiplier',
    icon: TrendingUp,
    color: 'purple',
    gradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-400',
  },
  {
    title: 'Policy Protection Guardrail',
    value: '100% Pass',
    change: 'Active',
    subtext: 'max discount <= 10%',
    icon: ShieldCheck,
    color: 'amber',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function KPICards() {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={index}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative p-5 rounded-xl glass-card border ${metric.border} overflow-hidden group`}
          >
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none`} />

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {metric.title}
                </span>
                <div className={`p-2 rounded-lg ${metric.badge}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-1">
                <div className="text-2xl font-black text-white tracking-tight">
                  {metric.value}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${metric.badge}`}>
                    {metric.change}
                  </span>
                  <span className="text-xs text-slate-400">
                    {metric.subtext}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

