import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MerchantSwitcher from "./MerchantSwitcher";
import ArgoLogo from "./ArgoLogo";
import { fetchIntegrations } from "../api/client";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/notifications", label: "Dispatches" },
  { to: "/import", label: "Data Pipeline" },
];

export default function Navbar() {
  const { merchant, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [integrationStatus, setIntegrationStatus] = useState({
    isSandboxMode: true,
    isVerified: false,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadStatus() {
      try {
        const data = await fetchIntegrations();
        if (isMounted && data) {
          const liveChannels = !data.isSandboxMode && (data.whatsapp?.isVerified || data.smtp?.isVerified || data.razorpay?.isVerified);
          setIntegrationStatus({
            isSandboxMode: data.isSandboxMode,
            isVerified: liveChannels,
          });
        }
      } catch {
        // Keep default sandbox fallback
      }
    }
    loadStatus();
    return () => { isMounted = false; };
  }, []);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-[rgba(220,205,185,0.12)] bg-[#181714]/85 backdrop-blur-2xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand Identity with Official Logo */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex min-w-0 items-center gap-3 text-left shrink-0 group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#201E1A] border border-[rgba(220,205,185,0.18)] shadow-[0_0_20px_-4px_rgba(217,119,87,0.35)] overflow-hidden transition-transform group-hover:scale-105 p-1">
            <ArgoLogo className="h-7 w-7" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-2">
              <p className="font-display text-[15px] font-extrabold leading-tight tracking-tight text-[#F5EFEB]">
                ARGOES
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D97757]/15 px-2 py-0.5 text-[10px] font-bold text-[#D97757] border border-[#D97757]/30">
                <ArgoLogo className="h-2.5 w-2.5" />
                D2C Growth
              </span>
            </div>
            <p className="truncate text-[11px] font-medium text-[#9E978E] leading-tight">
              {merchant?.businessName || "RakshFit Nutrition"}
            </p>
          </div>
        </button>

        {/* Center: Desktop Nav with Terracotta Active Styling */}
        <nav className="hidden items-center gap-1 rounded-xl border border-[rgba(220,205,185,0.12)] bg-[#201E1A]/80 p-1 md:flex shadow-inner">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#D97757] text-[#181714] font-bold shadow-[0_2px_10px_rgba(217,119,87,0.35)]"
                    : "text-[#9E978E] hover:bg-white/5 hover:text-[#DDD6CD]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Side: Status Pill + Switcher + Auth */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Channel Health Pill */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border ${
              integrationStatus.isVerified
                ? "bg-[#7C9A82]/15 text-[#7C9A82] border-[#7C9A82]/30"
                : "bg-[#E5A93C]/12 text-[#E5A93C] border-[#E5A93C]/25"
            }`}
            title={integrationStatus.isVerified ? "All Merchant Channels Active" : "Operating in Safe Sandbox Simulation Mode"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${integrationStatus.isVerified ? "bg-[#7C9A82] animate-pulse" : "bg-[#E5A93C]"}`} />
            <span>{integrationStatus.isVerified ? "Live Channels" : "Sandbox Mode"}</span>
          </div>

          <MerchantSwitcher />

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                logout();
                localStorage.removeItem("argo_demo_mode");
                navigate("/login");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(220,205,185,0.14)] bg-[#201E1A] px-3 py-1.5 text-xs font-semibold text-[#9E978E] transition hover:border-[#D97070]/40 hover:text-[#D97070]"
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
                className="inline-flex items-center gap-1 rounded-xl border border-[rgba(220,205,185,0.14)] bg-[#201E1A] px-3 py-1.5 text-xs font-semibold text-[#DDD6CD] transition hover:border-[#D97757]/40 hover:text-[#D97757]"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log in</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-3 py-1.5 text-xs font-bold text-[#181714] transition hover:brightness-110 shadow-[0_2px_10px_rgba(217,119,87,0.3)]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      <div className="flex gap-1 overflow-x-auto border-t border-[rgba(220,205,185,0.08)] px-4 py-2 md:hidden bg-[#181714]/95">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#D97757] text-[#181714] font-bold"
                  : "text-[#9E978E] hover:text-[#DDD6CD]"
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
