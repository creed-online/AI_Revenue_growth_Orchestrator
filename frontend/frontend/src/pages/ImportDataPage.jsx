import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Database, Upload, Download, ChevronRight, CheckCircle2, AlertCircle, X, Loader2, FileText, Users, Package, ShoppingCart, ArrowRight, ExternalLink } from "lucide-react";
import { api } from "../api/client";

const ENTITY_TYPES = [
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    description: "Your customer base with purchase history and behavioral data",
    fields: [
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
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    description: "Your product catalog with replenishment settings",
    fields: [
      { key: "name", label: "Product Name", required: true, example: "Protein Powder", description: "Product display name" },
      { key: "price", label: "Price", required: true, example: "2999", description: "Current selling price in your currency" },
      { key: "category", label: "Category", required: false, example: "Supplements", description: "Product category for grouping" },
      { key: "isReplenishable", label: "Replenishable", required: false, example: "true", description: "Customers repurchase this regularly (true/false)" },
      { key: "avgCycleDays", label: "Replenishment Cycle (days)", required: false, example: "30", description: "Average days between repurchases" },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingCart,
    description: "Historical orders linking customers to products",
    fields: [
      { key: "customerEmail", label: "Customer Email", required: true, example: "john@example.com", description: "Must match a customer's email" },
      { key: "productName", label: "Product Name", required: true, example: "Protein Powder", description: "Must match a product's name" },
      { key: "quantity", label: "Quantity", required: false, example: "2", description: "Number of units ordered" },
      { key: "price", label: "Price", required: false, example: "2999", description: "Price per unit at time of order" },
      { key: "createdAt", label: "Order Date", required: false, example: "2024-01-15", description: "Order date (YYYY-MM-DD)" },
    ],
  },
];

export default function ImportDataPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("requirements"); // requirements -> select -> map -> preview -> confirm
  const [entityType, setEntityType] = useState("customers");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [loading, setLoading] = useState(false);

  const currentEntity = ENTITY_TYPES.find(e => e.id === entityType);

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

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    try {
      const res = await api.post("/import/csv", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setPreview(res.data);
      setErrors(res.data.errors || []);
      
      // Initialize column mapping with auto-detection
      if (res.data.preview?.length > 0) {
        const headers = Object.keys(res.data.preview[0]);
        const initialMapping = {};
        headers.forEach(h => {
          const match = currentEntity.fields.find(f => f.key.toLowerCase() === h.toLowerCase());
          initialMapping[h] = match ? f.key : "";
        });
        setColumnMapping(initialMapping);
      }
      setStep("map");
    } catch (err) {
      alert("Preview failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (csvHeader, appField) => {
    setColumnMapping(prev => ({ ...prev, [csvHeader]: appField }));
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      // Apply column mapping to records
      const mappedRecords = preview.valid.map(v => {
        const mapped = {};
        Object.entries(v.data).forEach(([csvHeader, value]) => {
          const appField = columnMapping[csvHeader];
          if (appField) mapped[appField] = value;
        });
        return { data: mapped };
      });
      await api.post("/import/confirm", { entityType, records: mappedRecords });
      alert("Import successful!");
      navigate("/dashboard");
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRequirements = () => (
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
        <p className="mt-2 text-ink-muted">Upload CSV files to populate your merchant account with customers, products, and orders.</p>
      </div>

      <div className="mb-8 panel rounded-2xl border border-mint/20 bg-mint/5 p-6">
        <h2 className="flex items-center gap-2 font-semibold text-white mb-4">
          <FileText className="h-5 w-5 text-mint" />
          How the import works
        </h2>
        <ol className="space-y-3 text-sm text-ink-soft">
          <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-mint/20 text-mint text-center text-xs font-bold">1</span> Choose the data type to import (Customers, Products, or Orders)</li>
          <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-mint/20 text-mint text-center text-xs font-bold">2</span> Download the CSV template to see the expected format</li>
          <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-mint/20 text-mint text-center text-xs font-bold">3</span> Prepare your CSV file with your business data</li>
          <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-mint/20 text-mint text-center text-xs font-bold">4</span> Upload and preview — we'll validate each row</li>
          <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-mint/20 text-mint text-center text-xs font-bold">5</span> Map your CSV columns to our fields (auto-detected)</li>
          <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-mint/20 text-mint text-center text-xs font-bold">6</span> Confirm import — data is linked to your merchant account</li>
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ENTITY_TYPES.map(e => (
          <motion.button
            key={e.id}
            onClick={() => { setEntityType(e.id); setStep("select"); }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`relative p-5 rounded-2xl border-2 text-left transition ${entityType === e.id ? "border-mint bg-mint/10" : "border-ink-border hover:border-mint/30"}`}
            whileHover={{ y: -2 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint/20 text-mint">
                <e.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white">{e.label}</h3>
                <p className="text-sm text-ink-muted mt-1 line-clamp-2">{e.description}</p>
              </div>
            </div>
            <div className="absolute top-3 right-3 text-xs text-mint font-semibold">
              {e.fields.length} fields
            </div>
          </motion.button>
        ))}
      </div>

      <motion.button
        onClick={() => setStep("select")}
        disabled={!entityType}
        className="mt-6 w-full bg-gradient-to-r from-mint to-mint-deep text-ink font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        whileTap={{ scale: 0.98 }}
      >
        Continue to Upload
        <ArrowRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );

  const renderSelect = () => {
    if (!currentEntity) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <button onClick={() => setStep("requirements")} className="text-mint hover:underline text-sm">← Back</button>
        </div>
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint/20 text-mint">
              <currentEntity.icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{currentEntity.label}</h1>
              <p className="text-ink-muted">{currentEntity.description}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 panel rounded-xl border border-ink-border bg-ink-elevated/50 p-4">
          <h3 className="font-semibold text-white mb-3">Required & Optional Fields</h3>
          <div className="space-y-2 text-sm">
            {currentEntity.fields.map(f => (
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
          <button onClick={() => downloadTemplate(entityType)} className="inline-flex items-center gap-2 text-mint hover:underline text-sm font-medium">
            <Download className="h-4 w-4" />
            Download CSV Template
          </button>
          <p className="mt-1 text-xs text-ink-muted">Use this template as a starting point for your data.</p>
        </div>

        <div className="mb-6">
          <input type="file" accept=".csv" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-mint file:text-ink file:font-bold w-full" />
          <p className="text-xs text-ink-muted mt-2">Upload your CSV file to preview and validate</p>
        </div>

        <button onClick={handlePreview} disabled={!file || loading} className="w-full bg-mint text-ink font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Preview Import <ArrowRight className="h-4 w-4" /></>}
        </button>
      </motion.div>
    );
  };

  const renderMap = () => {
    if (!preview || !currentEntity) return null;
    const headers = preview.preview.length > 0 ? Object.keys(preview.preview[0]) : [];
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <button onClick={() => setStep("select")} className="text-mint hover:underline text-sm">← Back</button>
        </div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Map Columns</h1>
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
                      value={columnMapping[header] || ""}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full rounded-xl border border-ink-border bg-ink-elevated px-3 py-2 text-sm text-white outline-none focus:border-mint/40"
                    >
                      <option value="">— Ignore this column —</option>
                      {currentEntity.fields.map(f => (
                        <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-ink-muted max-w-xs truncate">{preview.preview[0]?.[header] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setStep("select")} className="flex-1 border border-ink-border text-ink-soft py-2 rounded-xl hover:bg-white/5">Back</button>
          <button onClick={() => setStep("preview")} disabled={loading} className="flex-1 bg-mint text-ink font-bold py-2 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            Continue to Preview <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderPreview = () => {
    if (!preview) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <button onClick={() => setStep("map")} className="text-mint hover:underline text-sm">← Back</button>
        </div>
        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold">Preview Import — {currentEntity?.label}</h1>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/10 text-mint px-3 py-1 text-xs font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            {preview.validCount} valid rows
          </span>
          {errors.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-signal/10 text-rose-signal px-3 py-1 text-xs font-semibold">
              <AlertCircle className="h-3 w-3" />
              {errors.length} errors
            </span>
          )}
        </div>

        {errors.length > 0 && (
          <details className="mb-4 panel rounded-xl p-4">
            <summary className="font-semibold text-rose-signal cursor-pointer flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              View Errors ({errors.length})
            </summary>
            <ul className="mt-2 text-xs text-ink-muted max-h-40 overflow-auto space-y-1">
              {errors.slice(0, 20).map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-signal">Row {e.rowNum}:</span>
                  <span>{e.error}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mb-4 overflow-x-auto panel rounded-xl max-h-96">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-ink-elevated">
              <tr>{preview.preview[0] && Object.keys(preview.preview[0]).map(k => <th key={k} className="p-3 font-semibold text-ink-muted">{k}</th>)}</tr>
            </thead>
            <tbody>
              {preview.preview.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-t border-ink-border">
                  {Object.values(row).map((v, j) => <td key={j} className="p-3 text-white">{v ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setStep("map")} className="flex-1 border border-ink-border text-ink-soft py-2 rounded-xl hover:bg-white/5">Back</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 bg-mint text-ink font-bold py-2 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm Import <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {step === "requirements" && renderRequirements()}
      {step === "select" && renderSelect()}
      {step === "map" && renderMap()}
      {step === "preview" && renderPreview()}
    </AnimatePresence>
  );
}