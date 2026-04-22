import { useState, useEffect, useCallback, useRef } from 'react';
import { Users as UsersIcon, Search, Loader2, Filter, X, Globe, MapPin, Star, Tag as TagIcon } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { toast } from 'sonner';
import { leadsApi, type Lead } from '@/lib/api';

const ITEMS_PER_PAGE = 25;

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  calling: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  answered: 'bg-green-500/20 text-green-400 border-green-500/30',
  no_answer: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  voicemail: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  busy: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  dnc: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const TAG_COLORS = [
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
];

function getTagColor(tag: string): string {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { currentPage, totalPages, setCurrentPage, setMeta, perPage } =
    usePagination({ perPage: ITEMS_PER_PAGE });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, meta } = await leadsApi.listAll({
        page: currentPage,
        per_page: perPage,
        search: debouncedSearch,
        status: statusFilter || undefined,
      });
      setLeads(data);
      setMeta(meta);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch CRM leads');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch, statusFilter, setMeta]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, setCurrentPage]);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-display text-foreground mb-1">CRM Leads</h1>
          <p className="text-muted-foreground tracking-body">View and manage the master repository of all your leads.</p>
        </div>
      </div>

      {/* Search & Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-opacity-70" />
          <input
            placeholder="Search by name, company, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-[0.85rem] bg-surface border border-black/5 dark:border-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all shadow-sm"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-[0.85rem] border transition-all flex items-center gap-2 ${
            showFilters || statusFilter
              ? 'bg-foreground text-background border-foreground'
              : 'bg-surface border-black/5 dark:border-white/5 text-foreground hover:border-foreground/30'
          }`}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {statusFilter && (
            <span className="h-2 w-2 rounded-full bg-background" />
          )}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 rounded-[0.85rem] bg-surface border border-black/5 dark:border-white/5 text-foreground hover:border-red-500/30 hover:text-red-400 transition-all flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs text-muted-foreground flex items-center px-2 py-1">Status:</span>
          {['', 'new', 'calling', 'answered', 'no_answer', 'voicemail', 'busy', 'failed', 'dnc'].map((status) => (
            <button
              key={status || 'all'}
              onClick={() => handleStatusFilterChange(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                statusFilter === status
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-surface border-black/5 dark:border-white/5 text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && leads.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
          {debouncedSearch && <> matching "{debouncedSearch}"</>}
          {statusFilter && <> with status "{statusFilter}"</>}
        </div>
      )}

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
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No leads found</h3>
          <p className="text-muted-foreground text-opacity-70 mb-6 max-w-sm">
            {hasActiveFilters
              ? 'Try adjusting your search or filters to find leads.'
              : 'Create a campaign and import a CSV to add leads to your Mini-CRM.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 rounded-[0.85rem] bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-surface border border-black/5 dark:border-white/5 rounded-[1.5rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-foreground whitespace-nowrap">
                <thead className="bg-muted text-xs uppercase text-muted-foreground text-opacity-70">
                  <tr>
                    <th className="px-4 py-4 font-semibold">Name / Company</th>
                    <th className="px-4 py-4 font-semibold">Contact</th>
                    <th className="px-4 py-4 font-semibold">Location</th>
                    <th className="px-4 py-4 font-semibold">Links</th>
                    <th className="px-4 py-4 font-semibold">Tags</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name / Company */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">
                          {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground text-opacity-70">
                          {lead.company && lead.first_name ? lead.company : lead.business_category}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-4 py-4">
                        <div className="text-foreground font-mono text-sm">{lead.phone}</div>
                        {lead.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">{lead.email}</div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                        </div>
                        {lead.google_rating && (
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span>{lead.google_rating}</span>
                            {lead.review_count && <span className="text-muted-foreground">({lead.review_count})</span>}
                          </div>
                        )}
                      </td>

                      {/* Links */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                              title="Website"
                            >
                              <Globe className="h-3.5 w-3.5 text-foreground" />
                            </a>
                          )}
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                              title="LinkedIn"
                            >
                              <svg className="h-3.5 w-3.5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                            </a>
                          )}
                          {lead.google_maps_url && (
                            <a
                              href={lead.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                              title="Google Maps"
                            >
                              <MapPin className="h-3.5 w-3.5 text-foreground" />
                            </a>
                          )}
                          {!lead.website && !lead.linkedin_url && !lead.google_maps_url && (
                            <span className="text-xs text-muted-foreground text-opacity-50">—</span>
                          )}
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {lead.tags && lead.tags.length > 0 ? (
                            lead.tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTagColor(tag)}`}
                              >
                                <TagIcon className="h-2.5 w-2.5" />
                                {tag.length > 15 ? tag.substring(0, 15) + '...' : tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground text-opacity-50">—</span>
                          )}
                          {lead.tags && lead.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-black/5 dark:border-white/5">
                              +{lead.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusColor(lead.status)}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
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
