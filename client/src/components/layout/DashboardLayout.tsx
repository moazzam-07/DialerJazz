import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import HeldCallBubble from '@/components/HeldCallBubble';
import { SessionNavBar } from '@/components/ui/sidebar';
import TopNav from '@/components/ui/top-nav';
import IncomingCallBanner from '@/components/IncomingCallBanner';
import ActiveCallBubble from '@/components/ActiveCallBubble';
import { useTelnyxContext } from '@/contexts/TelnyxContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize Telnyx SIP connection once on layout mount
  const { initConnection, connectionStatus, primaryCall } = useTelnyxContext();

  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      initConnection();
    }
  }, [initConnection, connectionStatus]);

  return (
    <div className="h-screen bg-white dark:bg-[#0F0F12] flex overflow-hidden text-foreground">
      {/* Global call overlays */}
      <IncomingCallOverlay />
      <IncomingCallBanner />
      <HeldCallBubble />
      <ActiveCallBubble />

      {/* Global audio element */}
      {primaryCall?.remoteStream && (
        <audio
          autoPlay
          ref={(el) => {
            if (el && primaryCall?.remoteStream) {
              el.srcObject = primaryCall.remoteStream;
            }
          }}
        />
      )}

      {/* Sidebar */}
      <SessionNavBar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Column */}
      <div className="w-full flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-gray-200 dark:border-[#1F1F23] flex-shrink-0">
          <TopNav />
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-auto p-6 bg-white dark:bg-[#0F0F12]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
