import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Send, UploadCloud, Bell, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ArgoLogo from "./ArgoLogo";

export default function MobileActionDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Opportunities", path: "/opportunities", isLogo: true },
    { label: "Campaigns", path: "/campaigns", icon: Send },
    { label: "Data Pipeline", path: "/import", icon: UploadCloud },
    { label: "Dispatches", path: "/notifications", icon: Bell },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 block md:hidden bg-[#181714]/90 backdrop-blur-2xl border-t border-[rgba(220,205,185,0.14)] px-2 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
                isActive
                  ? "text-[#D97757] font-bold"
                  : "text-[#9E978E] hover:text-[#DDD6CD]"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition ${isActive ? "bg-[#D97757]/15 border border-[#D97757]/30 shadow-sm" : ""}`}>
                {item.isLogo ? (
                  <ArgoLogo className="h-4 w-4" />
                ) : (
                  <Icon className={`h-4 w-4 ${isActive ? "text-[#D97757]" : "text-[#9E978E]"}`} />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
