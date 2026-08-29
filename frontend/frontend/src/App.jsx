import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingPage from "./pages/OnboardingPage";
import ImportDataPage from "./pages/ImportDataPage";
import DashboardPage from "./pages/DashboardPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignResultsPage from "./pages/CampaignResultsPage";
import AuditTrailPage from "./pages/AuditTrailPage";
import NotificationPreferencesPage from "./pages/NotificationPreferencesPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Public dashboard - accessible to unauthenticated users */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
          
          {/* Protected routes - require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/import-data" element={<ImportDataPage />} />
              {/* /import alias for convenience */}
              <Route path="/import" element={<ImportDataPage />} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/opportunities/:productId" element={<OpportunityDetailPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:campaignId/results" element={<CampaignResultsPage />} />
              <Route path="/campaigns/:campaignId/audit" element={<AuditTrailPage />} />
              <Route path="/notifications" element={<NotificationPreferencesPage />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
