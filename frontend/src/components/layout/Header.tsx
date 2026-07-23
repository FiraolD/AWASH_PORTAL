import * as React from 'react';
import { Menu, Bell, Search, Settings, HelpCircle, ShieldCheck } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';

const Header = () => {
  const { setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  const logoUrl = "./assets/awash_logo.jpg";

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-72 z-40 flex h-20 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-xl md:px-10 transition-all duration-300">
      <div className="flex items-center space-x-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl p-2.5 text-[#1A3E6F] hover:bg-slate-50 transition-colors lg:hidden shadow-sm border border-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex items-center space-x-4">
           {/* Logo for mobile view or just consistent branding */}
           <div className="lg:hidden flex items-center space-x-2">
             <img src={logoUrl} alt="Awash Insurance Logo" className="h-10 w-auto rounded-lg" />
           </div>

           <div className="hidden xl:flex flex-col">
             <span className="text-sm font-bold text-[#1A3E6F] tracking-tight whitespace-nowrap">Where There Is Awash, There Is Peace Of Mind</span>
             <span className="text-[10px] font-medium text-[#1A3E6F] tracking-widest uppercase">We Flow With You</span>
           </div>

           <div className="hidden md:relative md:block group">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#1A3E6F] transition-colors" />
              <input 
                type="text" 
                placeholder="Search for policies, claims..." 
                className="w-64 rounded-2xl bg-slate-50 py-3 pl-12 pr-6 text-xs font-medium text-[#111827] border border-transparent focus:border-[#1A3E6F]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1A3E6F]/5 transition-all"
              />
           </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="hidden sm:flex items-center gap-1 mr-2">
          <Button variant="ghost" size="icon" className="text-[#6B7280] hover:text-[#1A3E6F] hover:bg-[#1A3E6F]/5 rounded-xl">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#6B7280] hover:text-[#1A3E6F] hover:bg-[#1A3E6F]/5 rounded-xl">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <button className="relative rounded-2xl p-3 text-[#1A3E6F] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
          <Bell className="h-5 w-5 group-hover:rotate-12 transition-transform" />
          <span className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-[#E31E24] border-2 border-white ring-2 ring-[#E31E24]/20 animate-pulse"></span>
        </button>

        <div className="flex items-center space-x-4 border-l border-slate-100 pl-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-[#111827] leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{user?.role.replace('_', ' ')}</p>
          </div>
          <div className="relative group cursor-pointer">
            <div className="h-11 w-11 overflow-hidden rounded-2xl border-2 border-white shadow-lg ring-1 ring-slate-100 group-hover:ring-[#1A3E6F]/30 transition-all">
               <img src={user?.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;