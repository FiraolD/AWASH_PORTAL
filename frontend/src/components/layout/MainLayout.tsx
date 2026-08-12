import * as React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

const MainLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Sidebar />
      
      <div className={cn(
        "transition-all duration-300 ease-in-out lg:pl-72",
        isSidebarOpen ? "pl-72" : "pl-0"
      )}>
        <Header />
        
        <main className="container mx-auto px-4 py-8 md:px-8 md:py-10 mt-20">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;