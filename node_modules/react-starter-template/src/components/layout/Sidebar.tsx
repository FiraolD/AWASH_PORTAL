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

// Icon map for string to component
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
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const logoUrl = "./src/assets/awash_logo.jpg";

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter navigation items based on user role
  const filteredNavItems = navigationConfig.items.filter(item => 
    user && hasPermission(user.role, item.roles)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[#111827]/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-[#1A3E6F] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-8 py-8">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 overflow-hidden rounded-xl bg-white shadow-lg p-1">
                <img src={logoUrl} alt="Awash Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight tracking-tight">AWASH</span>
                <span className="text-[10px] font-medium tracking-[0.2em] text-blue-200/60">INSURANCE</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="px-8 -mt-4 mb-6">
             <p className="text-[9px] font-bold text-blue-200/50 uppercase tracking-[0.2em]">We Flow With You</p>
          </div>

          {/* User Profile Summary */}
          <div className="px-6 py-4 mb-4">
            <div className="group relative flex items-center gap-4 rounded-2xl bg-white/5 p-4 border border-white/10">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-white/20">
                <img 
                  src={user?.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} 
                  alt="User profile" 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-white truncate">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-blue-200/60">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            <div className="space-y-1.5">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                const IconComponent = iconMap[item.icon] || LayoutDashboard;
                
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }: NavLinkRenderProps) =>cn(
                      'group relative flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-200',
                      isActive 
                        ? 'bg-white text-[#1A3E6F] shadow-lg shadow-black/10' 
                        : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="flex items-center gap-3.5">
                      <IconComponent className={cn(
                        'h-[18px] w-[18px] transition-transform group-hover:scale-110',
                        isActive ? 'text-[#1A3E6F]' : 'text-blue-200/40 group-hover:text-white'
                      )} />
                      <span className="text-sm font-semibold tracking-wide">{item.title}</span>
                    </div>
                    {isActive && (
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

          {/* Footer Navigation */}
          <div className="p-6">
            <div className="rounded-2xl bg-white/5 p-2">
              <button
                onClick={handleLogout}
                className="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-blue-200/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <div className="flex items-center gap-3.5">
                  <LogOut className="h-[18px] w-[18px]" />
                  <span>Sign Out</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;