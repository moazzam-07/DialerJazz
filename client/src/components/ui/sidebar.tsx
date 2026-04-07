"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  Users,
  Clock,
  Plug,
  Menu,
  PanelLeftClose,
  PhoneCall,
  Headphones,
  HelpCircle,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  active?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}

function NavItem({ href, icon: Icon, children, active, collapsed, onNavigate }: NavItemProps) {
  return (
    <Link
      to={href}
      onClick={onNavigate}
      title={collapsed ? String(children) : undefined}
      className={cn(
        "flex items-center text-sm rounded-md transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
        "text-gray-600 dark:text-gray-300",
        "hover:text-gray-900 dark:hover:text-white",
        "hover:bg-gray-50 dark:hover:bg-[#1F1F23]",
        active && "bg-gray-100 dark:bg-[#1F1F23] text-gray-900 dark:text-white font-medium"
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-3")} />
      {!collapsed && children}
    </Link>
  );
}

interface SessionNavBarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SessionNavBar({ isCollapsed, onToggle }: SessionNavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  function handleNavigation() {
    setIsMobileMenuOpen(false);
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md border border-gray-200 dark:border-[#1F1F23]"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Sidebar nav */}
      <nav
        className={cn(
          "hidden lg:flex flex-col h-full bg-white dark:bg-[#0F0F12] border-r border-gray-200 dark:border-[#1F1F23] transition-all duration-200 ease-in-out flex-shrink-0",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo + Toggle */}
          <div className={cn(
            "h-16 flex items-center border-b border-gray-200 dark:border-[#1F1F23] flex-shrink-0",
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}>
            {isCollapsed ? (
              <button
                onClick={onToggle}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors"
                title="Expand sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="DialerJazz"
                    className="h-8 w-auto object-contain flex-shrink-0"
                  />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    DialerJazz
                  </span>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-2">
            <div className="space-y-6">
              {/* Overview Section */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Overview
                  </div>
                )}
                <div className="space-y-1">
                  <NavItem
                    href="/dashboard"
                    icon={LayoutDashboard}
                    active={pathname === "/dashboard" || pathname === "/"}
                    collapsed={isCollapsed}
                    onNavigate={handleNavigation}
                  >
                    Dashboard
                  </NavItem>
                  <NavItem
                    href="/campaigns"
                    icon={PhoneCall}
                    active={pathname?.includes("campaigns")}
                    collapsed={isCollapsed}
                    onNavigate={handleNavigation}
                  >
                    Campaigns
                  </NavItem>
                  <NavItem
                    href="/dialer"
                    icon={Headphones}
                    active={pathname?.includes("dialer")}
                    collapsed={isCollapsed}
                    onNavigate={handleNavigation}
                  >
                    Dialer
                  </NavItem>
                </div>
              </div>

              {/* Management Section */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Management
                  </div>
                )}
                <div className="space-y-1">
                  <NavItem
                    href="/leads"
                    icon={Users}
                    active={pathname?.includes("leads")}
                    collapsed={isCollapsed}
                    onNavigate={handleNavigation}
                  >
                    Leads
                  </NavItem>
                  <NavItem
                    href="/call-logs"
                    icon={Clock}
                    active={pathname?.includes("call-logs")}
                    collapsed={isCollapsed}
                    onNavigate={handleNavigation}
                  >
                    Call Logs
                  </NavItem>
                  <NavItem
                    href="/connectors"
                    icon={Plug}
                    active={pathname?.includes("connectors")}
                    collapsed={isCollapsed}
                    onNavigate={handleNavigation}
                  >
                    Connectors
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-2 py-4 border-t border-gray-200 dark:border-[#1F1F23] flex-shrink-0">
            <div className="space-y-1">
              <NavItem
                href="/settings"
                icon={Settings}
                active={pathname?.includes("settings")}
                collapsed={isCollapsed}
                onNavigate={handleNavigation}
              >
                Settings
              </NavItem>
              <NavItem
                href="#"
                icon={HelpCircle}
                collapsed={isCollapsed}
                onNavigate={handleNavigation}
              >
                Help
              </NavItem>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar (full overlay) */}
      <nav
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-[#0F0F12] transform transition-transform duration-200 ease-in-out border-r border-gray-200 dark:border-[#1F1F23]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 px-4 flex items-center border-b border-gray-200 dark:border-[#1F1F23]">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="DialerJazz" className="h-8 w-auto object-contain" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">DialerJazz</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4 px-2">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overview</div>
                <div className="space-y-1">
                  <NavItem href="/dashboard" icon={LayoutDashboard} active={pathname === "/dashboard" || pathname === "/"} onNavigate={handleNavigation}>Dashboard</NavItem>
                  <NavItem href="/campaigns" icon={PhoneCall} active={pathname?.includes("campaigns")} onNavigate={handleNavigation}>Campaigns</NavItem>
                  <NavItem href="/dialer" icon={Headphones} active={pathname?.includes("dialer")} onNavigate={handleNavigation}>Dialer</NavItem>
                </div>
              </div>
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Management</div>
                <div className="space-y-1">
                  <NavItem href="/leads" icon={Users} active={pathname?.includes("leads")} onNavigate={handleNavigation}>Leads</NavItem>
                  <NavItem href="/call-logs" icon={Clock} active={pathname?.includes("call-logs")} onNavigate={handleNavigation}>Call Logs</NavItem>
                  <NavItem href="/connectors" icon={Plug} active={pathname?.includes("connectors")} onNavigate={handleNavigation}>Connectors</NavItem>
                </div>
              </div>
            </div>
          </div>
          <div className="px-2 py-4 border-t border-gray-200 dark:border-[#1F1F23]">
            <div className="space-y-1">
              <NavItem href="/settings" icon={Settings} active={pathname?.includes("settings")} onNavigate={handleNavigation}>Settings</NavItem>
              <NavItem href="#" icon={HelpCircle} onNavigate={handleNavigation}>Help</NavItem>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
