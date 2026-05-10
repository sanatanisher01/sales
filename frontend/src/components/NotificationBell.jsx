import React, { useState, useRef, useEffect } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { format } from 'date-fns';

const typeIcon = {
  stop_event: '⚠️',
  stop_resolved: '✅',
  new_order: '🛒',
  order_status: '📦',
};

function formatTs(ts) {
  if (!ts) return '';
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return format(d, 'HH:mm · dd MMM');
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead, pushSubscribed, subscribePush, unsubscribePush, pushSupported } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleTogglePush = async () => {
    setToggling(true);
    if (pushSubscribed) {
      await unsubscribePush();
    } else {
      const ok = await subscribePush();
      if (!ok) alert('Could not enable notifications. Please allow notifications in your browser settings.');
    }
    setToggling(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary-600 hover:underline min-h-[36px] px-1"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Push toggle */}
          {pushSupported && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs text-gray-600">
                {pushSubscribed ? '🔔 Push notifications on' : '🔕 Push notifications off'}
              </span>
              <button
                onClick={handleTogglePush}
                disabled={toggling}
                className={`text-xs font-medium px-3 py-1 rounded-full min-h-[32px] transition-colors disabled:opacity-50 ${
                  pushSubscribed
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    : 'bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100'
                }`}
              >
                {toggling ? '…' : pushSubscribed ? 'Turn off' : 'Turn on'}
              </button>
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { markRead(n.id); setOpen(false); }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    !n.read ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] || '📢'}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatTs(n.createdAt)}</div>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
