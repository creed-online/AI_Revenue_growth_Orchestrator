import { useState } from "react";
import { ArrowRight, Check, AlertCircle, Database, FileSpreadsheet, Layers, ShieldAlert, Sparkles } from "lucide-react";

export default function SchemaDiffViewer({
  sourceColumns = [],
  targetFields = [],
  mappings = [],
  entityName = "Customer",
  drift,
}) {
  const [viewMode, setViewMode] = useState("overview"); // overview | side_by_side

  const mappedCount = mappings.filter(m => m.targetField).length;
  const addedCount = drift?.diff?.added?.length || 0;
  const removedCount = drift?.diff?.removed?.length || 0;

  return (
    <div className="panel bg-ink-elevated/40 border border-ink-border rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-mint" />
            Schema Topology & Difference Graph
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Visual structural comparison between uploaded dataset and database target.
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-mint/10 text-mint border border-mint/20">
            <Check className="h-3 w-3" /> {mappedCount} Mapped Fields
          </span>
          {addedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky/10 text-sky border border-sky/20">
              <Sparkles className="h-3 w-3" /> {addedCount} Custom Extensions
            </span>
          )}
          {removedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-signal/10 text-rose-signal border border-rose-signal/20">
              <ShieldAlert className="h-3 w-3" /> {removedCount} Missing Required
            </span>
          )}
        </div>
      </div>

      {/* Side by Side Topology Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Box */}
        <div className="rounded-xl border border-ink-border bg-ink/60 p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-ink-border">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-sky" />
              <span className="text-xs font-bold text-white">Source CSV Payload</span>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">{sourceColumns.length} attributes</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {sourceColumns.map((col, idx) => {
              const colName = col.name || col;
              const mapped = mappings.find(m => m.sourceColumn === colName);

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition ${
                    mapped
                      ? "border-mint/30 bg-mint/5 text-white"
                      : "border-sky/30 bg-sky/5 text-sky"
                  }`}
                >
                  <span className="font-semibold">{colName}</span>
                  <span className="text-[10px] text-ink-muted">type: {col.type || "string"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Schema Box */}
        <div className="rounded-xl border border-ink-border bg-ink/60 p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-ink-border">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-mint" />
              <span className="text-xs font-bold text-white">{entityName} Model Schema</span>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">{targetFields.length} target fields</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {targetFields.map((field, idx) => {
              const isMapped = mappings.some(m => m.targetField === field.name);

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition ${
                    isMapped
                      ? "border-mint/40 bg-mint/5 text-white"
                      : field.required
                      ? "border-rose-signal/40 bg-rose-signal/5 text-rose-signal"
                      : "border-ink-border bg-ink-elevated/40 text-ink-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{field.name}</span>
                    {field.required && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-signal/20 text-rose-signal">
                        REQ
                      </span>
                    )}
                    {field.isCustom && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky/20 text-sky">
                        CUSTOM
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-muted">{field.type}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

