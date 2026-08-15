import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, HelpCircle, LogOut, UserRound, LockKeyhole, ChevronDown } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import axiosInstance from '../../lib/axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/Dropdown-menu';
import { cn } from '../../lib/utils';

type NotificationItem = {
  id: string | number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'payment' | 'claim' | 'policy' | 'system';
};

const formatTimeAgo = (dateValue?: string) => {
  if (!dateValue) return 'just now';

  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day ago`;
};

const Header = () => {
  const { setSidebarOpen, isSidebarCollapsed } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const logoUrl = './assets/awash_logo.png';
  const chatbotUrl = import.meta.env.VITE_CHATBOT_URL || 'https://example.com/chatbot';

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const response = await axiosInstance.get('/dashboard/notifications');
      const items = (response.data?.notifications || []).map((notification: any) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        time: formatTimeAgo(notification.createdAt),
        unread: Boolean(notification.unread),
        type: notification.type || 'system',
      }));

      setNotifications(items.slice(0, 8));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();

    const interval = window.setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((item) => item.unread).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markNotificationRead = (id: string | number) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 ease-out md:px-6 lg:px-8',
        isSidebarCollapsed ? 'left-24' : 'left-72'
      )}
    >
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-[#1A3E6F] shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={logoUrl} alt="Awash Insurance Logo" className="h-9 w-auto rounded-xl shadow-sm" />
          </div>

          <div className="hidden xl:flex flex-col">
            <span className="whitespace-nowrap text-sm font-bold tracking-tight text-[#1A3E6F]">
              With Smart Insurance, cover your risks and secure your future.
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A3E6F]/80">
              SMART INSURANCE, SMART LIVING
            </span>
          </div>

          <div className="group hidden md:relative md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-[#1A3E6F]" />
            <input
              type="text"
              placeholder="Search for policies, claims..."
              className="w-64 rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-5 text-xs font-medium text-slate-700 transition-all duration-200 focus:border-[#1A3E6F]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1A3E6F]/5"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="mr-1 hidden items-center gap-1 sm:flex">
          <a
            href={chatbotUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open insurance chatbot"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-[#1A3E6F]/20 hover:bg-[#1A3E6F]/5 hover:text-[#1A3E6F]"
          >
            <HelpCircle className="h-5 w-5" />
          </a>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[#1A3E6F] shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5 transition-transform duration-200 group-hover:rotate-12" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#E31E24] px-1 text-[10px] font-bold text-white ring-2 ring-[#E31E24]/20">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[360px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]" align="end">
            <div className="mb-2 flex items-center justify-between gap-3 px-2 py-1">
              <div>
                <p className="text-sm font-bold text-slate-900">Notifications</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live transactions</p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                >
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator className="my-1 bg-slate-200" />
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    markNotificationRead(notification.id);
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col items-start rounded-xl px-3 py-2.5 text-left focus:bg-slate-50',
                    notification.unread ? 'bg-[#1A3E6F]/[0.03]' : ''
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          'mt-1 h-2.5 w-2.5 rounded-full',
                          notification.type === 'payment' && 'bg-emerald-500',
                          notification.type === 'claim' && 'bg-amber-500',
                          notification.type === 'policy' && 'bg-blue-500',
                          notification.type === 'system' && 'bg-violet-500'
                        )}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p>
                      </div>
                    </div>
                    {notification.unread && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#1A3E6F]" />}
                  </div>
                  <div className="mt-2 flex w-full items-center justify-between gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{notification.time}</span>
                    {notification.unread && <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1A3E6F]">Unread</span>}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-2 py-1.5 text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1A3E6F]/15">
              <div className="relative">
                <div className="h-10 w-10 overflow-hidden rounded-xl border-2 border-white shadow-[0_12px_28px_rgba(15,23,42,0.1)] ring-1 ring-slate-200">
                  <img src={user?.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow-sm" />
              </div>

              <div className="hidden text-left md:block">
                <p className="text-sm font-bold text-slate-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  {user?.role?.replace(/_/g, ' ')}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]" align="end">
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:bg-slate-100 focus:text-slate-900">
              <UserRound className="mr-2 h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/change-password')} className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:bg-slate-100 focus:text-slate-900">
              <LockKeyhole className="mr-2 h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-slate-200" />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;