import { useState, useEffect, useCallback } from 'react';
import { PhoneCall, Search, Loader2, Clock, User, Building2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { callsApi, campaignsApi, type CallLog, type Campaign } from '@/lib/api';

const DISPOSITION_COLORS: Record<string, string> = {
  answered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  interested: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  follow_up: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  not_interested: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  no_answer: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  voicemail: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  busy: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  dnc: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function CallLogsPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [logsRes, campaignsRes] = await Promise.all([
        callsApi.list({ 
          campaign_id: selectedCampaign || undefined, 
          limit: 200 
        }),
        campaignsApi.list()
      ]);
      setCallLogs(logsRes.data);
      setCampaigns(campaignsRes.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch call logs');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLogs = callLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const leadName = [log.lead?.first_name, log.lead?.last_name].filter(Boolean).join(' ').toLowerCase();
    const leadPhone = log.lead?.phone || '';
    const leadCompany = log.lead?.company?.toLowerCase() || '';
    
    return leadName.includes(searchLower) || 
           leadPhone.includes(searchLower) || 
           leadCompany.includes(searchLower);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Call History</h1>
          <p className="text-zinc-400">View all your past calls and dispositions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            placeholder="Search by name, phone, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1A1E] border border-white/5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-[#1A1A1E] border border-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-[#1A1A1E] border border-white/5 mb-4">
            <PhoneCall className="h-10 w-10 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">No call logs yet</h3>
          <p className="text-zinc-500 max-w-sm">
            Start dialing leads from a campaign to see your call history here.
          </p>
        </div>
      ) : (
        <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400 whitespace-nowrap">
              <thead className="bg-white/5 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Lead</th>
                  <th className="px-6 py-4 font-semibold">Campaign</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Disposition</th>
                  <th className="px-6 py-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-500" />
                        <span className="text-white">{formatDate(log.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                          <User className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {[log.lead?.first_name, log.lead?.last_name].filter(Boolean).join(' ') || 'Unknown'}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {log.lead?.company || log.lead?.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.campaign?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-emerald-400 font-mono">
                        {formatDuration(log.duration_seconds)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.disposition ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${DISPOSITION_COLORS[log.disposition] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>
                          {log.disposition.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {log.notes ? (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                          <span className="text-xs text-zinc-400 truncate block">
                            {log.notes}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
