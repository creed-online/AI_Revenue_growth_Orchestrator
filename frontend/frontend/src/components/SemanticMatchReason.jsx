import { useState } from "react";
import { Brain, Cpu, Database, ChevronDown, ChevronUp, Check } from "lucide-react";

export default function SemanticMatchReason({ mapping, sourceColumn, targetEntity }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!mapping) return <span className="text-ink-muted text-xs italic">—</span>;

  const { strategyUsed = "vector_embedding", confidence, reasoning, transform } = mapping;

  const getStrategyBadge = (strat) => {
    switch (strat) {
      case "exact":
        return { label: "Exact String Match", color: "bg-mint/20 text-mint border-mint/30", icon: Check };
      case "fuzzy_dice":
        return { label: "Fuzzy String Match", color: "bg-sky/20 text-sky border-sky/30", icon: Cpu };
      case "vector_embedding":
      default:
        return { label: "Dense Vector Embedding (128-dim)", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: Brain };
    }
  };

  const badge = getStrategyBadge(strategyUsed);
  const IconComp = badge.icon;

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${badge.color}`}>
          <IconComp className="h-2.5 w-2.5 shrink-0" />
          {badge.label}
        </span>
        {transform && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-ink border border-ink-border text-ink-soft">
            fn: {transform}
          </span>
        )}
      </div>

      <p className="text-ink-soft text-[11px] leading-relaxed line-clamp-2 mt-0.5">
        {reasoning || `Matched '${sourceColumn}' to '${targetEntity}.${mapping.targetField}' using semantic vector similarity.`}
      </p>
    </div>
  );
}

