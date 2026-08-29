import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Sparkles,
  Send,
  UploadCloud,
  Bell,
  Database,
  Shield,
  ArrowRight,
  Command,
  X,
  Building2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function CommandPalette({ fullWidth = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  // Keyboard shortcut listener (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const allActions = useMemo(() => [
    {
      id: "nav-dashboard",
      title: "Dashboard Overview",
      subtitle: "View high-level revenue metrics & 3D retention galaxy",
      icon: LayoutDashboard,
      category: "Navigation",
      action: () => navigate("/"),
    },
    {
      id: "nav-opportunities",
      title: "Review Opportunities",
      subtitle: "Inspect active replenishment windows & margin simulations",
      icon: Sparkles,
      category: "Navigation",
      action: () => navigate("/opportunities"),
    },
    {
      id: "nav-campaigns",
      title: "Campaign Management",
      subtitle: "Track live campaigns, audit logs & conversion results",
      icon: Send,
      category: "Navigation",
      action: () => navigate("/campaigns"),
    },
    {
      id: "nav-import",
      title: "Import Custom CSV Dataset",
      subtitle: "Upload orders or customer data into AI schema matcher",
      icon: UploadCloud,
      category: "Actions",
      action: () => navigate("/import"),
    },
    {
      id: "nav-prefs",
      title: "Notification Preferences",
      subtitle: "Configure merchant approval webhooks and email digests",
      icon: Bell,
      category: "Settings",
      action: () => navigate("/notifications"),
    },
    {
      id: "action-demo",
      title: "Switch to Demo Sandbox Mode",
      subtitle: "Instant 1-click access to sample fitness store data",
      icon: Database,
      category: "Workspace",
      action: async () => {
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
          }
        } catch (err) {
          console.error(err);
        }
      },
    },
    {
      id: "action-register",
      title: "Create Merchant Account",
      subtitle: "Register an isolated production business workspace",
      icon: Building2,
      category: "Workspace",
      action: () => navigate("/register"),
    },
  ], [navigate, setAuth]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allActions;
    const q = query.toLowerCase();
    return allActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [allActions, query]);

  const handleKeyDownInMenu = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Global Open Button (Navbar helper) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${
          fullWidth
            ? "w-full flex"
            : "hidden md:inline-flex"
        } items-center gap-2.5 rounded-xl border border-ink-border bg-ink-elevated/80 px-3.5 py-2 text-xs text-ink-muted hover:text-white hover:border-mint/30 transition shadow-sm`}
        title="Open Command Palette (Cmd + K)"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left text-[12px] font-medium">Search pages, actions, commands...</span>
        <kbd className="rounded border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 shrink-0">
          ⌘K
        </kbd>
      </button>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-xl rounded-3xl border border-ink-border bg-[#080e1b] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Search Bar Input */}
              <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
                <Search className="h-4 w-4 text-mint shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDownInMenu}
                  placeholder="Type a command or search ARGO..."
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="p-2 overflow-y-auto space-y-1 max-h-80">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No results found for "{query}".
                  </div>
                ) : (
                  filtered.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = selectedIndex === idx;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          item.action();
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition ${
                          isSelected
                            ? "bg-mint/15 border border-mint/40 text-white"
                            : "text-slate-300 hover:bg-slate-900 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                              isSelected
                                ? "bg-mint text-ink font-bold"
                                : "bg-slate-900 text-slate-400"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            <p className="text-[11px] text-slate-400 leading-tight">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {item.category}
                          </span>
                          <ArrowRight
                            className={`h-3.5 w-3.5 transition-transform ${
                              isSelected ? "text-mint translate-x-0.5" : "text-transparent"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-[#050914] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Use <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[9px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[9px]">↓</kbd> to navigate</span>
                <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[9px]">↵</kbd> to select</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

