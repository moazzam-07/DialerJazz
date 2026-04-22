import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Users, Clock, Plus, Wifi, WifiOff, Loader2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import CampaignCard from '@/components/CampaignCard';
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <CreateCampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={() => { fetchCampaigns(); fetchStats(); }} 
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Welcome back.</h1>
          <p className="text-zinc-400">Here's your calling overview for today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-medium transition-colors ${
            isTelnyxConnected 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {isTelnyxConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isTelnyxConnected ? 'Telnyx Connected' : 'Telnyx Offline'}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-full font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {[
          { icon: Phone, label: 'Total Calls', value: String(totalCalled), trend: `${stats.totalCampaigns} campaigns total`, trendUp: totalCalled > 0 },
          { icon: Users, label: 'CRM Leads', value: String(totalLeads), trend: `${activeCampaigns} active campaigns`, trendUp: totalLeads > 0 },
          { icon: Clock, label: 'Completion', value: totalLeads > 0 ? `${Math.round((totalCalled / totalLeads) * 100)}%` : '0%', trend: `${totalCalled} of ${totalLeads} leads called`, trendUp: totalCalled > 0 },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
              <stat.icon className="w-16 h-16 text-white" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-white/5 text-zinc-400">
                <stat.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">{stat.label}</h3>
            </div>
            <div className="mb-2">
              <span className="text-4xl font-bold text-white tracking-tight">{stat.value}</span>
            </div>
            <div>
              <span className={`text-sm ${stat.trendUp ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Campaigns</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">No campaigns yet</h3>
            <p className="text-zinc-500 mb-6 max-w-sm">Create your first campaign to start importing leads and making calls.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.map(campaign => (
              <CampaignCard 
                key={campaign.id} 
                campaign={campaign} 
                onStartDialing={(id) => navigate(`/campaigns/${id}/dial`)}
                onUpdated={() => { fetchCampaigns(); fetchStats(); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
