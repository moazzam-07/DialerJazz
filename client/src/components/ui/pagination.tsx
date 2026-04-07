import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="mt-6 px-2">
      {/* Desktop */}
      <div className="hidden items-center justify-between sm:flex" aria-label="Pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "flex items-center gap-x-2 text-sm font-medium transition-colors",
            currentPage === 1
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <ul className="flex items-center gap-1">
          {pages.map((item, idx) => (
            <li key={`${item}-${idx}`} className="text-sm">
              {item === "..." ? (
                <div className="px-2 py-1 text-gray-400 dark:text-gray-500">…</div>
              ) : (
                <button
                  onClick={() => onPageChange(item)}
                  aria-current={currentPage === item ? "page" : undefined}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150",
                    currentPage === item
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F1F23] hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  {item}
                </button>
              )}
            </li>
          ))}
        </ul>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "flex items-center gap-x-2 text-sm font-medium transition-colors",
            currentPage === totalPages
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile */}
      <div className="flex items-center justify-between text-sm font-medium sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 border border-gray-200 dark:border-[#1F1F23] rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-[#1F1F23] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="px-3 py-1.5 text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 border border-gray-200 dark:border-[#1F1F23] rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-[#1F1F23] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
