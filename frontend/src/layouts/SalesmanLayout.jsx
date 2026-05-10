import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import SalesmanNotificationBell from '../components/SalesmanNotificationBell';
import { useSalesmanNotificationStore } from '../store/salesmanNotificationStore';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import IOSInstallGuide from '../components/IOSInstallGuide';

const navItems = [
  { to: '/salesman', label: 'Home', icon: '🏠', end: true },
  { to: '/salesman/orders', label: 'Orders', icon: '📦' },
  { to: '/salesman/orders/new', label: 'New Order', icon: '➕' },
];

export default function SalesmanLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { startListener, stopListener, unreadCount } = useSalesmanNotificationStore();
  const { isInstallable, isIOS, showIOSGuide, setShowIOSGuide, install } = useInstallPrompt();

  // Start real-time Firestore listener
  useEffect(() => {
    if (!user?.uid) return;
    startListener(user.uid);
    return () => stopListener();
  }, [user?.uid, startListener, stopListener]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow">
        <span className="font-bold text-lg">SalesTrack</span>
        <div className="flex items-center gap-2">
          <span className="text-sm hidden sm:block">{user?.name}</span>
          {isInstallable && (
            <button onClick={install}
              className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-lg min-h-[36px] flex items-center gap-1">
              📲 <span className="hidden sm:inline">Install App</span>
            </button>
          )}
          {/* Notification Bell */}
          <SalesmanNotificationBell />
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-lg min-h-[36px]"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <ul className="flex">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center min-h-[56px] text-xs font-medium transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                  }`
                }
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="relative">
                  {item.label}
                  {item.label === 'Orders' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {isIOS && <IOSInstallGuide show={showIOSGuide} onClose={() => setShowIOSGuide(false)} />}
    </div>
  );
}
