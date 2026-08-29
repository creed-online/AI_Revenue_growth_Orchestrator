import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Sparkles, Database, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
        className="panel w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-ink-border bg-ink-elevated/90 backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.55)]">
            <Sparkles className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Merchant Login</h1>
            <p className="text-xs text-ink-muted">Access your AI revenue growth dashboard</p>
          </div>
        </div>

        {/* 1-Click Instant Demo Sandbox Button */}
        <div className="mb-6 rounded-2xl border border-amber-signal/30 bg-amber-signal/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-signal/20 text-amber-signal">
              <Database className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white">Quick Demo Sandbox</h3>
              <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                Explore with pre-loaded demo orders, customers, and Razorpay test mode.
              </p>
              <button
                type="button"
                onClick={handleDemoAccess}
                disabled={demoLoading}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-signal px-3.5 py-1.5 text-xs font-bold text-ink transition hover:brightness-110 disabled:opacity-60"
              >
                {demoLoading ? "Starting Sandbox..." : "Explore Demo Database →"}
              </button>
            </div>
          </div>
        </div>

        <div className="relative mb-6 flex items-center justify-center">
          <div className="w-full border-t border-ink-border" />
          <span className="absolute bg-[#0f172a] px-3 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            or sign in with credentials
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <Mail className="h-3.5 w-3.5" /> Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. merchant@yourstore.com"
              required
              className="w-full rounded-xl border border-ink-border bg-ink/50 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-mint/40"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <Lock className="h-3.5 w-3.5" /> Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-ink-border bg-ink/50 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-mint/40"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-rose-signal/30 bg-rose-signal/10 px-3 py-2 text-xs text-rose-signal">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-4 py-3 text-sm font-bold text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.4)] transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in to Dashboard"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-mint hover:underline">
            Create Merchant Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
