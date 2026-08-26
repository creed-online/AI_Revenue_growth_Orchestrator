import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Database, Upload } from "lucide-react";
import { storeAuth } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, setAuth } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", businessName: "", industry: "" });
  const [datasetChoice, setDatasetChoice] = useState(null); // 'demo' | 'import'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message || "Registration failed");
      storeAuth(data.token, data.merchant);
      await login(data.merchant.email, form.password);
      
      if (datasetChoice === "demo") {
        // Switch to demo merchant (merchantId=1)
        const token = localStorage.getItem("argo_token");
        const switchRes = await fetch("/api/auth/switch-merchant", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ targetMerchantId: 1 }),
        });
        const switchData = await switchRes.json();
        if (switchData.token) {
          localStorage.setItem("argo_token", switchData.token);
          localStorage.setItem("argo_merchant", JSON.stringify(switchData.merchant));
          localStorage.setItem("argo_demo_mode", "true");
          // Update auth context with demo merchant
          setAuth(switchData.token, switchData.merchant);
        }
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink p-4">
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="w-full max-w-md panel rounded-2xl p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.55)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Create Your Account</h1>
            <p className="text-xs text-ink-muted">Start growing your revenue with AI</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-rose-signal/30 bg-rose-signal/10 px-3 py-2 text-sm text-rose-signal">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-white outline-none transition focus:border-mint/40"
              required
              placeholder="e.g., Raksh Fitness"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Industry (optional)</label>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-white outline-none transition focus:border-mint/40"
              placeholder="e.g., Fitness & Wellness"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-white outline-none transition focus:border-mint/40"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-white outline-none transition focus:border-mint/40"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            How would you like to use the application?
          </p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setDatasetChoice("demo")}
              className={`relative p-4 rounded-2xl border-2 text-left transition ${datasetChoice === "demo" ? "border-mint bg-mint/10" : "border-ink-border hover:border-mint/30"}`}
            >
              <input
                type="radio"
                checked={datasetChoice === "demo"}
                onChange={() => setDatasetChoice("demo")}
                className="sr-only"
              />
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-signal/20 text-amber-signal">
                  <Database className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white">Explore Demo Data</h3>
                  <p className="text-sm text-ink-muted">Try the platform with Demo Fitness Store's pre-loaded data</p>
                </div>
              </div>
              {datasetChoice === "demo" && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-mint text-ink">
                  <span className="text-[10px]">✓</span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDatasetChoice("import")}
              className={`relative p-4 rounded-2xl border-2 text-left transition ${datasetChoice === "import" ? "border-mint bg-mint/10" : "border-ink-border hover:border-mint/30"}`}
            >
              <input
                type="radio"
                checked={datasetChoice === "import"}
                onChange={() => setDatasetChoice("import")}
                className="sr-only"
              />
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint/20 text-mint">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white">Import My Own Data</h3>
                  <p className="text-sm text-ink-muted">Upload your customers, products, and orders via CSV</p>
                </div>
              </div>
              {datasetChoice === "import" && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-mint text-ink">
                  <span className="text-[10px]">✓</span>
                </div>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !datasetChoice}
          className="mt-6 w-full bg-gradient-to-r from-mint to-mint-deep text-ink font-bold py-3 rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Account & Continue"}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-4 text-center text-xs text-ink-muted">
          Already have an account? <a href="/login" className="text-mint font-semibold">Log in</a>
        </p>
      </motion.form>
    </div>
  );
}