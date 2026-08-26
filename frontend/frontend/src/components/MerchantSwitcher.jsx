import { useAuth } from "../context/AuthContext";
import { Database, Building2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function MerchantSwitcher() {
  const { merchant, merchantId, setAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const isDemo = merchantId === 1;
  const isDemoMode = localStorage.getItem("argo_demo_mode") === "true";

  const handleSwitch = async (targetId) => {
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
      if (targetId === 1) {
        localStorage.setItem("argo_demo_mode", "true");
      } else {
        localStorage.removeItem("argo_demo_mode");
      }
      setAuth(data.token, data.merchant);
      window.location.reload();
    }
  };

  if (!merchant) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-ink-border bg-ink-elevated/80 px-3 py-1.5 text-[11px] font-medium transition hover:border-mint/40"
      >
        {isDemoMode ? (
          <>
            <Database className="h-3.5 w-3.5 text-amber-signal" />
            <span className="text-amber-signal font-semibold">Demo Mode</span>
          </>
        ) : (
          <>
            <Building2 className="h-3.5 w-3.5 text-mint" />
            <span className="text-mint font-semibold">{merchant.businessName}</span>
          </>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-ink-muted ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 mt-2 w-56 panel rounded-xl border border-ink-border bg-ink-elevated/95 backdrop-blur-xl p-2 shadow-lg z-50"
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Switch Environment
          </div>
          <button
            onClick={() => { handleSwitch(1); setOpen(false); }}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isDemoMode ? "bg-mint/10 text-mint" : "text-ink-soft hover:bg-white/5"}`}
          >
            <Database className="h-4 w-4" />
            <span>Demo Fitness Store</span>
            {isDemoMode && <span className="ml-auto text-[10px] text-mint">✓ Active</span>}
          </button>
          {!isDemoMode && merchant.id !== 1 && (
            <button
              onClick={() => { handleSwitch(merchant.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${!isDemoMode ? "bg-mint/10 text-mint" : "text-ink-soft hover:bg-white/5"}`}
            >
              <Building2 className="h-4 w-4" />
              <span>{merchant.businessName}</span>
              {!isDemoMode && <span className="ml-auto text-[10px] text-mint">✓ Active</span>}
            </button>
          )}
          <div className="mt-2 pt-2 border-t border-ink-border px-2">
            <p className="text-[10px] text-ink-muted text-center">
              {isDemoMode
                ? "Viewing pre-loaded demo data. Changes are not saved."
                : "Working with your business data."}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}