import { CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck } from "lucide-react";

export default function ConfidenceIndicator({ confidence = 0, needsReview = false, size = "md" }) {
  const percentage = Math.round(Number(confidence || 0) * 100);

  let variant = {
    color: "text-mint",
    bg: "bg-mint/10",
    border: "border-mint/30",
    barColor: "bg-mint",
    label: "High Confidence",
    icon: ShieldCheck,
  };

  if (needsReview || percentage < 70) {
    variant = {
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/30",
      barColor: "bg-amber-400",
      label: "Needs Review",
      icon: AlertTriangle,
    };
  } else if (percentage < 85) {
    variant = {
      color: "text-sky",
      bg: "bg-sky/10",
      border: "border-sky/30",
      barColor: "bg-sky",
      label: "Good Match",
      icon: CheckCircle2,
    };
  }

  const IconComponent = variant.icon;

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${variant.bg} ${variant.color} ${variant.border}`}>
        <IconComponent className="h-3 w-3 shrink-0" />
        {percentage}%
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[130px]">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${variant.bg} ${variant.color} ${variant.border}`}>
          <IconComponent className="h-3 w-3 shrink-0" />
          {variant.label}
        </span>
        <span className={`font-mono text-xs font-bold ${variant.color}`}>
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-ink-elevated rounded-full overflow-hidden border border-ink-border/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${variant.barColor}`}
          style={{ width: `${Math.min(100, Math.max(8, percentage))}%` }}
        />
      </div>
    </div>
  );
}

