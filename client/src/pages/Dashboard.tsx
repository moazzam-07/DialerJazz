import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Users, Clock, Plus, Wifi, WifiOff, Loader2, FolderOpen, Wallet, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CampaignsTable from '@/components/CampaignsTable';
import { campaignsApi, settingsApi, statsApi, type Campaign } from '@/lib/api';

import CreateCampaignModal from '@/components/CreateCampaignModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ totalCampaigns: 0, totalLeads: 0, totalCallsMade: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isTelnyxConnected, setIsTelnyxConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data } = await campaignsApi.list();
      setCampaigns(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await settingsApi.get();
      setIsTelnyxConnected(!!data?.telnyx_api_key);
    } catch {
      // Settings may not exist yet
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await statsApi.getDashboard();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchSettings();
    fetchStats();
  }, [fetchCampaigns, fetchSettings, fetchStats]);

  // Compute stats from real data
  const totalLeads = stats.totalLeads;
  const totalCalled = stats.totalCallsMade;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <CreateCampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={() => { fetchCampaigns(); fetchStats(); }} 
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back.</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Here's your calling overview for today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-medium transition-colors",
            isTelnyxConnected 
              ? 'bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300' 
              : 'bg-white dark:bg-[#0F0F12] border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400'
          )}>
            {isTelnyxConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isTelnyxConnected ? 'Telnyx Connected' : 'Telnyx Offline'}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "flex items-center gap-2",
              "py-2 px-4 rounded-lg",
              "text-sm font-medium",
              "bg-zinc-900 dark:bg-zinc-50",
              "text-zinc-50 dark:text-zinc-900",
              "hover:bg-zinc-800 dark:hover:bg-zinc-200",
              "shadow-sm hover:shadow",
              "transition-all duration-200"
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls Overview Card */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Calling Stats
          </h2>
          <div className={cn(
            "w-full",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "rounded-xl shadow-sm backdrop-blur-xl",
          )}>
            {/* Total Balance Section */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Total Calls Made</p>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totalCalled}</h1>
            </div>

            {/* Stats List */}
            <div className="p-3">
              <div className="space-y-1">
                {[
                  { icon: Phone, label: 'Campaigns Total', value: String(stats.totalCampaigns), type: 'campaigns' as const },
                  { icon: Users, label: 'CRM Leads', value: String(totalLeads), type: 'leads' as const },
                  { icon: Clock, label: 'Active Campaigns', value: String(activeCampaigns), type: 'active' as const },
                  { icon: CreditCard, label: 'Completion Rate', value: totalLeads > 0 ? `${Math.round((totalCalled / totalLeads) * 100)}%` : '0%', type: 'completion' as const },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={cn(
                      "group flex items-center justify-between",
                      "p-2 rounded-lg",
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                      "transition-all duration-200",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", {
                        "bg-blue-100 dark:bg-blue-900/30": stat.type === 'campaigns',
                        "bg-emerald-100 dark:bg-emerald-900/30": stat.type === 'leads',
                        "bg-purple-100 dark:bg-purple-900/30": stat.type === 'active',
                        "bg-amber-100 dark:bg-amber-900/30": stat.type === 'completion',
                      })}>
                        <stat.icon className={cn("w-3.5 h-3.5", {
                          "text-blue-600 dark:text-blue-400": stat.type === 'campaigns',
                          "text-emerald-600 dark:text-emerald-400": stat.type === 'leads',
                          "text-purple-600 dark:text-purple-400": stat.type === 'active',
                          "text-amber-600 dark:text-amber-400": stat.type === 'completion',
                        })} />
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{stat.label}</h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Campaigns Card */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Quick Actions
          </h2>
          <div className={cn(
            "w-full",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "rounded-xl shadow-sm backdrop-blur-xl",
            "p-4 space-y-3",
          )}>
            <button 
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                "transition-all duration-200",
                "text-left"
              )}
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Create Campaign</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Start a new calling campaign</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/dialer')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                "transition-all duration-200",
                "text-left"
              )}
            >
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Manual Dialer</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Make an ad-hoc call</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/leads')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                "transition-all duration-200",
                "text-left"
              )}
            >
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">View All Leads</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Browse and manage your CRM</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/connectors')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                "transition-all duration-200",
                "text-left"
              )}
            >
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Wifi className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Connectors</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure Telnyx & integrations</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col items-start justify-start border border-gray-200 dark:border-[#1F1F23]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          Campaigns
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 w-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center w-full">
            <FolderOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">Create your first campaign to start importing leads and making calls.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "flex items-center gap-2",
                "py-2.5 px-5 rounded-lg",
                "text-sm font-medium",
                "bg-zinc-900 dark:bg-zinc-50",
                "text-zinc-50 dark:text-zinc-900",
                "hover:bg-zinc-800 dark:hover:bg-zinc-200",
                "shadow-sm hover:shadow",
                "transition-all duration-200"
              )}
            >
              <Plus className="h-4 w-4" /> Create Your First Campaign
            </button>
          </div>
        ) : (
          <CampaignsTable campaigns={campaigns} />
        )}
      </div>
    </div>
  );
}
