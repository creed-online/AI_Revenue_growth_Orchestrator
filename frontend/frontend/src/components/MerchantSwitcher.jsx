import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  FileSpreadsheet,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function MerchantSwitcher() {
  const { merchant, merchantId, setAuth, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleUploadAnotherDatabase = () => {
    setOpen(false);
    if (location.pathname === "/import") {
      // Dispatch custom event to reset upload form if already on /import
      window.dispatchEvent(new CustomEvent("argo-reset-import"));
    } else {
      navigate("/import");
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
            ? "border-[#E5A93C]/30 bg-[#E5A93C]/10 hover:border-[#E5A93C]/50 text-[#E5A93C]"
            : "border-[#7C9A82]/30 bg-[#7C9A82]/10 hover:border-[#7C9A82]/50 text-[#7C9A82]"
        }`}
      >
        {isDemoMode ? (
          <>
            <Database className="h-3.5 w-3.5 text-[#E5A93C]" />
            <span className="font-semibold">Demo Database</span>
          </>
        ) : (
          <>
            <Building2 className="h-3.5 w-3.5 text-[#7C9A82]" />
            <span className="font-semibold truncate max-w-[130px]">
              {merchant?.businessName || "Custom Database"}
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
            className="absolute right-0 mt-2 w-80 rounded-2xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A] p-3 shadow-2xl backdrop-blur-2xl z-50"
          >
            {/* Header */}
            <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#9E978E]">
              <span>Active Database Workspace</span>
              <span className="text-[9px] font-mono text-[#7C9A82] bg-[#7C9A82]/10 px-2 py-0.5 rounded-full border border-[#7C9A82]/30">PostgreSQL</span>
            </div>

            {/* Option 1: Demo Database */}
            <button
              type="button"
              onClick={handleSwitchToDemo}
              className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition ${
                isDemoMode ? "bg-[#E5A93C]/10 border border-[#E5A93C]/30" : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isDemoMode ? "bg-[#E5A93C]/20 text-[#E5A93C]" : "bg-white/5 text-[#9E978E]"
              }`}>
                <Database className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${isDemoMode ? "text-[#E5A93C]" : "text-white"}`}>
                    Demo Fitness Store
                  </p>
                  {isDemoMode && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#E5A93C]">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#9E978E] leading-tight mt-0.5">
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
                  !isDemoMode ? "bg-[#7C9A82]/10 border border-[#7C9A82]/30" : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  !isDemoMode ? "bg-[#7C9A82]/20 text-[#7C9A82]" : "bg-white/5 text-[#9E978E]"
                }`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold truncate ${!isDemoMode ? "text-[#7C9A82]" : "text-white"}`}>
                      {customMerchant.businessName}
                    </p>
                    {!isDemoMode && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#7C9A82]">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#9E978E] leading-tight mt-0.5">
                    Your private merchant catalog & customer data
                  </p>
                </div>
              </button>
            )}

            {/* Divider */}
            <div className="my-2 border-t border-[rgba(220,205,185,0.12)]" />

            {/* Primary Action: Upload Another Database / CSV */}
            <button
              type="button"
              onClick={handleUploadAnotherDatabase}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#D97757] bg-[#D97757]/10 hover:bg-[#D97757]/20 border border-[#D97757]/30 transition group"
            >
              <UploadCloud className="h-4 w-4 text-[#D97757] group-hover:scale-110 transition-transform" />
              <span>Upload Another Database / CSV</span>
            </button>

            {/* Optional Secondary Action: Create Merchant Account */}
            {!customMerchant && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/register");
                }}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[#DDD6CD] hover:bg-white/5 transition group mt-1"
              >
                <UserPlus className="h-3.5 w-3.5 text-[#9E978E] group-hover:text-white transition" />
                <span>Create Merchant Account (Optional)</span>
              </button>
            )}

            {/* Footer Notice */}
            <div className="mt-2 rounded-xl bg-[#181714] p-2 text-center text-[10px] text-[#9E978E] border border-[rgba(220,205,185,0.08)]">
              {isDemoMode
                ? "💡 You can upload multiple CSV databases without logging in."
                : `Working in ${merchant?.businessName || "your workspace"}.`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}