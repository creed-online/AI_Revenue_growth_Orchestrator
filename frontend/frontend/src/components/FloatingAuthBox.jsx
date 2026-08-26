import { motion } from "framer-motion";
import { Sparkles, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FloatingAuthBox() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 right-4 z-40 w-72 panel rounded-2xl border border-ink-border/80 bg-ink/95 backdrop-blur-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_20px_-4px_rgba(45,212,168,0.5)]">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-white">Welcome to ARGO</h3>
          <p className="text-[11px] text-ink-muted">AI Revenue Growth Orchestrator</p>
        </div>
      </div>

      <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
        Explore the demo environment with pre-loaded data, or create your own account to import your business data and run AI-powered growth campaigns.
      </p>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-border bg-ink-elevated/50 px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-mint/40 hover:bg-mint/10 hover:text-mint"
        >
          <LogIn className="h-4 w-4" />
          <span>Log in</span>
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/register")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-3 py-2.5 text-sm font-bold text-ink transition hover:brightness-110"
        >
          <UserPlus className="h-4 w-4" />
          <span>Create Account</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 text-center text-[10px] text-ink-muted">
        Demo credentials: <code className="text-ink-soft">demo@rakshfit.com</code> / <code className="text-ink-soft">demo1234</code>
      </p>
    </motion.div>
  );
}