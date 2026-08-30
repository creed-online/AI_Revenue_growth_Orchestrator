import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="skeleton h-10 w-48 rounded-xl" />
      </div>
    );
  }

  // Seamless exploration: allows importing data, reviewing opportunities, and demo campaigns without forced login redirects
  return <Outlet />;
}
