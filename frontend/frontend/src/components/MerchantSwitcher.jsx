import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Building2,
  ChevronDown,
  UploadCloud,
  UserPlus,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function MerchantSwitcher() {
  const { merchant, merchantId, setAuth, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const isDemoMode = !isAuthenticated || merchantId === 1 || localStorage.getItem("argo_demo_mode") === "true";
  const customMerchant = isAuthenticated && merchant?.id !== 1 ? merchant : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchToDemo = async () => {
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
        setOpen(false);
        navigate("/");
      }
    } catch (err) {
      console.error("Failed to switch to demo:", err);
    }
  };

  const handleSwitchToCustom = async (targetId) => {
    try {
      const token = localStorage.getItem("argo_token");
      const res = await fetch("/api/auth/switch-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetMerchantId: targetId }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("argo_token", data.token);
        localStorage.setItem("argo_merchant", JSON.stringify(data.merchant));
        localStorage.removeItem("argo_demo_mode");
        setAuth(data.token, data.merchant);
        setOpen(false);
        navigate("/");
      }
    } catch (err) {
      console.error("Failed to switch merchant:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition ${
          isDemoMode
            ? "border-amber-signal/30 bg-amber-signal/10 hover:border-amber-signal/50 text-amber-signal"
            : "border-mint/30 bg-mint/10 hover:border-mint/50 text-mint"
        }`}
      >
        {isDemoMode ? (
          <>
            <Database className="h-3.5 w-3.5 text-amber-signal" />
            <span className="font-semibold">Demo Database</span>
          </>
        ) : (
          <>
            <Building2 className="h-3.5 w-3.5 text-mint" />
            <span className="font-semibold truncate max-w-[130px]">
              {merchant?.businessName || "My Database"}
            </span>
          </>
        )}
        <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl border border-ink-border bg-ink-elevated/95 p-2.5 shadow-2xl backdrop-blur-2xl z-50"
          >
            {/* Header */}
            <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              <span>Active Database Workspace</span>
              <span className="text-[9px] font-mono text-ink-soft">PostgreSQL</span>
            </div>

            {/* Option 1: Demo Database */}
            <button
              type="button"
              onClick={handleSwitchToDemo}
              className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition ${
                isDemoMode ? "bg-amber-signal/10 border border-amber-signal/30" : "hover:bg-white/5"
              }`}
            >
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isDemoMode ? "bg-amber-signal/20 text-amber-signal" : "bg-white/5 text-ink-muted"
              }`}>
                <Database className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${isDemoMode ? "text-amber-signal" : "text-white"}`}>
                    Demo Fitness Store
                  </p>
                  {isDemoMode && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-signal">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink-muted leading-tight mt-0.5">
                  Pre-loaded supplement orders, customers & cycles
                </p>
              </div>
            </button>

            {/* Option 2: Custom Registered Merchant Database */}
            {customMerchant && (
              <button
                type="button"
                onClick={() => handleSwitchToCustom(customMerchant.id)}
                className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition mt-1.5 ${
                  !isDemoMode ? "bg-mint/10 border border-mint/30" : "hover:bg-white/5"
                }`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  !isDemoMode ? "bg-mint/20 text-mint" : "bg-white/5 text-ink-muted"
                }`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold truncate ${!isDemoMode ? "text-mint" : "text-white"}`}>
                      {customMerchant.businessName}
                    </p>
                    {!isDemoMode && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-mint">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-ink-muted leading-tight mt-0.5">
                    Your private merchant catalog & customer data
                  </p>
                </div>
              </button>
            )}

            {/* Divider */}
            <div className="my-2 border-t border-ink-border/80" />

            {/* Action 1: Import Your Own Database */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/import");
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-mint hover:bg-mint/10 transition group"
            >
              <UploadCloud className="h-4 w-4 text-mint group-hover:scale-110 transition-transform" />
              <span>Import Your Own Database / CSV</span>
            </button>

            {/* Action 2: Create Account (if not registered) */}
            {!customMerchant && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/register");
                }}
                className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-sky hover:bg-sky/10 transition group mt-0.5"
              >
                <UserPlus className="h-4 w-4 text-sky group-hover:scale-110 transition-transform" />
                <span>Create Merchant Account</span>
              </button>
            )}

            {/* Footer */}
            <div className="mt-2 rounded-lg bg-ink/40 p-2 text-center text-[10px] text-ink-muted">
              {isDemoMode
                ? "💡 In Demo mode. Import a CSV or create an account to run live campaigns."
                : `Working in ${merchant?.businessName || "your workspace"}.`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}