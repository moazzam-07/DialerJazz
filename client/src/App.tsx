import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CampaignsPage from './pages/CampaignsPage';
import LeadsPage from './pages/LeadsPage';
import SettingsPage from './pages/SettingsPage';
import ConnectorsPage from './pages/ConnectorsPage';
import CampaignDialerPage from './pages/CampaignDialerPage';
import ManualDialerPage from './pages/ManualDialerPage';
import CallLogsPage from './pages/CallLogsPage';

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Toaster theme="dark" position="bottom-right" />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/campaigns" element={<ProtectedPage><CampaignsPage /></ProtectedPage>} />
        <Route path="/campaigns/:id/dial" element={<ProtectedPage><CampaignDialerPage /></ProtectedPage>} />
        <Route path="/leads" element={<ProtectedPage><LeadsPage /></ProtectedPage>} />
        <Route path="/call-logs" element={<ProtectedPage><CallLogsPage /></ProtectedPage>} />
        <Route path="/connectors" element={<ProtectedPage><ConnectorsPage /></ProtectedPage>} />
        <Route path="/dialer" element={<ProtectedPage><ManualDialerPage /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
      </Routes>
    </div>
  );
}

export default App;
