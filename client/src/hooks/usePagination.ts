import { useState, useMemo, useCallback } from 'react';
import type { PaginationMeta } from '@/lib/api';

interface UsePaginationOptions {
  /** Items per page — must match per_page sent to server */
  perPage?: number;
}

interface UsePaginationReturn {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total pages from server meta */
  totalPages: number;
  /** Navigate to a specific page — triggers data re-fetch via the page dependency */
  setCurrentPage: (page: number) => void;
  /** Reset to page 1 — call when filters/search change */
  resetPage: () => void;
  /** Update pagination state from server meta */
  setMeta: (meta: PaginationMeta) => void;
  /** The per_page value to send in API requests */
  perPage: number;
}

/**
 * Reusable hook for server-side pagination.
 *
 * Extracts the shared page-state + meta logic that was duplicated
 * across CampaignsPage, CallLogsPage, and LeadsPage.
 *
 * @example
 * ```tsx
 * const { currentPage, totalPages, setCurrentPage, resetPage, setMeta, perPage } = usePagination({ perPage: 25 });
 *
 * useEffect(() => {
 *   api.list({ page: currentPage, per_page: perPage }).then(({ data, meta }) => {
 *     setItems(data);
 *     setMeta(meta);
 *   });
 * }, [currentPage, perPage]);
 *
 * // On search change:
 * onChange={(e) => { setSearch(e.target.value); resetPage(); }}
 * ```
 */
export function usePagination({ perPage = 25 }: UsePaginationOptions = {}): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMetaState] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    per_page: perPage,
    total_pages: 1,
  });

  const totalPages = useMemo(() => meta.total_pages, [meta.total_pages]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  const setMeta = useCallback((m: PaginationMeta) => setMetaState(m), []);

  return {
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
    setMeta,
    perPage,
  };
}
