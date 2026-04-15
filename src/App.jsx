import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ui/Toast";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/layout/ScrollToTop";
import AdminLayout from "./components/layout/AdminLayout";
import { LayoutProvider } from "./contexts/LayoutContext";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("./pages/public/Home"));
const Login = lazy(() => import("./pages/public/Login"));
const Register = lazy(() => import("./pages/public/Register"));
const VerifyAccreditation = lazy(() => import("./pages/public/VerifyAccreditation"));

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Events = lazy(() => import("./pages/admin/Events"));
const Accreditations = lazy(() => import("./pages/admin/Accreditations"));
const Zones = lazy(() => import("./pages/admin/Zones"));
const Users = lazy(() => import("./pages/admin/Users"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));
const QRSystem = lazy(() => import("./pages/admin/QRSystem"));
const BroadcastHistory = lazy(() => import("./pages/admin/BroadcastHistory"));

const PageLoader = () => (
  <div id="app_pageloader" className="flex items-center justify-center min-h-screen bg-swim-deep relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary-950/20 to-ocean-950/20" />
    <div className="relative z-10 flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-3xl bg-primary-500/10 border border-primary-500/20 animate-pulse flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
        <div className="absolute -inset-4 bg-primary-500/20 blur-3xl -z-10 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-black text-white uppercase tracking-[0.4em] animate-pulse">
          Apex <span className="text-primary-500">Accreditation</span>
        </p>
        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="w-full h-full bg-primary-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <LayoutProvider>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register/:slug" element={<Register />} />
              <Route path="/verify/:id" element={<VerifyAccreditation />} />
              <Route path="/accreditation/:id" element={<VerifyAccreditation />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="events/:id?/:subpage?" element={<Events />} />
                <Route path="accreditations" element={<Accreditations />} />
                <Route path="zones" element={<Zones />} />
                <Route path="qr-system" element={<QRSystem />} />
                <Route path="broadcasts" element={<BroadcastHistory />} />
                <Route path="users" element={<Users />} />
                <Route path="settings" element={<Settings />} />
                <Route path="audit" element={<AuditLog />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </LayoutProvider>
      </AuthProvider>
      </ToastProvider>
    </Router>
  );
}
