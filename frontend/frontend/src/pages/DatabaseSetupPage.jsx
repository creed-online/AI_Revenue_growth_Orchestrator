import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Database, Upload, CheckCircle2, AlertCircle, Loader2, Users, Package, ShoppingCart, ArrowRight, ChevronLeft, Download, FileText, X } from "lucide-react";
import { api } from "../api/client";

const IMPORT_STEPS = [
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    description: "Import your customer base with purchase history and behavioral data",
    color: "sky",
    bgColor: "bg-sky/10",
    borderColor: "border-sky/30",
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    description: "Import your product catalog with replenishment settings",
    color: "mint",
    bgColor: "bg-mint/10",
    borderColor: "border-mint/30",
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingCart,
    description: "Import historical orders linking customers to products",
    color: "amber",
    bgColor: "bg-amber/10",
    borderColor: "border-amber/30",
  },
];

const ENTITY_FIELDS = {
  customers: [
    { key: "name", label: "Customer Name", required: true, example: "John Doe", description: "Full name of the customer" },
    { key: "email", label: "Email", required: false, example: "john@example.com", description: "Used for matching with orders" },
    { key: "totalOrders", label: "Total Orders", required: false, example: "5", description: "Number of completed orders" },
    { key: "totalSpend", label: "Total Spend", required: false, example: "25000", description: "Lifetime revenue from this customer" },
    { key: "avgOrderValue", label: "Avg Order Value", required: false, example: "5000", description: "Average order amount" },
    { key: "lastPurchaseDate", label: "Last Purchase Date", required: false, example: "2024-01-15", description: "Most recent order date (YYYY-MM-DD)" },
    { key: "firstPurchaseDate", label: "First Purchase Date", required: false, example: "2023-06-01", description: "First order date (YYYY-MM-DD)" },
    { key: "isVip", label: "VIP", required: false, example: "false", description: "High-value customer (true/false)" },
    { key: "isDiscountSensitive", label: "Discount Sensitive", required: false, example: "true", description: "Responds to discounts (true/false)" },
    { key: "isDormant", label: "Dormant", required: false, example: "false", description: "Inactive customer (true/false)" },
  ],
  products: [
    { key: "name", label: "Product Name", required: true, example: "Protein Powder", description: "Product display name" },
    { key: "price", label: "Price", required: true, example: "2999", description: "Current selling price in your currency" },
    { key: "category", label: "Category", required: false, example: "Supplements", description: "Product category for grouping" },
    { key: "isReplenishable", label: "Replenishable", required: false, example: "true", description: "Customers repurchase this regularly (true/false)" },
    { key: "avgCycleDays", label: "Replenishment Cycle (days)", required: false, example: "30", description: "Average days between repurchases" },
  ],
  orders: [
    { key: "customerEmail", label: "Customer Email", required: true, example: "john@example.com", description: "Must match a customer's email" },
    { key: "productName", label: "Product Name", required: true, example: "Protein Powder", description: "Must match a product's name" },
    { key: "quantity", label: "Quantity", required: false, example: "2", description: "Number of units ordered" },
    { key: "price", label: "Price", required: false, example: "2999", description: "Price per unit at time of order" },
    { key: "createdAt", label: "Order Date", required: false, example: "2024-01-15", description: "Order date (YYYY-MM-DD)" },
  ],
};

export default function DatabaseSetupPage() {
  const navigate = useNavigate();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStatus, setStepStatus] = useState({});
  const [importState, setImportState] = useState({
    step: "requirements",
    file: null,
    preview: null,
    validRecords: [],
    errors: [],
    columnMapping: {},
    loading: false,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const currentStep = IMPORT_STEPS[currentStepIndex];
  const currentEntityFields = ENTITY_FIELDS[currentStep.id];
  const isLastStep = currentStepIndex === IMPORT_STEPS.length - 1;

  const isStepAccessible = (index) => {
    if (index <= currentStepIndex) return true;
    return IMPORT_STEPS.slice(0, index).every(s => stepStatus[s.id] === "completed");
  };

  const checkImportStatus = useCallback(async () => {
    try {
      const [customersRes, productsRes, opportunitiesRes] = await Promise.all([
        api.get("/customers?limit=1"),
        api.get("/products?limit=1"),
        api.get("/opportunities"),
      ]);

      const hasCustomers = customersRes.data?.length > 0 || (customersRes.data?.customers?.length > 0);
      const hasProducts = productsRes.data?.length > 0 || (productsRes.data?.products?.length > 0);
      const hasOrders = opportunitiesRes.data?.opportunities?.length > 0 || opportunitiesRes.data?.length > 0;

      const statusUpdates = {};
      if (hasCustomers) statusUpdates.customers = "completed";
      if (hasProducts) statusUpdates.products = "completed";
      if (hasOrders) statusUpdates.orders = "completed";

      setStepStatus(prev => ({ ...prev, ...statusUpdates }));

      const firstIncomplete = IMPORT_STEPS.findIndex(s => statusUpdates[s.id] !== "completed");
      if (firstIncomplete !== -1) {
        setCurrentStepIndex(firstIncomplete);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Failed to check import status:", err);
    }
  }, [navigate]);

  useEffect(() => {
    checkImportStatus();
  }, [checkImportStatus]);

  const downloadTemplate = useCallback(async (entityType) => {
    const res = await api.get(`/import/template/${entityType}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${entityType}-template.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const handleFileChange = (e) => setImportState(prev => ({ ...prev, file: e.target.files[0] }));

  const handlePreview = async () => {
    const { file } = importState;
    if (!file) return;
    setImportState(prev => ({ ...prev, loading: true }));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", currentStep.id);
    try {
      const res = await api.post("/import/csv", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setImportState(prev => ({
        ...prev,
        preview: res.data,
        validRecords: res.data.valid || [],
        errors: res.data.errors || [],
        loading: false,
      }));

      const headers = res.data.headers || (res.data.preview?.length > 0 ? Object.keys(res.data.preview[0]) : []);
      const initialMapping = {};
      headers.forEach(h => {
        const match = currentEntityFields.find(f => f.key.toLowerCase() === h.toLowerCase());
        initialMapping[h] = match ? match.key : "";
      });
      setImportState(prev => ({ ...prev, columnMapping: initialMapping, step: "map" }));
    } catch (err) {
      alert("Preview failed: " + err.message);
      setImportState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleMappingChange = (csvHeader, appField) => {
    setImportState(prev => ({ ...prev, columnMapping: { ...prev.columnMapping, [csvHeader]: appField } }));
  };

  const handleConfirm = async () => {
    const { preview, validRecords, columnMapping, loading } = importState;
    if (!preview || loading) return;

    setImportState(prev => ({ ...prev, loading: true }));
    setStepStatus(prev => ({ ...prev, [currentStep.id]: "in_progress" }));

    try {
      const mappedRecords = validRecords.map(v => {
        const mapped = {};
        Object.entries(v.data).forEach(([csvHeader, value]) => {
          const appField = columnMapping[csvHeader];
          if (appField) mapped[appField] = value;
        });
        return { data: mapped };
      });

      await api.post("/import/confirm", { entityType: currentStep.id, records: mappedRecords });

      setStepStatus(prev => ({ ...prev, [currentStep.id]: "completed" }));
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setImportState({
          step: "requirements",
          file: null,
          preview: null,
          validRecords: [],
          errors: [],
          columnMapping: {},
          loading: false,
        });

        if (isLastStep) {
          processAndComplete();
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }, 1500);
    } catch (err) {
      setStepStatus(prev => ({ ...prev, [currentStep.id]: "error" }));
      alert("Import failed: " + err.message);
      setImportState(prev => ({ ...prev, loading: false }));
    }
  };

  const processAndComplete = async () => {
    setImportState(prev => ({ ...prev, loading: true, step: "processing" }));
    try {
      await api.post("/import/process", {});
      await new Promise(resolve => setTimeout(resolve, 2000));
      navigate("/dashboard");
    } catch (err) {
      console.error("Processing failed:", err);
      navigate("/dashboard");
    }
  };

  const handleBackToStepSelect = () => {
    setImportState({
      step: "requirements",
      file: null,
      preview: null,
      validRecords: [],
      errors: [],
      columnMapping: {},
      loading: false,
    });
  };

  const handleStepSelect = (index) => {
    setCurrentStepIndex(index);
    setImportState(prev => ({ ...prev, step: "select" }));
  };

  function renderProgressIndicator() {
    return (
      <div className="mb-8">
        <h2 className="font-display text-lg font-bold text-center mb-6">Database Setup</h2>
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-1 bg-ink-border" />
          <div className="relative flex justify-between">
            {IMPORT_STEPS.map((step, index) => {
              const status = stepStatus[step.id] || "pending";
              const isActive = index === currentStepIndex;
              const isCompleted = status === "completed";
              const isError = status === "error";

              let stepColor, stepBg, stepBorder;
              if (isError) {
                stepColor = "text-rose-signal";
                stepBg = "bg-rose-signal/10";
                stepBorder = "border-rose-signal";
              } else if (isCompleted) {
                stepColor = "text-mint";
                stepBg = "bg-mint/10";
                stepBorder = "border-mint";
              } else if (isActive) {
                stepColor = `text-${step.color}`;
                stepBg = step.bgColor;
                stepBorder = step.borderColor;
              } else {
                stepColor = "text-ink-muted";
                stepBg = "bg-ink/30";
                stepBorder = "border-ink-border";
              }

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${stepBorder} ${stepBg} ${stepColor} ${
                      isActive ? "ring-4 ring-offset-2 ring-offset-ink ring-mint/30 animate-pulse" : ""
                    } ${isCompleted ? "scale-110" : ""}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isError ? (
                      <AlertCircle className="h-6 w-6" />
                    ) : (
                      <step.icon className="h-6 w-6" />
                    )}
                  </div>
                  <p className={`mt-2 text-xs font-medium text-center ${isActive ? "font-bold text-white" : "text-ink-muted"}`}>
                    {step.label}
                  </p>
                  {index < IMPORT_STEPS.length - 1 && (
                    <div className="absolute top-6 left-1/2 w-full h-1 bg-ink-border z-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderRequirements() {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.55)]">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Import Your Business Data</h1>
          <p className="mt-2 text-ink-muted">We'll guide you through importing Customers, Products, and Orders — in that order.</p>
        </div>

        <div className="mb-8 panel rounded-2xl border border-mint/20 bg-mint/5 p-6">
          <h2 className="flex items-center gap-2 font-semibold text-white mb-4">
            <Database className="h-5 w-5 text-mint" />
            Import Order & Why It Matters
          </h2>
          <ol className="space-y-3 text-sm text-ink-soft">
            <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky/20 text-sky text-center text-xs font-bold">1</span> <strong>Customers</strong> — Foundation for all analytics; orders need customer emails to link</li>
            <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-mint/20 text-mint text-center text-xs font-bold">2</span> <strong>Products</strong> — Catalog with replenishment settings; orders need product names to link</li>
            <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber/20 text-amber text-center text-xs font-bold">3</span> <strong>Orders</strong> — Links customers to products; requires both to exist first</li>
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {IMPORT_STEPS.map((step, index) => {
            const status = stepStatus[step.id] || "pending";
            const isCompleted = status === "completed";
            const isError = status === "error";
            const isCurrent = index === currentStepIndex;
            const isAccessible = isStepAccessible(index);

            let stepColor, stepBg, stepBorder, stepTextColor;
            if (isError) {
              stepColor = "text-rose-signal";
              stepBg = "bg-rose-signal/10";
              stepBorder = "border-rose-signal";
              stepTextColor = "text-rose-signal";
            } else if (isCompleted) {
              stepColor = "text-mint";
              stepBg = "bg-mint/10";
              stepBorder = "border-mint";
              stepTextColor = "text-mint";
            } else if (isCurrent) {
              stepColor = `text-${step.color}`;
              stepBg = step.bgColor;
              stepBorder = step.borderColor;
              stepTextColor = `text-${step.color}`;
            } else if (isAccessible) {
              stepColor = "text-ink-muted";
              stepBg = "bg-ink/30";
              stepBorder = "border-ink-border";
              stepTextColor = "text-ink-muted";
            } else {
              stepColor = "text-ink-muted/50";
              stepBg = "bg-ink/20";
              stepBorder = "border-ink-border/50";
              stepTextColor = "text-ink-muted/50";
            }

            return (
              <motion.button
                key={step.id}
                onClick={() => isAccessible && handleStepSelect(index)}
                disabled={!isAccessible}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`relative p-5 rounded-2xl border-2 text-left transition ${isCurrent ? "ring-2 ring-mint/30" : ""} ${isCompleted ? "bg-mint/5" : ""} ${!isAccessible ? "opacity-50 cursor-not-allowed" : "hover:border-mint/30"}`}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${stepBorder} ${stepBg} ${stepColor}`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <step.icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{step.label}</h3>
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-mint" />}
                      {isCurrent && <span className="px-2 py-0.5 rounded text-[10px] bg-mint/20 text-mint font-semibold">Current</span>}
                      {isError && <span className="px-2 py-0.5 rounded text-[10px] bg-rose-signal/20 text-rose-signal font-semibold">Error</span>}
                    </div>
                    <p className={`text-sm mt-1 ${stepTextColor}`}>{step.description}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 text-xs font-semibold">
                  {currentEntityFields.length} fields
                </div>
              </motion.button>
            );
          })}
        </div>

        {stepStatus[currentStep.id] === "completed" && !isLastStep && (
          <motion.button
            onClick={() => { setCurrentStepIndex(currentStepIndex + 1); handleBackToStepSelect(); }}
            className="mt-6 w-full bg-gradient-to-r from-mint to-mint-deep text-ink font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            whileTap={{ scale: 0.98 }}
          >
            Continue to {IMPORT_STEPS[currentStepIndex + 1].label} →
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}
      </motion.div>
    );
  }

  function renderSelect() {
    if (!currentStep) return null;
    const status = stepStatus[currentStep.id] || "pending";
    const isCompleted = status === "completed";

    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <button onClick={handleBackToStepSelect} className="text-mint hover:underline text-sm flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Steps
          </button>
        </div>
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${currentStep.bgColor} ${currentStep.color === "sky" ? "text-sky" : currentStep.color === "mint" ? "text-mint" : "text-amber"}`}>
              <currentStep.icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{currentStep.label}</h1>
              <p className="text-ink-muted">{currentStep.description}</p>
            </div>
          </div>
        </div>

        {isCompleted && (
          <div className="mb-6 panel rounded-xl border border-mint/30 bg-mint/10 p-4">
            <div className="flex items-center gap-2 text-mint">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">{currentStep.label} already imported successfully!</span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">You can re-import if needed, or continue to the next step.</p>
          </div>
        )}

        <div className="mb-6 panel rounded-xl border border-ink-border bg-ink-elevated/50 p-4">
          <h3 className="font-semibold text-white mb-3">Required & Optional Fields</h3>
          <div className="space-y-2 text-sm">
            {currentEntityFields.map(f => (
              <div key={f.key} className="flex items-start gap-3 text-ink-soft">
                <code className="flex-shrink-0 px-2 py-0.5 rounded bg-ink border border-ink-border text-mint text-[11px]">{f.key}</code>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.label}</span>
                    {f.required && <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-signal/20 text-rose-signal">Required</span>}
                  </div>
                  <p className="text-[11px] text-ink-muted">{f.description}</p>
                  <p className="text-[11px] text-ink-muted">Example: <code className="text-ink-soft">{f.example}</code></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <button onClick={() => downloadTemplate(currentStep.id)} className="inline-flex items-center gap-2 text-mint hover:underline text-sm font-medium">
            <Download className="h-4 w-4" />
            Download CSV Template
          </button>
          <p className="mt-1 text-xs text-ink-muted">Use this template as a starting point for your data.</p>
        </div>

        <div className="mb-6">
          <label className="w-full cursor-pointer">
            <input type="file" accept=".csv" onChange={handleFileChange} className="sr-only" disabled={importState.loading} />
            <div className={`relative w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              importState.file
                ? "border-mint bg-mint/10"
                : "border-ink-border hover:border-mint/30 hover:bg-white/5"
            }`}>
              {importState.file ? (
                <div className="flex items-center justify-center gap-3 text-mint">
                  <FileText className="h-6 w-6" />
                  <div>
                    <p className="font-semibold text-white">{importState.file.name}</p>
                    <p className="text-xs text-ink-muted">{(importState.file.size / 1024).toFixed(1)} KB · Click to change</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleFileChange({ target: { files: [] } }); }} className="ml-4 text-ink-muted hover:text-white p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-ink-muted" />
                  <p className="font-medium text-white">Drag & drop your CSV file here</p>
                  <p className="text-xs text-ink-muted">or click to browse</p>
                </div>
              )}
            </div>
          </label>
          <p className="text-xs text-ink-muted mt-2 text-center">Upload your CSV file to preview and validate</p>
        </div>

        <button onClick={handlePreview} disabled={!importState.file || importState.loading} className="w-full bg-mint text-ink font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {importState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Preview Import <ArrowRight className="h-4 w-4" /></>}
        </button>
      </motion.div>
    );
  }

  function renderMap() {
    if (!importState.preview || !currentStep) return null;
    const headers = importState.preview.headers || (importState.preview.preview.length > 0 ? Object.keys(importState.preview.preview[0]) : []);
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <button onClick={() => setImportState(prev => ({ ...prev, step: "select" }))} className="text-mint hover:underline text-sm flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Map Columns — {currentStep.label}</h1>
          <p className="text-ink-muted">Match your CSV columns to application fields. We've auto-detected matches where possible.</p>
        </div>

        <div className="mb-6 panel rounded-xl border border-ink-border bg-ink-elevated/50 p-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-border">
                <th className="p-3 font-semibold text-ink-muted">Your CSV Column</th>
                <th className="p-3 font-semibold text-ink-muted">Application Field</th>
                <th className="p-3 font-semibold text-ink-muted">Sample Value</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header, i) => (
                <tr key={i} className="border-b border-ink-border/50">
                  <td className="p-3 font-mono text-[11px] text-white bg-ink/50 rounded">{header}</td>
                  <td className="p-3">
                    <select
                      value={importState.columnMapping[header] || ""}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full rounded-xl border border-ink-border bg-ink-elevated px-3 py-2 text-sm text-white outline-none focus:border-mint/40"
                    >
                      <option value="">— Ignore this column —</option>
                      {currentEntityFields.map(f => (
                        <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-ink-muted max-w-xs truncate">{importState.preview.preview[0]?.[header] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setImportState(prev => ({ ...prev, step: "select" }))} className="flex-1 border border-ink-border text-ink-soft py-2 rounded-xl hover:bg-white/5">Back</button>
          <button onClick={() => setImportState(prev => ({ ...prev, step: "preview" }))} disabled={importState.loading} className="flex-1 bg-mint text-ink font-bold py-2 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            Continue to Preview <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  function renderPreview() {
    if (!importState.preview) return null;
    const hasErrors = importState.errors.length > 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <button onClick={() => setImportState(prev => ({ ...prev, step: "map" }))} className="text-mint hover:underline text-sm flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold">Preview Import — {currentStep.label}</h1>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/10 text-mint px-3 py-1 text-xs font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            {importState.preview.validCount} valid rows
          </span>
          {hasErrors && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-signal/10 text-rose-signal px-3 py-1 text-xs font-semibold">
              <AlertCircle className="h-3 w-3" />
              {importState.errors.length} errors
            </span>
          )}
        </div>

        {hasErrors && (
          <div className="mb-4 panel rounded-xl border border-rose-signal/30 bg-rose-signal/5 p-4">
            <p className="font-semibold text-rose-signal mb-2">Cannot proceed with import. Please fix the following errors:</p>
            <ul className="text-xs text-ink-muted max-h-40 overflow-auto space-y-1">
              {importState.errors.slice(0, 20).map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-signal">Row {e.rowNum}:</span>
                  <span>{e.error}</span>
                </li>
              ))}
              {importState.errors.length > 20 && <li className="text-ink-muted">...and {importState.errors.length - 20} more errors</li>}
            </ul>
          </div>
        )}

        <div className="mb-4 overflow-x-auto panel rounded-xl max-h-96">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-ink-elevated">
              <tr>{importState.preview.preview[0] && Object.keys(importState.preview.preview[0]).map(k => <th key={k} className="p-3 font-semibold text-ink-muted">{k}</th>)}</tr>
            </thead>
            <tbody>
              {importState.preview.preview.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-t border-ink-border">
                  {Object.values(row).map((v, j) => <td key={j} className="p-3 text-white">{v ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setImportState(prev => ({ ...prev, step: "map" }))} className="flex-1 border border-ink-border text-ink-soft py-2 rounded-xl hover:bg-white/5">Back</button>
          <button onClick={handleConfirm} disabled={importState.loading || hasErrors} className="flex-1 bg-mint text-ink font-bold py-2 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {importState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm Import <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
      </motion.div>
    );
  }

  function renderProcessing() {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto p-6 text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-mint/10">
          <Loader2 className="h-8 w-8 text-mint animate-spin" />
        </div>
        <h1 className="font-display text-2xl font-bold">Processing Your Data</h1>
        <p className="mt-2 text-ink-muted">Validating relationships, calculating analytics, and generating opportunities...</p>
        <div className="mt-6 space-y-2 text-sm text-ink-muted">
          <p>✓ Customer–Order relationships validated</p>
          <p>✓ Product–Order relationships validated</p>
          <p className="animate-pulse">⟳ Calculating replenishment opportunities...</p>
          <p className="animate-pulse">⟳ Preparing campaign opportunities...</p>
        </div>
      </motion.div>
    );
  }

  function renderSuccess() {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto p-6 text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-mint/10">
          <CheckCircle2 className="h-8 w-8 text-mint" />
        </div>
        <h1 className="font-display text-2xl font-bold">{currentStep.label} Imported Successfully!</h1>
        <p className="mt-2 text-ink-muted">{importState.preview?.validCount} records added to your database.</p>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <AnimatePresence mode="wait">
        {showSuccess && renderSuccess()}
        {!showSuccess && (
          <>
            <main className="mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
              {renderProgressIndicator()}

              <AnimatePresence mode="wait">
                {importState.step === "requirements" && renderRequirements()}
                {importState.step === "select" && renderSelect()}
                {importState.step === "map" && renderMap()}
                {importState.step === "preview" && renderPreview()}
                {importState.step === "processing" && renderProcessing()}
              </AnimatePresence>
            </main>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
