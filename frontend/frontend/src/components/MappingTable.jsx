import { useState, useMemo } from "react";
import {
  Database,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  HelpCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import ConfidenceIndicator from "./ConfidenceIndicator";
import SemanticMatchReason from "./SemanticMatchReason";
import { api } from "../api/client";

export default function MappingTable({
  sourceColumns = [],
  targetFields = [],
  mappings = [],
  entityName = "Customer",
  sampleRows = [],
  onMappingChange,
}) {
  const [localMappings, setLocalMappings] = useState(
    mappings.reduce((acc, m) => ({ ...acc, [m.sourceColumn]: m.targetField }), {})
  );
  const [feedbackSaved, setFeedbackSaved] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectField = async (sourceCol, newTargetField) => {
    const updated = { ...localMappings, [sourceCol]: newTargetField };
    setLocalMappings(updated);

    if (onMappingChange) {
      onMappingChange(sourceCol, newTargetField);
    }

    if (newTargetField) {
      try {
        await api.post("/schema/feedback", {
          sourceColumn: sourceCol,
          targetEntity: entityName,
          targetField: newTargetField,
          confidenceScore: 1.0,
        });
        setFeedbackSaved((prev) => ({ ...prev, [sourceCol]: true }));
        setTimeout(() => {
          setFeedbackSaved((prev) => ({ ...prev, [sourceCol]: false }));
        }, 3000);
      } catch (err) {
        console.warn("Feedback loop record failed:", err.message);
      }
    }
  };

  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return sourceColumns;
    const q = searchQuery.toLowerCase();
    return sourceColumns.filter((col) => {
      const name = (col.name || col).toLowerCase();
      const currentTarget = (localMappings[col.name || col] || "").toLowerCase();
      return name.includes(q) || currentTarget.includes(q);
    });
  }, [sourceColumns, searchQuery, localMappings]);

  return (
    <div className="panel bg-ink-elevated/50 border border-ink-border rounded-2xl overflow-hidden shadow-xl mb-8">
      {/* Table Header & Search Filter */}
      <div className="p-4 bg-ink-elevated border-b border-ink-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-mint" />
          <span className="font-bold text-white text-sm">Interactive Schema Alignment Matrix</span>
          <span className="text-xs text-ink-muted">({filteredColumns.length} of {sourceColumns.length} columns)</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search column or target..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-ink-border bg-ink/60 text-xs text-white placeholder-ink-muted outline-none focus:border-mint/50 transition"
            />
          </div>
        </div>
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-border bg-ink/30 text-ink-muted text-xs">
              <th className="p-4 font-semibold">Source File Column</th>
              <th className="p-4 font-semibold">Sample Value</th>
              <th className="p-4 font-semibold">Target Database Field</th>
              <th className="p-4 font-semibold">AI Confidence Score</th>
              <th className="p-4 font-semibold">Semantic Match Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-border/40">
            {filteredColumns.map((col, index) => {
              const colName = col.name || col;
              const currentTarget = localMappings[colName] || "";
              const matchInfo = mappings.find((m) => m.sourceColumn === colName);
              const sampleVal =
                (col.sample && col.sample[0]) ||
                (sampleRows[0] && sampleRows[0][colName]) ||
                "—";
              const isLearned = feedbackSaved[colName];

              return (
                <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                  {/* Source Column Header */}
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-ink px-2 py-1 rounded border border-ink-border">
                          {colName}
                        </span>
                      </div>
                      <span className="text-[10px] text-ink-muted font-mono">
                        type: {col.type || "string"}
                      </span>
                    </div>
                  </td>

                  {/* Sample Values */}
                  <td className="p-4 font-mono text-xs text-ink-soft max-w-[150px] truncate">
                    <span className="bg-ink-elevated px-2 py-1 rounded text-[11px] text-ink-soft border border-ink-border/50 block truncate">
                      {String(sampleVal)}
                    </span>
                  </td>

                  {/* Target Field Dropdown */}
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentTarget}
                          onChange={(e) => handleSelectField(colName, e.target.value)}
                          className={`w-full min-w-[200px] rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition ${
                            currentTarget
                              ? "border-mint/40 bg-mint/5 text-white focus:border-mint"
                              : "border-ink-border bg-ink-elevated text-ink-muted focus:border-white/30"
                          }`}
                        >
                          <option value="">— Skip / Ignore Column —</option>
                          <optgroup label={`${entityName} Core Fields`}>
                            {targetFields.map((f) => (
                              <option key={f.name} value={f.name}>
                                {entityName}.{f.name} {f.required ? "(Required)" : ""}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {isLearned && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-mint font-medium animate-fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Learned for future uploads!
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Confidence Badge */}
                  <td className="p-4">
                    {matchInfo ? (
                      <ConfidenceIndicator
                        confidence={matchInfo.confidence}
                        needsReview={matchInfo.needsReview}
                      />
                    ) : (
                      <span className="text-xs text-ink-muted italic">Unmapped</span>
                    )}
                  </td>

                  {/* Semantic Reasoning */}
                  <td className="p-4 max-w-[260px]">
                    <SemanticMatchReason
                      mapping={matchInfo}
                      sourceColumn={colName}
                      targetEntity={entityName}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (< 768px) */}
      <div className="block md:hidden divide-y divide-ink-border/50 p-3 space-y-3">
        {filteredColumns.map((col, index) => {
          const colName = col.name || col;
          const currentTarget = localMappings[colName] || "";
          const matchInfo = mappings.find((m) => m.sourceColumn === colName);
          const sampleVal =
            (col.sample && col.sample[0]) ||
            (sampleRows[0] && sampleRows[0][colName]) ||
            "—";
          const isLearned = feedbackSaved[colName];

          return (
            <div key={index} className="rounded-2xl border border-ink-border bg-ink/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white bg-ink px-2.5 py-1 rounded-lg border border-ink-border">
                  {colName}
                </span>
                {matchInfo && (
                  <ConfidenceIndicator
                    confidence={matchInfo.confidence}
                    needsReview={matchInfo.needsReview}
                  />
                )}
              </div>

              <div className="text-xs">
                <span className="text-ink-muted text-[10px] uppercase font-semibold block mb-1">
                  Sample Data:
                </span>
                <span className="bg-ink-elevated px-2.5 py-1.5 rounded-lg text-xs font-mono text-ink-soft border border-ink-border/50 block truncate">
                  {String(sampleVal)}
                </span>
              </div>

              <div>
                <span className="text-ink-muted text-[10px] uppercase font-semibold block mb-1">
                  Target Field Mapping:
                </span>
                <select
                  value={currentTarget}
                  onChange={(e) => handleSelectField(colName, e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition ${
                    currentTarget
                      ? "border-mint/40 bg-mint/5 text-white"
                      : "border-ink-border bg-ink-elevated text-ink-muted"
                  }`}
                >
                  <option value="">— Skip / Ignore Column —</option>
                  <optgroup label={`${entityName} Core Fields`}>
                    {targetFields.map((f) => (
                      <option key={f.name} value={f.name}>
                        {entityName}.{f.name} {f.required ? "(Required)" : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {isLearned && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-mint font-medium mt-1">
                    <CheckCircle2 className="h-3 w-3" /> Learned for future uploads!
                  </span>
                )}
              </div>

              {matchInfo && (
                <div className="pt-2 border-t border-ink-border/40">
                  <SemanticMatchReason
                    mapping={matchInfo}
                    sourceColumn={colName}
                    targetEntity={entityName}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
