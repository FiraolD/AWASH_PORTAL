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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div
        className={cn(
          'min-h-screen transition-[padding] duration-300 ease-in-out',
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'
        )}
      >
        <Header />

        <main className="mx-auto max-w-[1600px] px-4 pb-10 pt-28 sm:px-6 lg:px-8 xl:px-10">
          <div className="min-h-[calc(100vh-12rem)] rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;