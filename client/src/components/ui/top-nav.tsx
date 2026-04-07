"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronRight, LogOut, UserCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "DialerJazz", href: "/dashboard" }];
  
  if (segments.length > 0) {
    crumbs.push({ 
      label: segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, " "), 
      href: `/${segments[0]}` 
    });
  }
  
  return crumbs;
}

export default function TopNav() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      {/* Breadcrumbs */}
      <div className="font-medium text-sm hidden sm:flex items-center space-x-1 truncate max-w-[300px]">
        {breadcrumbs.map((item, index) => (
          <div key={item.label} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mx-1" />
            )}
            {item.href ? (
              <Link
                to={item.href}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100">
                {item.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
        {/* Notification bell */}
        <button
          type="button"
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-gray-200 dark:ring-[#2B2B30] bg-gray-900 dark:bg-gray-100 flex items-center justify-center cursor-pointer">
              <span className="text-xs sm:text-sm font-medium text-white dark:text-gray-900">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] sm:w-80 bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg"
          >
            <div className="relative overflow-hidden rounded-t-lg">
              <div className="relative px-6 pt-8 pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full ring-4 ring-white dark:ring-zinc-900 bg-gray-900 dark:bg-gray-100 flex items-center justify-center">
                      <span className="text-xl font-bold text-white dark:text-gray-900">
                        {user?.email?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      {user?.user_metadata?.first_name || "Agent"}
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                      {user?.email || "agent@company.com"}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                <div className="space-y-1">
                  <DropdownMenuItem asChild className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <Link to="/settings">
                      <UserCircle className="h-4 w-4" /> Profile & Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600 dark:focus:text-red-400 p-2.5 rounded-lg"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
