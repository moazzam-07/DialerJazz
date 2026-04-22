import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';
import { TelnyxProvider } from './contexts/TelnyxContext';
import { TwilioProvider } from './contexts/TwilioContext';
import { VoiceContextProvider } from './contexts/VoiceContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CampaignsPage from './pages/CampaignsPage';
import LeadsPage from './pages/LeadsPage';
import SettingsPage from './pages/SettingsPage';
import ConnectorsPage from './pages/ConnectorsPage';
import CampaignDialerPage from './pages/CampaignDialerPage';
import CampaignManagePage from './pages/CampaignManagePage';
import ManualDialerPage from './pages/ManualDialerPage';
import CallLogsPage from './pages/CallLogsPage';

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-foreground/20 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

/**
 * ProtectedLayout — a layout route that wraps ALL authenticated pages.
 *
 * TelnyxProvider and DashboardLayout live here so the SIP WebSocket
 * connection persists across route changes (Dashboard → Campaigns → Dialer).
 * Without this, every navigation would disconnect and reconnect the socket.
 */
function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-foreground/20 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <TelnyxProvider>
      <TwilioProvider>
        <VoiceContextProvider>
          <DashboardLayout>
            <Outlet />
          </DashboardLayout>
        </VoiceContextProvider>
      </TwilioProvider>
    </TelnyxProvider>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Toaster theme="dark" position="bottom-right" />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* All authenticated routes share a single TelnyxProvider + DashboardLayout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id/manage" element={<CampaignManagePage />} />
          <Route path="/campaigns/:id/dial" element={<CampaignDialerPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/call-logs" element={<CallLogsPage />} />
          <Route path="/connectors" element={<ConnectorsPage />} />
          <Route path="/dialer" element={<ManualDialerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
