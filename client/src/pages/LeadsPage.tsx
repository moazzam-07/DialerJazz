import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users as UsersIcon, Search, Loader2 } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { toast } from 'sonner';
import { leadsApi, type Lead } from '@/lib/api';

const ITEMS_PER_PAGE = 25;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { currentPage, totalPages, setCurrentPage, setMeta, perPage } =
    usePagination({ perPage: ITEMS_PER_PAGE });

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, meta } = await leadsApi.listAll({ page: currentPage, per_page: perPage });
      setLeads(data);
      setMeta(meta);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch CRM leads');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, setMeta]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Client-side search within the current server page
  const filteredLeads = useMemo(() =>
    leads.filter(l =>
      (l.first_name || l.company || l.phone).toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [leads, searchTerm]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-display text-foreground mb-1">CRM Leads</h1>
          <p className="text-muted-foreground tracking-body">View and manage the master repository of all your leads.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-opacity-70" />
        <input
          placeholder="Search leads by name, phone, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-[0.85rem] bg-surface border border-black/5 dark:border-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all shadow-sm"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-[1.5rem] bg-surface border border-black/5 dark:border-white/5 mb-4 shadow-sm">
            <UsersIcon className="h-10 w-10 text-muted-foreground text-opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No leads in CRM</h3>
          <p className="text-muted-foreground text-opacity-70 mb-6 max-w-sm">
            Create a campaign and import a CSV to add leads to your Mini-CRM.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-black/5 dark:border-white/5 rounded-[1.5rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-foreground whitespace-nowrap">
                <thead className="bg-muted text-xs uppercase text-muted-foreground text-opacity-70">
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
                        <div className="font-medium text-foreground">{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground text-opacity-70">{lead.company && lead.first_name ? lead.company : lead.business_category}</div>
                      </td>
                      <td className="px-6 py-4 text-foreground font-mono">{lead.phone}</td>
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
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-opacity-70">
                        No matching leads found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
}
