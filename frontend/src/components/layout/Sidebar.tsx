import * as React from 'react';
import {
  NavLink,
  useLocation,
  useNavigate,
  type NavLinkRenderProps,
} from 'react-router-dom';
import {
  LayoutDashboard, FileText, Shield, CreditCard, Users, Settings,
  HelpCircle, User, LogOut, Menu, ChevronLeft, ChevronRight,
  Package, Workflow, CheckSquare, FileSearch, DollarSign, Clock,
  Activity, AlertTriangle, FileCheck, Ticket
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { navigationConfig, hasPermission } from '../../lib/utils/rolePermissions';

const iconMap: Record<string, any> = {
  LayoutDashboard: LayoutDashboard,
  FileText: FileText,
  Shield: Shield,
  CreditCard: CreditCard,
  Users: Users,
  Settings: Settings,
  HelpCircle: HelpCircle,
  User: User,
  Package: Package,
  Workflow: Workflow,
  CheckSquare: CheckSquare,
  FileSearch: FileSearch,
  DollarSign: DollarSign,
  Clock: Clock,
  Activity: Activity,
  AlertTriangle: AlertTriangle,
  FileCheck: FileCheck,
  Ticket: Ticket
};

const Sidebar = () => {
  const {
    isSidebarOpen,
    isSidebarCollapsed,
    setSidebarOpen,
    toggleSidebarCollapse,
  } = useUIStore();
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const logoUrl = "./src/assets/awash_logo.png";

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navigationConfig.items.filter((item) =>
    user && hasPermission(user.role, item.roles)
  );

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 border-r border-white/10 bg-[#1A3E6F] text-white shadow-[0_20px_60px_rgba(15,23,42,0.28)] transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          isSidebarCollapsed ? 'w-24' : 'w-72'
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn('flex items-center justify-between border-b border-white/10 px-4 py-5', isSidebarCollapsed && 'px-3')}>
            <div className={cn('flex items-center gap-3 overflow-hidden', isSidebarCollapsed && 'justify-center')}>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-lg shadow-slate-950/20">
                <img src={logoUrl} alt="Awash Logo" className="h-full w-full object-contain" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex min-w-0 flex-col leading-none">
                  <span className="text-base font-extrabold tracking-tight">SMART</span>
                  <span className="text-[9px] font-semibold tracking-[0.22em] text-blue-200/70">INSURANCE</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-blue-100 transition-colors hover:bg-white/10 lg:hidden"
              aria-label="Close sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleSidebarCollapse}
              className="hidden rounded-lg p-2 text-blue-100 transition-colors hover:bg-white/10 lg:flex"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="px-8 pb-5 pt-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-blue-200/60">We Flow With You</p>
            </div>
          )}

          <div className={cn('px-3 pb-4 pt-2', isSidebarCollapsed && 'px-2')}>
            <div className={cn('rounded-2xl border border-white/10 bg-white/5 p-3', isSidebarCollapsed && 'p-2')}>
              <div className={cn('flex items-center gap-3', isSidebarCollapsed && 'justify-center')}>
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 border-white/20">
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                    alt="User profile"
                    className="h-full w-full object-cover"
                  />
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-sm font-bold text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-200/60">
                      {user?.role?.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="space-y-1.5">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                const IconComponent = iconMap[item.icon] || LayoutDashboard;

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive: navActive }: NavLinkRenderProps) =>
                      cn(
                        'group relative flex items-center rounded-xl transition-all duration-200',
                        isSidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-3.5',
                        navActive
                          ? 'bg-white text-[#1A3E6F] shadow-lg shadow-black/10'
                          : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
                      )
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className={cn('flex items-center gap-3.5', isSidebarCollapsed && 'justify-center')}>
                      <IconComponent
                        className={cn(
                          'h-[18px] w-[18px] transition-transform group-hover:scale-110',
                          isActive ? 'text-[#1A3E6F]' : 'text-blue-200/40 group-hover:text-white'
                        )}
                      />
                      {!isSidebarCollapsed && (
                        <span className="text-sm font-semibold tracking-wide">{item.title}</span>
                      )}
                    </div>

                    {!isSidebarCollapsed && isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="h-1.5 w-1.5 rounded-full bg-[#E31E24]"
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          <div className={cn('p-3', isSidebarCollapsed && 'px-2')}>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
              <button
                onClick={handleLogout}
                className={cn(
                  'group flex w-full items-center rounded-xl text-sm font-bold text-blue-200/70 transition-colors hover:bg-red-500/10 hover:text-red-400',
                  isSidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-3'
                )}
              >
                <div className={cn('flex items-center gap-3.5', isSidebarCollapsed && 'justify-center')}>
                  <LogOut className="h-[18px] w-[18px]" />
                  {!isSidebarCollapsed && <span>Sign Out</span>}
                </div>
                {!isSidebarCollapsed && (
                  <ChevronRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;