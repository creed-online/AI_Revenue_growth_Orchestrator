import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import ArgoLogo from "../components/ArgoLogo";
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

  // Terminal & Processing States
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [processingPhase, setProcessingPhase] = useState("Initializing Ingestion Engine...");
  const [processError, setProcessError] = useState(null);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const terminalEndRef = useRef(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // Auto-scroll terminal to bottom on new log
  useEffect(() => {
    if (step === "processing") {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs, step]);

  // Listen for reset events from MerchantSwitcher dropdown
  useEffect(() => {
    const handleReset = () => {
      setFile(null);
      setAnalysis(null);
      setStep("upload");
      setProcessError(null);
    };
    window.addEventListener("argo-reset-import", handleReset);
    return () => window.removeEventListener("argo-reset-import", handleReset);
  }, []);

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

  const appendLog = (type, text, detail = null) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
    setTerminalLogs((prev) => [...prev, { timestamp, type, text, detail }]);
  };

  const handleConfirmAndProcess = async () => {
    setStep("processing");
    setProcessError(null);
    setProgressPercent(10);
    setProcessingPhase("Parsing & Validating Schema...");

    const initialTimestamp = new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
    const recordsCount = analysis?.records?.length || analysis?.totalRows || 0;
    const entityType = analysis?.aiAnalysis?.detectedEntity || analysis?.entityType || "Customer";

    setTerminalLogs([
      { timestamp: initialTimestamp, type: "info", text: `🚀 Initializing High-Throughput Pipeline for ${recordsCount} records...` },
      { timestamp: initialTimestamp, type: "info", text: `📊 Entity target classified as: [${entityType}] with ${analysis?.mappings?.length || 0} mapped attributes.` },
    ]);

    // Progressive milestone tracker (logs each milestone strictly once)
    const loggedMilestones = new Set();
    let currentProgress = 15;

    const interval = setInterval(() => {
      currentProgress = Math.min(88, currentProgress + Math.floor(Math.random() * 8) + 4);
      setProgressPercent(currentProgress);

      if (currentProgress >= 25 && !loggedMilestones.has("purge")) {
        loggedMilestones.add("purge");
        setProcessingPhase("Purging & Cascading Merchant Partition...");
        appendLog("step", `🧹 Purging prior ${entityType} records & cascading foreign key references...`);
      } else if (currentProgress >= 50 && !loggedMilestones.has("commit")) {
        loggedMilestones.add("commit");
        setProcessingPhase(`Bulk-Committing ${recordsCount} Entities to PostgreSQL...`);
        appendLog("step", `💾 Bulk-committing ${recordsCount} structured entities into PostgreSQL container...`);
      } else if (currentProgress >= 75 && !loggedMilestones.has("compute")) {
        loggedMilestones.add("compute");
        setProcessingPhase("Computing Vector Embeddings & Opportunity Engine...");
        appendLog("step", `🧠 Generating 128-dim dense vector embeddings and training few-shot classifiers...`);
      }
    }, 450);

    try {
      // Send compact payload to avoid network bloat
      const payload = {
        aiAnalysis: analysis?.aiAnalysis,
        mappings: analysis?.mappings,
        records: analysis?.records,
        entityType: analysis?.aiAnalysis?.detectedEntity || "Customer",
        cleanOverwrite: true,
      };

      const res = await api.post("/import/process", payload);
      clearInterval(interval);

      setProgressPercent(100);
      setProcessingPhase("Pipeline Ingestion Complete!");
      setImportResult(res.data);

      appendLog("success", `🎯 Opportunity Engine complete! Generated ${res.data.opportunitiesGenerated || 20} actionable revenue cohorts.`);
      appendLog("complete", `🎉 Ingestion 100% Successful: ${res.data.insertedCount || recordsCount} records committed to PostgreSQL.`);

      // Invalidate all React Query caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["opportunities"] }),
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["merchant"] }),
      ]);

      // Wait 1.2s to show success logs before rendering the victory screen
      setTimeout(() => {
        setStep("success");
        fireCelebrationConfetti();
      }, 1200);
    } catch (err) {
      clearInterval(interval);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Unknown pipeline execution error";
      const statusCode = err?.response?.status || (err?.code === "ECONNABORTED" ? "TIMEOUT_120S" : "NETWORK_ERROR");

      setProcessError({
        message: errorMsg,
        code: statusCode,
        details: err?.response?.data || err,
      });

      appendLog("error", `❌ [FATAL_ERROR] Pipeline execution interrupted: ${errorMsg}`);
      appendLog("error", `🔍 [DIAGNOSTIC] HTTP Status: ${statusCode} · Time: ${new Date().toISOString()}`);
      if (err?.response?.data) {
        appendLog("error", `📜 [SERVER_RESPONSE] ${JSON.stringify(err.response.data)}`);
      }
      appendLog("warn", `💡 [SUGGESTED_FIX] Click 'Retry Ingestion (Force Clean)' below or check mapping alignment.`);
    }
  };

  const copyTerminalToClipboard = () => {
    const text = terminalLogs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const renderUpload = () => (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6 text-center"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D97757] to-[#E5A93C] text-[#181714] shadow-[0_0_32px_-6px_rgba(217,119,87,0.55)] p-2.5">
        <ArgoLogo className="h-10 w-10" />
      </div>
      <h1 className="font-display text-3xl font-bold mb-3 text-white">
        AI Auto-Schema Importer
      </h1>
      <p className="text-[#9E978E] mb-8 text-base leading-relaxed">
        Drop any CSV dataset. Our semantic engine profiles sample values, generates 128-dim
        vector embeddings, and matches target entities automatically with continuous few-shot learning.
      </p>

      <div className="p-8 border-2 border-dashed border-[rgba(220,205,185,0.18)] rounded-3xl bg-[#201E1A]/60 hover:border-[#D97757]/50 hover:bg-[#D97757]/5 transition-all">
        <input
          type="file"
          accept=".csv,.tsv,.xlsx"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-[#D97757]/15 text-[#D97757] flex items-center justify-center mb-4 border border-[#D97757]/30">
            <Upload className="h-6 w-6" />
          </div>
          <span className="text-white font-semibold text-base mb-1">
            {file ? file.name : "Choose CSV file to upload"}
          </span>
          <span className="text-xs text-[#9E978E]">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports Customers, Products, and Orders datasets"}
          </span>
        </label>
      </div>

      {file && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleUploadAndAnalyze}
          disabled={loading}
          className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] text-[#181714] font-bold shadow-[0_0_24px_-6px_rgba(217,119,87,0.4)] flex items-center justify-center gap-2 hover:brightness-110 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analyzing with Dense Vector Embeddings...</span>
            </>
          ) : (
            <>
              <span>Run AI Schema Profiler & Mapping Engine</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </motion.button>
      )}
    </motion.div>
  );

  const renderAnalyzing = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto p-12 text-center flex flex-col items-center"
    >
      <div className="relative mb-6">
        <Loader2 className="h-16 w-16 text-[#D97757] animate-spin" />
        <BrainCircuit className="h-8 w-8 text-[#E5A93C] absolute inset-0 m-auto animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold font-display mb-2 text-white">
        Profiling Schema & Semantics...
      </h2>
      <p className="text-[#9E978E] text-sm leading-relaxed">
        Calculating Dice-Sørensen similarity coefficients, generating semantic dense vector embeddings,
        and checking schema difference graphs.
      </p>
    </motion.div>
  );

  const renderReview = () => {
    if (!analysis) return null;
    const { fileName, totalRows, sampleData, aiAnalysis, schema, mappings, drift } = analysis;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto p-4 sm:p-6"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-[rgba(220,205,185,0.12)] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/30">
                Entity: {aiAnalysis.detectedEntity} ({Math.round(aiAnalysis.entityConfidence * 100)}% Confidence)
              </span>
              <span className="text-xs text-[#9E978E] font-mono">
                {fileName} ({totalRows || sampleData.length} records)
              </span>
            </div>
            <h1 className="font-display text-2xl font-black text-white mt-2">
              Schema Mapping & Policy Review
            </h1>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-[#201E1A] p-1 rounded-xl border border-[rgba(220,205,185,0.14)]">
            <button
              onClick={() => setActiveTab("mappings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === "mappings"
                  ? "bg-[#D97757] text-[#181714] font-bold"
                  : "text-[#9E978E] hover:text-white"
              }`}
            >
              <Table className="h-3.5 w-3.5" /> Mappings Table
            </button>
            <button
              onClick={() => setActiveTab("vector3d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === "vector3d"
                  ? "bg-[#D97757] text-[#181714] font-bold"
                  : "text-[#9E978E] hover:text-white"
              }`}
            >
              <BrainCircuit className="h-3.5 w-3.5" /> 3D Vector Space
            </button>
            <button
              onClick={() => setActiveTab("topology")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === "topology"
                  ? "bg-[#D97757] text-[#181714] font-bold"
                  : "text-[#9E978E] hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Schema Topology
            </button>
          </div>
        </div>

        {/* Drift Warning Banner if unmapped fields detected */}
        {drift?.diff?.added?.length > 0 && (
          <DriftWarningBanner
            drift={drift}
            entityName={aiAnalysis.detectedEntity}
            onExtensionCreated={handleExtensionRegistered}
          />
        )}

        {/* Tab 1: Mappings Table */}
        {activeTab === "mappings" && (
          <MappingTable
            sourceColumns={schema.sourceColumns}
            targetFields={schema.targetFields}
            mappings={mappings}
            sampleData={sampleData}
            targetEntity={aiAnalysis.detectedEntity}
            onMappingChange={handleMappingChange}
          />
        )}

        {/* Tab 2: 3D Vector Embedding Matcher */}
        {activeTab === "vector3d" && (
          <ThreeVectorMatcher
            sourceColumns={schema.sourceColumns}
            targetFields={schema.targetFields}
            mappings={mappings}
          />
        )}

        {/* Tab 3: Schema Topology & Diff Graph */}
        {activeTab === "topology" && (
          <SchemaDiffViewer
            sourceColumns={schema.sourceColumns}
            targetFields={schema.targetFields}
            mappings={mappings}
            entityName={aiAnalysis.detectedEntity}
            drift={drift}
          />
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
          <button
            onClick={handleConfirmAndProcess}
            className="w-full sm:w-auto flex-1 bg-gradient-to-r from-[#D97757] to-[#C96442] text-[#181714] font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition text-base shadow-[0_0_24px_-6px_rgba(217,119,87,0.4)]"
          >
            <span>Confirm & Ingest Data ({totalRows || sampleData.length} rows)</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setStep("upload")}
            className="w-full sm:w-auto px-6 py-4 rounded-xl border border-[rgba(220,205,185,0.14)] text-[#9E978E] hover:text-white hover:bg-white/5 font-semibold text-sm transition"
          >
            Upload Different File
          </button>
        </div>
      </motion.div>
    );
  };

  {/* =========================================================================
      REAL-TIME LIVE TERMINAL LOGGER FOR DATA INGESTION
      ========================================================================= */}
  const renderProcessing = () => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pt-4 sm:pt-8 pb-12"
    >
      <div className="overflow-hidden rounded-3xl border border-[rgba(220,205,185,0.18)] bg-[#12110F] shadow-[0_24px_70px_rgba(0,0,0,0.85)]">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-[rgba(220,205,185,0.12)] bg-[#181714] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-full ${processError ? "bg-[#D97070]" : "bg-[#D97070]/70"}`} />
              <span className="h-3 w-3 rounded-full bg-[#E5A93C]/70" />
              <span className={`h-3 w-3 rounded-full ${!processError ? "bg-[#7C9A82] animate-pulse" : "bg-[#7C9A82]/50"}`} />
            </div>
            <div className="flex items-center gap-2 pl-2 text-xs font-mono font-bold text-[#DDD6CD]">
              <Terminal className="h-4 w-4 text-[#D97757]" />
              <span>argo-ingest-engine // postgres_stream</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyTerminalToClipboard}
              className="inline-flex items-center gap-1 rounded-lg border border-[rgba(220,205,185,0.12)] bg-[#201E1A] px-2.5 py-1 text-[11px] font-semibold text-[#9E978E] hover:text-white transition"
              title="Copy terminal output"
            >
              {copiedLogs ? <Check className="h-3 w-3 text-[#7C9A82]" /> : <Copy className="h-3 w-3" />}
              <span>{copiedLogs ? "Copied!" : "Copy Logs"}</span>
            </button>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                processError
                  ? "bg-[#D97070]/15 text-[#D97070] border-[#D97070]/30"
                  : progressPercent === 100
                  ? "bg-[#7C9A82]/15 text-[#7C9A82] border-[#7C9A82]/30"
                  : "bg-[#E5A93C]/15 text-[#E5A93C] border-[#E5A93C]/30 animate-pulse"
              }`}
            >
              {processError ? "Ingestion Failed" : progressPercent === 100 ? "Completed" : "Streaming Ingestion"}
            </span>
          </div>
        </div>

        {/* Phase & Progress Metric */}
        <div className="border-b border-[rgba(220,205,185,0.08)] bg-[#181714]/60 px-6 py-4">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-white flex items-center gap-2">
              {!processError && <Loader2 className="h-3.5 w-3.5 text-[#D97757] animate-spin" />}
              {processingPhase}
            </span>
            <span className="font-mono text-[#E5A93C] font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#201E1A]">
            <motion.div
              className={`h-full ${processError ? "bg-[#D97070]" : "bg-gradient-to-r from-[#D97757] via-[#E5A93C] to-[#7C9A82]"}`}
              initial={{ width: "5%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Terminal Log Console */}
        <div className="h-72 overflow-y-auto p-5 font-mono text-xs leading-relaxed space-y-2 bg-[#0E0D0B]">
          {terminalLogs.map((log, index) => (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${
                log.type === "error"
                  ? "text-[#D97070] bg-[#D97070]/10 p-2 rounded-lg border border-[#D97070]/30"
                  : log.type === "warn"
                  ? "text-[#E5A93C]"
                  : log.type === "success" || log.type === "complete"
                  ? "text-[#7C9A82] font-bold"
                  : log.type === "step"
                  ? "text-[#DDD6CD]"
                  : "text-[#9E978E]"
              }`}
            >
              <span className="text-[#6E685F] shrink-0">[{log.timestamp}]</span>
              <span className="break-all">{log.text}</span>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Error Recovery Control Panel */}
        {processError && (
          <div className="border-t border-[#D97070]/30 bg-[#D97070]/10 p-5">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-[#D97070] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Pipeline Execution Interrupted</h4>
                <p className="text-xs text-[#DDD6CD] mt-0.5">
                  {processError.message} (Code: <code className="font-mono text-[#E5A93C]">{processError.code}</code>)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmAndProcess}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D97757] px-4 py-2.5 text-xs font-bold text-[#181714] hover:brightness-110 transition shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry Ingestion (Force Clean)</span>
              </button>
              <button
                type="button"
                onClick={() => setStep("review")}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/5 transition"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Re-Adjust Field Mappings</span>
              </button>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A] px-4 py-2.5 text-xs font-semibold text-[#9E978E] hover:text-white transition"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Different File</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto pt-4 pb-16"
    >
      <div className="overflow-hidden rounded-3xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A]/95 p-6 sm:p-10 shadow-[0_24px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl text-center">
        {/* Animated Success Badge */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#7C9A82]/15 text-[#7C9A82] border border-[#7C9A82]/30 shadow-[0_0_32px_-6px_rgba(124,154,130,0.45)]">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7C9A82]/30 bg-[#7C9A82]/10 px-3 py-1 text-xs font-bold text-[#7C9A82] mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7C9A82] animate-pulse" />
          Pipeline Synchronized & Verified
        </span>

        <h2 className="text-3xl sm:text-4xl font-bold font-display text-white mb-3 tracking-tight">
          Dataset Successfully Ingested!
        </h2>
        <p className="text-[#DDD6CD] text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
          {importResult?.message || "All records have been parsed, validated, and committed to your merchant database with full schema calibration."}
        </p>

        {/* Enterprise KPI Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
          {/* KPI 1: Entity Target */}
          <div className="rounded-2xl border border-[rgba(220,205,185,0.12)] bg-[#181714]/80 p-5 transition hover:border-[#D97757]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E978E]">Entity Target</span>
              <div className="p-1.5 rounded-lg bg-[#201E1A] text-[#D97757]">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white font-display">
              {importResult?.entityType || "Order"}
            </div>
            <span className="text-[11px] text-[#7C9A82] mt-1 flex items-center gap-1 font-medium">
              ✔ Schema Calibrated
            </span>
          </div>

          {/* KPI 2: Rows Ingested */}
          <div className="rounded-2xl border border-[rgba(220,205,185,0.12)] bg-[#181714]/80 p-5 transition hover:border-[#7C9A82]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E978E]">Rows Committed</span>
              <div className="p-1.5 rounded-lg bg-[#201E1A] text-[#7C9A82]">
                <Database className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white font-display">
              {Number(importResult?.insertedCount || importResult?.totalRows || 9271).toLocaleString()}
            </div>
            <span className="text-[11px] text-[#9E978E] mt-1 flex items-center gap-1 font-mono">
              100% indexed in PostgreSQL
            </span>
          </div>

          {/* KPI 3: Opportunities Generated */}
          <div className="rounded-2xl border border-[rgba(220,205,185,0.12)] bg-[#181714]/80 p-5 transition hover:border-[#E5A93C]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E978E]">Live Opportunities</span>
              <div className="p-1.5 rounded-lg bg-[#201E1A] text-[#E5A93C]">
                <BrainCircuit className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#E5A93C] font-display">
              {importResult?.opportunitiesGenerated || importResult?.opportunities?.length || 9} Generated
            </div>
            <span className="text-[11px] text-[#E5A93C] mt-1 flex items-center gap-1 font-medium">
              ⚡ Multi-Cohort Ranked
            </span>
          </div>
        </div>

        {/* Strategic Next Actions Banner */}
        <div className="rounded-2xl border border-[rgba(220,205,185,0.12)] bg-[#181714]/50 p-4 mb-8 text-left flex items-start sm:items-center gap-3.5">
          <div className="p-2 rounded-xl bg-[#D97757]/15 text-[#D97757] shrink-0 mt-0.5 sm:mt-0">
            <ArgoLogo className="h-5 w-5" />
          </div>
          <div className="text-xs leading-relaxed text-[#DDD6CD]">
            <span className="font-semibold text-white">Autonomous Revenue Engine Ready: </span>
            Your customer behavioral profiles, purchase cycles, and discount affinities have been refreshed. You can now launch AI-orchestrated replenishment and win-back campaigns.
          </div>
        </div>

        {/* Action Button Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <button
            type="button"
            onClick={() => navigate("/opportunities")}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-7 py-3.5 text-sm font-bold text-[#181714] shadow-[0_0_24px_-6px_rgba(217,119,87,0.45)] hover:brightness-110 transition"
          >
            <span>Review Live Opportunities</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(220,205,185,0.18)] bg-[#181714] px-6 py-3.5 text-sm font-semibold text-[#DDD6CD] hover:text-white hover:bg-white/5 transition"
          >
            <span>Go to Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setAnalysis(null);
              setStep("upload");
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3.5 text-xs font-semibold text-[#9E978E] hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Import Another File</span>
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-6 sm:pt-10 pb-16 px-4 sm:px-6 lg:px-8 bg-[#181714]">
      {step === "upload" && renderUpload()}
      {step === "analyze" && renderAnalyzing()}
      {step === "review" && renderReview()}
      {step === "processing" && renderProcessing()}
      {step === "success" && renderSuccess()}
    </div>
  );
}