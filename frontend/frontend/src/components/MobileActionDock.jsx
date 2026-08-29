import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Sparkles, Send, UploadCloud, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function MobileActionDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Opportunities", path: "/opportunities", icon: Sparkles },
    { label: "Campaigns", path: "/campaigns", icon: Send },
    { label: "Import CSV", path: "/import", icon: UploadCloud },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 block sm:hidden bg-[#070e1c]/90 backdrop-blur-2xl border-t border-ink-border/80 px-2 py-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive
                  ? "text-mint font-bold"
                  : "text-ink-muted hover:text-white"
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? "bg-mint/15" : ""}`}>
                <Icon className={`h-4 w-4 ${isActive ? "text-mint" : "text-ink-muted"}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

