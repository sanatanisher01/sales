import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

const GPS_INTERVAL_MS = 8000; // 8 seconds (within 5–10s spec)

export default function SalesmanDashboard() {
  const { user } = useAuthStore();
  const [onDuty, setOnDuty] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | tracking | lost
  const [orderCount, setOrderCount] = useState(0);
  const watchRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const lastPingRef = useRef(null);

  // Fetch current duty status
  const fetchStatus = useCallback(async () => {
    try {
      const [dutyRes, ordersRes] = await Promise.all([
        api.get('/salesman/duty/status'),
        api.get('/salesman/orders'),
      ]);
      setOnDuty(dutyRes.data.onDuty);
      setSession(dutyRes.data.session);
      setOrderCount(dutyRes.data.orders?.length || ordersRes.data.orders?.length || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device');
      return;
    }

    setGpsStatus('tracking');

    const sendPing = (lat, lng, accuracy) => {
      lastPingRef.current = Date.now();
      api.post('/location/ping', { lat, lng, accuracy }).catch(() => {});
    };

    // Watch position
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('tracking');
        sendPing(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        console.warn('GPS error:', err.message);
        setGpsStatus('lost');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    // Fallback interval ping in case watchPosition fires slowly
    pingIntervalRef.current = setInterval(() => {
      if (lastPingRef.current && Date.now() - lastPingRef.current > 30000) {
        setGpsStatus('lost');
      }
    }, 10000);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setGpsStatus('idle');
  }, []);

  // Resume tracking if already on duty on mount
  useEffect(() => {
    if (!loading && onDuty) {
      startTracking();
    }
    return () => stopTracking();
  }, [loading, onDuty, startTracking, stopTracking]);

  const handleGoOnDuty = async () => {
    if (onDuty) {
      toast('Already on duty');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Location access is required to go on duty');
      return;
    }

    // Request permission first
    setToggling(true);
    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const res = await api.post('/salesman/duty/start');
          setOnDuty(true);
          setSession({ id: res.data.sessionId, startedAt: new Date() });
          startTracking();
          toast.success('You are now On Duty');
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to start duty');
        } finally {
          setToggling(false);
        }
      },
      (err) => {
        setToggling(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please enable it in your browser settings.');
        } else {
          toast.error('Could not get location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGoOffDuty = async () => {
    if (!onDuty) {
      toast('No active duty session');
      return;
    }
    setToggling(true);
    try {
      await api.post('/salesman/duty/stop');
      stopTracking();
      setOnDuty(false);
      setSession(null);
      toast.success('You are now Off Duty');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to stop duty');
    } finally {
      setToggling(false);
    }
  };

  const sessionStart = session?.startedAt
    ? (session.startedAt._seconds
        ? new Date(session.startedAt._seconds * 1000)
        : new Date(session.startedAt))
    : null;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Hello, {user?.name}</h1>
      <p className="text-gray-500 text-sm mb-6">Manage your duty and orders</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Duty status card */}
          <div className={`rounded-2xl p-5 mb-5 text-white ${onDuty ? 'bg-green-600' : 'bg-gray-500'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium opacity-80">Status</div>
                <div className="text-2xl font-bold">{onDuty ? 'On Duty' : 'Off Duty'}</div>
              </div>
              <div className="text-4xl">{onDuty ? '🟢' : '⚫'}</div>
            </div>

            {onDuty && sessionStart && (
              <div className="text-sm opacity-80 mb-3">
                Started at {format(sessionStart, 'HH:mm')}
              </div>
            )}

            {/* GPS status */}
            {onDuty && (
              <div className={`text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1 mb-3 ${
                gpsStatus === 'tracking' ? 'bg-white/20' : 'bg-orange-400/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${gpsStatus === 'tracking' ? 'bg-green-300 animate-pulse' : 'bg-orange-200'}`} />
                {gpsStatus === 'tracking' ? 'GPS Active' : '⚠ GPS Signal Lost'}
              </div>
            )}

            <button
              onClick={onDuty ? handleGoOffDuty : handleGoOnDuty}
              disabled={toggling}
              className={`w-full py-3 rounded-xl font-bold text-base min-h-[52px] transition-colors disabled:opacity-60 ${
                onDuty
                  ? 'bg-white text-green-700 hover:bg-green-50'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {toggling ? '…' : onDuty ? 'Go Off Duty' : 'Go On Duty'}
            </button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/salesman/orders/new"
              className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow text-center">
              <span className="text-3xl mb-2">➕</span>
              <span className="font-medium text-gray-700">New Order</span>
            </Link>
            <Link to="/salesman/orders"
              className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow text-center">
              <span className="text-3xl mb-2">📦</span>
              <span className="font-medium text-gray-700">My Orders</span>
              {orderCount > 0 && (
                <span className="mt-1 badge badge-blue">{orderCount}</span>
              )}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
