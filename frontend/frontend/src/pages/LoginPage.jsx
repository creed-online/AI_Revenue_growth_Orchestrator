import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Database, UserPlus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ArgoLogo from "../components/ArgoLogo";

export default function LoginPage() {
  const { login, isAuthenticated, bootstrapping, setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  if (bootstrapping) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="skeleton h-10 w-48 rounded-xl" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      localStorage.removeItem("argo_demo_mode");
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not sign in. Please verify your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAccess() {
    setError("");
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("argo_token", data.token);
        localStorage.setItem("argo_merchant", JSON.stringify(data.merchant));
        localStorage.setItem("argo_demo_mode", "true");
        setAuth(data.token, data.merchant);
        navigate("/");
      } else {
        throw new Error("Could not initialize demo sandbox session");
      }
    } catch (err) {
      setError(err.message || "Failed to start demo session");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.7)] border border-[rgba(220,205,185,0.18)] bg-[#201E1A]/95 backdrop-blur-xl"
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
            <h1 className="font-display text-xl font-bold text-white">Merchant Login</h1>
            <p className="text-xs text-[#9E978E]">Access your AI revenue growth dashboard</p>
          </div>
        </div>

        {/* 1-Click Instant Demo Sandbox Button */}
        <div className="mb-6 rounded-2xl border border-[#E5A93C]/30 bg-[#E5A93C]/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E5A93C]/20 text-[#E5A93C]">
              <Database className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white">Quick Demo Sandbox</h3>
              <p className="text-[11px] text-[#9E978E] leading-tight mt-0.5">
                Explore with pre-loaded demo orders, customers, and Razorpay test mode.
              </p>
              <button
                type="button"
                onClick={handleDemoAccess}
                disabled={demoLoading}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#E5A93C] px-3.5 py-1.5 text-xs font-bold text-[#181714] transition hover:brightness-110 disabled:opacity-60"
              >
                {demoLoading ? "Starting Sandbox..." : "Explore Demo Database →"}
              </button>
            </div>
          </div>
        </div>

        <div className="relative mb-6 flex items-center justify-center">
          <div className="w-full border-t border-[rgba(220,205,185,0.12)]" />
          <span className="absolute bg-[#201E1A] px-3 text-[10px] font-bold uppercase tracking-wider text-[#9E978E]">
            or sign in with credentials
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9E978E]">
              <Mail className="h-3.5 w-3.5" /> Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. merchant@yourstore.com"
              required
              className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#D97757]/60"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9E978E]">
              <Lock className="h-3.5 w-3.5" /> Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#D97757]/60"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-[#D97070]/30 bg-[#D97070]/10 px-3 py-2 text-xs text-[#D97070]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-4 py-3 text-sm font-bold text-[#181714] shadow-[0_0_24px_-6px_rgba(217,119,87,0.4)] transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in to Dashboard"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#9E978E]">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-[#D97757] hover:underline">
            Create Merchant Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
