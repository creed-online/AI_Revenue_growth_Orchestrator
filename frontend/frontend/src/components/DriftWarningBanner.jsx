import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Code2, PlusCircle, Sparkles, Database } from "lucide-react";
import { api } from "../api/client";

export default function DriftWarningBanner({ drift, entityName, onExtensionRegistered }) {
  const [showSql, setShowSql] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  if (!drift?.diff) return null;

  const { added = [], removed = [], modified = [], compatible } = drift.diff;
  const migration = drift.suggestedMigration;

  if (added.length === 0 && removed.length === 0 && modified.length === 0) {
    return null;
  }

  const handleRegisterExtensions = async () => {
    if (added.length === 0) return;
    setIsRegistering(true);
    try {
      await api.post("/schema/extend", {
        entityName,
        fields: added.map(f => ({
          name: f.name,
          type: f.type || "String",
          description: `Custom field ${f.name} imported via file upload.`
        }))
      });
      setRegistered(true);
      if (onExtensionRegistered) {
        onExtensionRegistered(added);
      }
    } catch (err) {
      console.error("Failed to register schema extensions:", err);
      alert("Failed to register custom extensions: " + err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-sky/30 bg-gradient-to-r from-sky/10 via-ink-elevated/40 to-sky/5 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky/20 text-sky border border-sky/40">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">Schema Drift & Custom Fields Detected</h3>
              {!compatible && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-signal/20 text-rose-signal border border-rose-signal/30">
                  Missing Required Data
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed max-w-2xl">
              We analyzed your file against the database schema for <strong className="text-white">{entityName}</strong>.
              {added.length > 0 && ` Found ${added.length} unmapped column(s) that can be saved as custom merchant fields.`}
              {removed.length > 0 && ` Warning: ${removed.length} required field(s) were not provided in your dataset.`}
            </p>

            {/* Added Fields Badges */}
            {added.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-ink-muted">New Custom Columns:</span>
                {added.map(f => (
                  <span key={f.name} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono bg-sky/15 text-sky border border-sky/30">
                    <PlusCircle className="h-3 w-3" />
                    {f.name} <span className="text-[10px] text-sky/60">({f.type})</span>
                  </span>
                ))}
              </div>
            )}

            {/* Removed Missing Required Fields Badges */}
            {removed.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-rose-signal">Missing Required:</span>
                {removed.map(f => (
                  <span key={f.name} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono bg-rose-signal/15 text-rose-signal border border-rose-signal/30">
                    <AlertTriangle className="h-3 w-3" />
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {added.length > 0 && (
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            {registered ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-mint/20 text-mint border border-mint/40 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4" />
                Custom Fields Registered!
              </div>
            ) : (
              <button
                onClick={handleRegisterExtensions}
                disabled={isRegistering}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky to-sky/80 text-ink font-bold text-xs hover:brightness-110 transition shadow-md disabled:opacity-50"
              >
                <Database className="h-4 w-4" />
                {isRegistering ? "Registering..." : `Accept & Extend Schema (${added.length})`}
              </button>
            )}

            {migration?.sql && (
              <button
                onClick={() => setShowSql(!showSql)}
                className="inline-flex items-center gap-1.5 text-xs text-sky hover:underline font-mono"
              >
                <Code2 className="h-3 w-3" />
                {showSql ? "Hide SQL Migration" : "View SQL Migration"}
                {showSql ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible SQL preview */}
      {showSql && migration?.sql && (
        <div className="mt-4 border-t border-sky/20 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-ink-muted">Auto-Generated Drift Migration:</span>
            {migration.warnings?.length > 0 && (
              <span className="text-[10px] text-amber-400 font-mono">
                {migration.warnings.join(" | ")}
              </span>
            )}
          </div>
          <pre className="p-3 rounded-xl bg-ink/90 border border-ink-border text-sky text-xs font-mono overflow-x-auto leading-relaxed">
            {migration.sql}
          </pre>
        </div>
      )}
    </div>
  );
}

