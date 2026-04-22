import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Loader2, FolderOpen, Search, Filter } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { toast } from 'sonner';
import CampaignsTable from '@/components/CampaignsTable';
import { campaignsApi, type Campaign } from '@/lib/api';

import CreateCampaignModal from '@/components/CreateCampaignModal';

const ITEMS_PER_PAGE = 10;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { currentPage, totalPages, setCurrentPage, resetPage, setMeta, perPage } =
    usePagination({ perPage: ITEMS_PER_PAGE });

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, meta } = await campaignsApi.list({ page: currentPage, per_page: perPage });
      setCampaigns(data);
      setMeta(meta);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, setMeta]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Client-side filtering on the current page's data
  const filteredCampaigns = useMemo(() =>
    campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [campaigns, searchQuery, statusFilter]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CreateCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={fetchCampaigns} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-display text-foreground mb-1">Campaigns</h1>
          <p className="text-muted-foreground tracking-body">Manage and track your calling campaigns.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-foreground hover:opacity-90 text-background px-5 py-2.5 rounded-[0.85rem] text-sm tracking-body font-medium transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-opacity-70" />
          <input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-[0.85rem] bg-surface border border-black/5 dark:border-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground text-opacity-70" />
          {['all', 'draft', 'active', 'paused', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); resetPage(); }}
              className={`px-3 py-1.5 rounded-[0.5rem] tracking-body text-xs font-medium border transition-colors ${
                statusFilter === status
                  ? 'bg-background border-black/10 dark:border-white/10 shadow-sm text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground text-opacity-50 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            {campaigns.length === 0 ? 'No campaigns yet' : 'No matching campaigns'}
          </h3>
          <p className="text-muted-foreground text-opacity-70 mb-6 max-w-sm">
            {campaigns.length === 0 
              ? 'Create your first campaign to get started.' 
              : 'Try adjusting your search or filter.'}
          </p>
          {campaigns.length === 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-foreground text-background hover:opacity-90 px-6 py-3 rounded-[0.85rem] font-medium transition-all shadow-sm flex items-center gap-2 tracking-body"
            >
              <Plus className="h-4 w-4" /> Create Your First Campaign
            </button>
          )}
        </div>
      ) : (
        <>
          <CampaignsTable campaigns={filteredCampaigns} />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
}
