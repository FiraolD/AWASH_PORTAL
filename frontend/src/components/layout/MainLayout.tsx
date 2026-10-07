import * as React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

const MainLayout = () => {
  const { isSidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)] text-slate-900">
      <Sidebar />

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding,transform] duration-300 ease-out',
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'
        )}
      >
        <Header />

        <div className="flex min-h-0 flex-1 flex-col pt-20 sm:pt-20">
          <main className="flex-1 overflow-y-auto px-3 pb-5 sm:px-5 lg:px-6 xl:px-8">
            <div className="mx-auto w-full max-w-[1600px] rounded-[22px] border border-slate-200/70 bg-white/[0.72] p-2 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-4 lg:p-5">
              <Outlet />
            </div>
          </main>

          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;