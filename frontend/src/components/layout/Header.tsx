import * as React from 'react';
import { Menu, Bell, Search, Settings, HelpCircle } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const Header = () => {
  const { setSidebarOpen, isSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();

  const logoUrl = "./assets/awash_logo.png";

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl transition-all duration-300 md:px-6 lg:px-8',
        isSidebarCollapsed ? 'left-24' : 'left-72'
      )}
    >
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-[#1A3E6F] shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={logoUrl} alt="Awash Insurance Logo" className="h-9 w-auto rounded-lg" />
          </div>

          <div className="hidden xl:flex flex-col">
            <span className="whitespace-nowrap text-sm font-bold tracking-tight text-[#1A3E6F]">
              With Smart Insurance, cover your risks and secure your future.
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A3E6F]/80">
              SMART INSURANCE, SMART LIVING
            </span>
          </div>

          <div className="hidden md:relative md:block group">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-[#1A3E6F]" />
            <input
              type="text"
              placeholder="Search for policies, claims..."
              className="w-64 rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-5 text-xs font-medium text-slate-700 transition-all focus:border-[#1A3E6F]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1A3E6F]/5"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="mr-1 hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:bg-[#1A3E6F]/5 hover:text-[#1A3E6F]">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:bg-[#1A3E6F]/5 hover:text-[#1A3E6F]">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <button className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[#1A3E6F] transition-all hover:bg-white hover:shadow-md">
          <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
          <span className="absolute right-3.5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#E31E24] ring-2 ring-[#E31E24]/20" />
        </button>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 md:pl-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-slate-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="relative cursor-pointer">
            <div className="h-11 w-11 overflow-hidden rounded-2xl border-2 border-white shadow-lg ring-1 ring-slate-200 transition-all group-hover:ring-[#1A3E6F]/30">
              <img src={user?.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 shadow-sm" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;