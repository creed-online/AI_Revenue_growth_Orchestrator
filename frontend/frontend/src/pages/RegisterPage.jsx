import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Database, Upload, Lock, Mail, Building2, Briefcase, X } from "lucide-react";
import { storeAuth } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ArgoLogo from "../components/ArgoLogo";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", businessName: "", industry: "" });
  const [datasetChoice, setDatasetChoice] = useState("import"); // 'demo' | 'import'
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

      // Save auth tokens
      storeAuth(data.token, data.merchant);
      setAuth(data.token, data.merchant);

      if (datasetChoice === "demo") {
        localStorage.setItem("argo_demo_mode", "true");
        navigate("/");
      } else {
        localStorage.removeItem("argo_demo_mode");
        navigate("/import");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181714] px-4 py-10">
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.7)] border border-[rgba(220,205,185,0.18)] bg-[#201E1A]/95 backdrop-blur-xl"
      >
        {/* Top-Right Cross Close Button */}
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Close and return to dashboard"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(220,205,185,0.14)] bg-[#181714] text-[#9E978E] hover:border-[#D97757]/40 hover:text-white transition-colors shadow-sm"
          title="Back to Dashboard"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex items-center gap-3 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D97757] to-[#E5A93C] text-[#181714] shadow-[0_0_24px_-6px_rgba(217,119,87,0.55)] p-2">
            <ArgoLogo className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Create Merchant Account</h1>
            <p className="text-xs text-[#9E978E]">Set up your isolated database workspace</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[#D97070]/30 bg-[#D97070]/10 px-3.5 py-2.5 text-xs text-[#D97070]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9E978E]">
                <Building2 className="h-3.5 w-3.5" /> Business Name
              </label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#D97757]/60"
                required
                placeholder="e.g. Raksh Nutrition"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9E978E]">
                <Briefcase className="h-3.5 w-3.5" /> Industry
              </label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#D97757]/60"
                placeholder="e.g. Health & Fitness"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9E978E]">
              <Mail className="h-3.5 w-3.5" /> Merchant Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#D97757]/60"
              required
              placeholder="e.g. contact@yourstore.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9E978E]">
              <Lock className="h-3.5 w-3.5" /> Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#D97757]/60"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Workspace Starting Mode Selection */}
        <div className="mt-6">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[#9E978E]">
            Initial Database Workspace Setup
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDatasetChoice("import")}
              className={`p-3.5 rounded-2xl border text-left transition relative ${
                datasetChoice === "import"
                  ? "border-[#D97757] bg-[#D97757]/15"
                  : "border-[rgba(220,205,185,0.14)] hover:border-[#D97757]/40 bg-[#181714]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D97757]/20 text-[#D97757]">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Import My Data</h3>
                  <p className="text-[11px] text-[#9E978E] mt-0.5">
                    Upload your store orders & catalog CSV
                  </p>
                </div>
              </div>
              {datasetChoice === "import" && (
                <span className="absolute top-2.5 right-2.5 text-xs text-[#D97757] font-bold">✓</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDatasetChoice("demo")}
              className={`p-3.5 rounded-2xl border text-left transition relative ${
                datasetChoice === "demo"
                  ? "border-[#E5A93C] bg-[#E5A93C]/15"
                  : "border-[rgba(220,205,185,0.14)] hover:border-[#E5A93C]/40 bg-[#181714]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E5A93C]/20 text-[#E5A93C]">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Explore Demo</h3>
                  <p className="text-[11px] text-[#9E978E] mt-0.5">
                    Start with pre-loaded demo sandbox
                  </p>
                </div>
              </div>
              {datasetChoice === "demo" && (
                <span className="absolute top-2.5 right-2.5 text-xs text-[#E5A93C] font-bold">✓</span>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-4 py-3 text-sm font-bold text-[#181714] shadow-[0_0_24px_-6px_rgba(217,119,87,0.4)] transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Creating Workspace..." : "Create Account & Get Started"}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-4 text-center text-xs text-[#9E978E]">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#D97757] hover:underline">
            Log in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}