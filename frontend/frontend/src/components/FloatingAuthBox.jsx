import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, UserPlus, LogIn, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ArgoLogo from "./ArgoLogo";

export default function FloatingAuthBox() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed =
      sessionStorage.getItem("argo_dismissed_auth_box") ||
      localStorage.getItem("argo_dismissed_auth_box");
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("argo_dismissed_auth_box", "true");
    localStorage.setItem("argo_dismissed_auth_box", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block fixed bottom-6 right-6 z-40 w-80 rounded-3xl border border-[rgba(220,205,185,0.2)] bg-[#201E1A]/95 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.75)]"
        >
          {/* Top-Right Cross Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss auth banner"
            title="Dismiss auth banner"
            className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] text-[#9E978E] hover:border-[#D97757] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex items-center gap-3 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D97757] to-[#E5A93C] text-[#181714] shadow-[0_0_20px_-4px_rgba(217,119,87,0.5)] p-1.5">
              <ArgoLogo className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm font-bold text-white tracking-tight">ARGOES Intelligence</h3>
              <p className="text-[11px] text-[#9E978E]">Revenue Growth Engine</p>
            </div>
          </div>

          <p className="mb-4 text-[12px] leading-relaxed text-[#DDD6CD]">
            Explore pre-loaded demo intelligence, or log in to connect your live store data, WhatsApp API, and Razorpay keys.
          </p>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#272520] px-3 py-2 text-xs font-semibold text-[#DDD6CD] transition hover:border-[#D97757]/50 hover:bg-[#D97757]/10 hover:text-[#D97757]"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Log in</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-[#9E978E]" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-3 py-2 text-xs font-bold text-[#181714] transition hover:brightness-110 shadow-[0_2px_12px_rgba(217,119,87,0.3)]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create Free Account</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto" />
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] text-[#9E978E]">
            Demo credentials: <code className="text-[#DDD6CD] font-mono">demo@rakshfit.com</code> / <code className="text-[#DDD6CD] font-mono">demo1234</code>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}