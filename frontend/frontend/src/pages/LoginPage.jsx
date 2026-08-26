import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Sparkles, Database } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, bootstrapping, setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("demo@rakshfit.com");
  const [password, setPassword] = useState("demo1234");
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      
      if (demoMode) {
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
          setAuth(switchData.token, switchData.merchant);
        }
        navigate("/dashboard");
      } else {
        navigate(location.state?.from || "/", { replace: true });
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not sign in. Check email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="panel w-full max-w-md rounded-2xl p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Merchant login</h1>
            <p className="text-xs text-ink-muted">Scoped access to your growth dashboard</p>
          </div>
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
              required
              className="w-full rounded-xl border border-ink-border bg-ink/50 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-mint/40"
              autoComplete="current-password"
            />
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-ink-border bg-ink-elevated/50 cursor-pointer transition hover:border-mint/30">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="w-4 h-4 accent-mint rounded border-ink-border"
            />
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Explore Demo Data</p>
              <p className="text-xs text-ink-muted">Access pre-loaded demo environment (Demo Fitness Store)</p>
            </div>
            <Database className="h-5 w-5 text-amber-signal" />
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-signal/30 bg-rose-signal/10 px-3 py-2 text-xs text-rose-signal">
              {error}
            </p>
          ) : (
            <p className="rounded-lg border border-ink-border bg-ink/40 px-3 py-2 text-[11px] text-ink-muted">
              Demo: <span className="text-ink-soft">demo@rakshfit.com</span> /{" "}
              <span className="text-ink-soft">demo1234</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
