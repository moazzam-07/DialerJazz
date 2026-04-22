import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { leadsApi, type Lead } from '@/lib/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      const { data } = await leadsApi.listAll({ limit: 500 });
      setLeads(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch CRM leads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = leads.filter(l => 
    (l.first_name || l.company || l.phone).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">CRM Leads</h1>
          <p className="text-zinc-400">View and manage the master repository of all your leads.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          placeholder="Search leads by name, phone, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1A1E] border border-white/5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-[#1A1A1E] border border-white/5 mb-4">
            <UsersIcon className="h-10 w-10 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">No leads in CRM</h3>
          <p className="text-zinc-500 mb-6 max-w-sm">
            Create a campaign and import a CSV to add leads to your Mini-CRM.
          </p>
        </div>
      ) : (
        <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400 whitespace-nowrap">
              <thead className="bg-white/5 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name / Company</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Source Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company || 'Unknown'}</div>
                      <div className="text-xs text-zinc-500">{lead.company && lead.first_name ? lead.company : lead.business_category}</div>
                    </td>
                    <td className="px-6 py-4 text-emerald-400">{lead.phone}</td>
                    <td className="px-6 py-4">
                      {[lead.city, lead.state].filter(Boolean).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      No matching leads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
