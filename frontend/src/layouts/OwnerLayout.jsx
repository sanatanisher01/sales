import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationBell from '../components/NotificationBell';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import IOSInstallGuide from '../components/IOSInstallGuide';

const navItems = [
  { to: '/owner', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/owner/map', label: 'Live Map', icon: '🗺️' },
  { to: '/owner/team', label: 'Team', icon: '👥' },
  { to: '/owner/orders', label: 'Orders', icon: '📦' },
  { to: '/owner/history', label: 'History', icon: '📍' },
];

export default function OwnerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  usePushNotifications();
  const { isInstallable, isIOS, showIOSGuide, setShowIOSGuide, install } = useInstallPrompt();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-xl"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <span className="font-bold text-lg">SalesTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm hidden sm:block">{user?.name}</span>
          {isInstallable && (
            <button onClick={install}
              className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-lg min-h-[36px] flex items-center gap-1">
              📲 <span className="hidden sm:inline">Install App</span>
            </button>
          )}
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-lg min-h-[36px]"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          className={`
            fixed inset-y-0 left-0 z-40 w-56 bg-white shadow-lg transform transition-transform duration-200
            md:relative md:translate-x-0 md:shadow-none md:border-r md:border-gray-200
            ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ top: '56px' }}
        >
          <ul className="p-3 space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {menuOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      {isIOS && <IOSInstallGuide show={showIOSGuide} onClose={() => setShowIOSGuide(false)} />}
    </div>
  );
}
