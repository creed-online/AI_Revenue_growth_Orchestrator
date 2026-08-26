import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Database, Upload, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { merchant } = useAuth();
  const [choice, setChoice] = useState(null); // 'demo' | 'import'

  const handleContinue = () => {
    if (choice === "demo") {
      localStorage.setItem("argo_demo_mode", "true");
      navigate("/dashboard");
    } else {
      navigate("/import-data");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.55)]">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Welcome, {merchant?.businessName}!</h1>
          <p className="mt-2 text-ink-muted">Choose how you'd like to start</p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => setChoice("demo")}
            className={`relative p-6 rounded-2xl border-2 text-left transition ${choice === "demo" ? "border-mint bg-mint/10" : "border-ink-border hover:border-mint/30"}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-signal/20 text-amber-signal">
                <Database className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white">Explore Demo Data</h3>
                <p className="text-sm text-ink-muted">Try the platform with Demo Fitness Store's pre-loaded data</p>
              </div>
            </div>
            {choice === "demo" && (
              <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-mint text-ink">
                <span className="text-xs">✓</span>
              </div>
            )}
          </button>

          <button
            onClick={() => setChoice("import")}
            className={`relative p-6 rounded-2xl border-2 text-left transition ${choice === "import" ? "border-mint bg-mint/10" : "border-ink-border hover:border-mint/30"}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint/20 text-mint">
                <Upload className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white">Import My Own Data</h3>
                <p className="text-sm text-ink-muted">Upload your customers, products, and orders via CSV</p>
              </div>
            </div>
            {choice === "import" && (
              <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-mint text-ink">
                <span className="text-xs">✓</span>
              </div>
            )}
          </button>
        </div>

        <button
          onClick={handleContinue}
          disabled={!choice}
          className="mt-6 w-full bg-gradient-to-r from-mint to-mint-deep text-ink font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}