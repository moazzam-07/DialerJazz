import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  PhoneCall,
  Headphones,
  Users,
  Settings,
  Plug,
  LogOut,
  Menu,
  Clock,
} from 'lucide-react';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import IncomingCallBanner from '@/components/IncomingCallBanner';
import HeldCallBubble from '@/components/HeldCallBubble';
import ActiveCallBubble from '@/components/ActiveCallBubble';
import { useTelnyxContext } from '@/contexts/TelnyxContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Campaigns', icon: PhoneCall, href: '/campaigns' },
  { label: 'Dialer', icon: Headphones, href: '/dialer' },
  { label: 'Leads', icon: Users, href: '/leads' },
  { label: 'Call Logs', icon: Clock, href: '/call-logs' },
  { label: 'Connectors', icon: Plug, href: '/connectors' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Telnyx SIP connection once on layout mount
  const { initConnection, connectionStatus } = useTelnyxContext();
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      initConnection();
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Global audio playback — keeps call audio alive across page navigation
  const { primaryCall } = useTelnyxContext();

  return (
    <div className="min-h-screen bg-[#0F0F11] flex overflow-hidden text-white">
      {/* Global call overlays */}
      <IncomingCallOverlay />
      <IncomingCallBanner />
      <HeldCallBubble />
      <ActiveCallBubble />

      {/* Global audio element — lives outside any page so stream persists */}
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
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1A1A1E] border-r border-white/5 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xl">
              J
            </div>
            <span className="text-xl font-semibold tracking-tight">Jazz Caller</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 shrink-0">
              <span className="text-sm font-medium text-zinc-300">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.user_metadata?.first_name || 'Agent'}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F0F11]">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 border-b border-white/5 bg-[#1A1A1E]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
              J
            </div>
            <span className="font-semibold">Jazz Caller</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-2 text-zinc-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
