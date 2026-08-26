import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, LogOut, ShieldCheck, Sparkles, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MerchantSwitcher from "./MerchantSwitcher";

const navItems = [
  { to: "/", label: "Overview", end: true },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/campaigns", label: "Campaigns" },
];

export default function Navbar() {
  const { merchant, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-ink-border/80 bg-ink/75 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_24px_-6px_rgba(45,212,168,0.55)]">
            <Sparkles className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold leading-tight tracking-tight text-white sm:text-base">
              AI Revenue Growth{" "}
              <span className="text-mint-gradient">Orchestrator</span>
            </p>
            <p className="truncate text-[11px] font-medium text-ink-muted">
              {merchant?.businessName || "Merchant growth operator"}
            </p>
          </div>
        </button>

        <nav className="hidden items-center gap-1 rounded-xl border border-ink-border bg-ink-elevated/80 p-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-mint/15 text-mint"
                    : "text-ink-muted hover:bg-white/5 hover:text-ink-soft"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <MerchantSwitcher />
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-2 rounded-lg border border-ink-border bg-ink-elevated px-3 py-1.5 text-[11px] text-ink-soft">
              <Activity className="h-3.5 w-3.5 text-sky live-dot" />
              <span>
                Model <strong className="font-semibold text-white">Groq Llama 3.3</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/10 px-3 py-1.5 text-[11px] font-medium text-mint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Policy on
            </div>
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/register");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-border bg-ink-elevated px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted transition hover:border-rose-signal/40 hover:text-rose-signal"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-border bg-ink-elevated px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:border-mint/40 hover:text-mint"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log in</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-mint to-mint-deep px-3 py-1.5 text-[11px] font-semibold text-ink transition hover:brightness-110"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex gap-1 overflow-x-auto border-t border-ink-border/60 px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                isActive ? "bg-mint/15 text-mint" : "text-ink-muted"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </motion.header>
  );
}
