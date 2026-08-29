import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Database,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ArrowRight,
  BrainCircuit,
  Wand2,
  RefreshCw,
  Layers,
  Eye,
  Table,
} from "lucide-react";
import { api } from "../api/client";
import DriftWarningBanner from "../components/DriftWarningBanner";
import MappingTable from "../components/MappingTable";
import SchemaDiffViewer from "../components/SchemaDiffViewer";
import ThreeVectorMatcher from "../components/ThreeVectorMatcher";
import { fireCelebrationConfetti } from "../utils/confetti";

export default function ImportDataPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState("upload"); // upload -> analyze -> review -> processing -> success
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState("mappings"); // mappings | vector3d | topology

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setStep("analyze");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/import/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAnalysis(res.data);
      setStep("review");
    } catch (err) {
      alert("AI Analysis failed: " + (err.response?.data?.message || err.message));
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (sourceCol, newTargetField) => {
    if (!analysis) return;
    const updatedMappings = analysis.mappings.map((m) =>
      m.sourceColumn === sourceCol ? { ...m, targetField: newTargetField } : m
    );
    setAnalysis({ ...analysis, mappings: updatedMappings });
  };

  const handleExtensionRegistered = (newFields) => {
    if (!analysis) return;
    // Append the newly registered custom fields to targetFields in local state
    const existingTargetFields = analysis.schema?.targetFields || [];
    const formatted = newFields.map((f) => ({
      name: f.name,
      type: f.type || "String",
      isCustom: true,
      required: false,
    }));
    setAnalysis({
      ...analysis,
      schema: {
        ...analysis.schema,
        targetFields: [...existingTargetFields, ...formatted],
      },
    });
  };

  const [importResult, setImportResult] = useState(null);

  const handleConfirmAndProcess = async () => {
    setStep("processing");
    try {
      const res = await api.post("/import/process", { analysis });
      setImportResult(res.data);

      // Invalidate all related React Query caches for instantaneous UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["opportunities"] }),
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["merchant"] }),
      ]);

      setStep("success");
      fireCelebrationConfetti();
    } catch (err) {
      alert("Processing failed: " + err.message);
      setStep("review");
    }
  };

  const renderUpload = () => (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6 text-center"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_32px_-6px_rgba(45,212,168,0.55)]">
        <Sparkles className="h-8 w-8" />
      </div>
      <h1 className="font-display text-3xl font-bold mb-3 text-white">
        AI Auto-Schema Importer
      </h1>
      <p className="text-ink-muted mb-8 text-base leading-relaxed">
        Drop any CSV dataset. Our semantic engine profiles sample values, generates 128-dim
        vector embeddings, and matches target entities automatically with continuous few-shot learning.
      </p>

      <div className="p-8 border-2 border-dashed border-ink-border rounded-3xl bg-ink-elevated/30 hover:border-mint/50 hover:bg-mint/5 transition-all">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-ink-muted file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-mint file:text-ink hover:file:bg-mint-deep cursor-pointer mb-4"
        />
        <p className="text-xs text-ink-soft">
          Supports Customer, Product, or Order transaction files in any header dialect.
        </p>
      </div>

      <button
        onClick={handleUploadAndAnalyze}
        disabled={!file}
        className="mt-8 w-full bg-gradient-to-r from-mint to-mint-deep text-ink font-bold py-4 rounded-xl disabled:opacity-50 text-base flex items-center justify-center gap-2 hover:shadow-[0_0_24px_-6px_rgba(45,212,168,0.4)] transition"
      >
        Analyze & Auto-Map with AI <Wand2 className="h-5 w-5" />
      </button>
    </motion.div>
  );

  const renderAnalyzing = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto p-12 text-center flex flex-col items-center"
    >
      <div className="relative mb-8">
        <BrainCircuit className="h-16 w-16 text-mint animate-pulse" />
        <div className="absolute inset-0 bg-mint blur-2xl opacity-20 animate-pulse rounded-full" />
      </div>
      <h2 className="text-2xl font-bold font-display mb-2 text-white">
        Reasoning over schema semantics...
      </h2>
      <p className="text-ink-muted text-sm leading-relaxed">
        Calculating 128-dim dense feature vectors, introspecting merchant database registry, and querying few-shot mapping memory.
      </p>
    </motion.div>
  );

  const renderReview = () => {
    if (!analysis) return null;
    const { aiAnalysis, mappings, drift, schema, sampleData, fileName, totalRows } = analysis;
    const targetEntity = aiAnalysis.detectedEntity;

    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto p-6"
      >
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                AI Schema Alignment Matrix
              </h1>
              <span className="text-xs bg-mint/20 text-mint px-3 py-1 rounded-full border border-mint/30 uppercase tracking-widest font-bold">
                {targetEntity} Detected ({(aiAnalysis.entityConfidence * 100).toFixed(0)}%)
              </span>
            </div>
            <p className="text-ink-muted text-xs sm:text-sm mt-1.5 max-w-3xl leading-relaxed">
              {aiAnalysis.entityReasoning}
            </p>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("mappings")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                activeTab === "mappings"
                  ? "bg-mint/15 text-mint border-mint/40"
                  : "bg-ink-elevated/60 text-ink-muted border-ink-border hover:bg-white/5"
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              Interactive Mapping
            </button>
            <button
              onClick={() => setActiveTab("vector3d")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                activeTab === "vector3d"
                  ? "bg-sky/15 text-sky border-sky/40"
                  : "bg-ink-elevated/60 text-ink-muted border-ink-border hover:bg-white/5"
              }`}
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              3D Vector Field
            </button>
            <button
              onClick={() => setActiveTab("topology")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                activeTab === "topology"
                  ? "bg-mint/15 text-mint border-mint/40"
                  : "bg-ink-elevated/60 text-ink-muted border-ink-border hover:bg-white/5"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Topology Diff
            </button>
          </div>
        </div>

        {/* Task 2.6 Drift Warning Banner */}
        <DriftWarningBanner
          drift={drift}
          entityName={targetEntity}
          onExtensionRegistered={handleExtensionRegistered}
        />

        {/* Tab 1: 3D Vector Matcher Canvas (Also shown if vector3d selected) */}
        {activeTab === "vector3d" && (
          <ThreeVectorMatcher mappings={mappings} targetEntity={targetEntity} />
        )}

        {/* Tab 2: Interactive Mapping Table */}
        {activeTab === "mappings" && (
          <>
            <ThreeVectorMatcher mappings={mappings} targetEntity={targetEntity} />
            <MappingTable
              sourceColumns={schema.sourceColumns}
              targetFields={schema.targetFields}
              mappings={mappings}
              entityName={targetEntity}
              sampleRows={sampleData}
              onMappingChange={handleMappingChange}
            />
          </>
        )}

        {/* Tab 3: Topology Diff Viewer */}
        {activeTab === "topology" && (
          <SchemaDiffViewer
            sourceColumns={schema.sourceColumns}
            targetFields={schema.targetFields}
            mappings={mappings}
            entityName={targetEntity}
            drift={drift}
          />
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
          <button
            onClick={handleConfirmAndProcess}
            className="w-full sm:w-auto flex-1 bg-gradient-to-r from-mint to-mint-deep text-ink font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_24px_-6px_rgba(45,212,168,0.4)] transition text-base"
          >
            Confirm & Ingest Data ({totalRows || sampleData.length} rows) <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setStep("upload")}
            className="w-full sm:w-auto px-6 py-4 rounded-xl border border-ink-border text-ink-muted hover:text-white hover:bg-white/5 font-semibold text-sm transition"
          >
            Upload Different File
          </button>
        </div>
      </motion.div>
    );
  };

  const renderProcessing = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto p-12 text-center flex flex-col items-center"
    >
      <Loader2 className="h-16 w-16 text-mint animate-spin mb-6" />
      <h2 className="text-2xl font-bold font-display mb-2 text-white">
        Ingesting & Transforming Records...
      </h2>
      <p className="text-ink-muted text-sm leading-relaxed">
        Writing structured entities to PostgreSQL, training few-shot schema classifier, and regenerating high-value replenishment opportunities.
      </p>
    </motion.div>
  );

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto p-8 panel rounded-3xl text-center border border-mint/30 bg-ink-elevated/40"
    >
      <div className="w-16 h-16 bg-mint/20 text-mint rounded-2xl flex items-center justify-center mx-auto mb-6 border border-mint/40 shadow-[0_0_24px_-6px_rgba(45,212,168,0.5)]">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold font-display text-white mb-2">
        Dataset Successfully Ingested!
      </h2>
      <p className="text-ink-muted text-sm mb-6 leading-relaxed">
        {importResult?.message || "All records have been parsed, transformed, and indexed in your merchant database."}
      </p>

      {importResult?.stats && (
        <div className="grid grid-cols-3 gap-3 mb-8 text-left">
          <div className="bg-ink/50 border border-ink-border p-3 rounded-xl">
            <span className="text-[10px] text-ink-muted block uppercase font-semibold">Customers</span>
            <span className="text-lg font-bold text-white font-display">{importResult.stats.customers}</span>
          </div>
          <div className="bg-ink/50 border border-ink-border p-3 rounded-xl">
            <span className="text-[10px] text-ink-muted block uppercase font-semibold">Orders</span>
            <span className="text-lg font-bold text-white font-display">{importResult.stats.orders}</span>
          </div>
          <div className="bg-ink/50 border border-ink-border p-3 rounded-xl">
            <span className="text-[10px] text-ink-muted block uppercase font-semibold">Opportunities</span>
            <span className="text-lg font-bold text-mint font-display">{importResult.stats.opportunities}</span>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex-1 bg-gradient-to-r from-mint to-mint-deep text-ink font-bold py-3.5 rounded-xl hover:shadow-[0_0_24px_-6px_rgba(45,212,168,0.4)] transition text-sm"
        >
          View Dashboard
        </button>
        <button
          onClick={() => {
            setFile(null);
            setAnalysis(null);
            setStep("upload");
          }}
          className="px-6 py-3.5 border border-ink-border rounded-xl text-ink-soft hover:text-white hover:bg-white/5 font-semibold text-sm transition"
        >
          Import Another CSV
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen py-10 px-4">
      {step === "upload" && renderUpload()}
      {step === "analyze" && renderAnalyzing()}
      {step === "review" && renderReview()}
      {step === "processing" && renderProcessing()}
      {step === "success" && renderSuccess()}
    </div>
  );
}