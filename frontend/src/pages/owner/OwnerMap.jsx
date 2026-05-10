import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TRAIL_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

function makeIcon(color, initials, stale) {
  const fill = stale ? '#9ca3af' : color;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="${fill}"/>
    <circle cx="18" cy="18" r="12" fill="white"/>
    <text x="18" y="23" text-anchor="middle" font-size="10" font-weight="bold" fill="${fill}" font-family="sans-serif">${initials}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [36, 44], iconAnchor: [18, 44], popupAnchor: [0, -44] });
}

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function FitBounds({ positions }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length > 0 && !fitted.current) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 15 });
      fitted.current = true;
    }
  }, [positions, map]);
  return null;
}

function formatTs(ts) {
  if (!ts) return '—';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return format(d, 'HH:mm:ss');
}

function isStale(loc) {
  if (!loc.liveLocation?.timestamp) return true;
  const ts = loc.liveLocation.timestamp.seconds
    ? loc.liveLocation.timestamp.seconds * 1000
    : new Date(loc.liveLocation.timestamp).getTime();
  return Date.now() - ts > 30000;
}

export default function OwnerMap() {
  const { user } = useAuthStore();
  const [salesmen, setSalesmen] = useState([]);   // on-duty salesmen with liveLocation
  const [stopEvents, setStopEvents] = useState([]); // active stop events
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Real-time listener: on-duty salesmen under this owner
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'users'),
      where('ownerId', '==', user.uid),
      where('dutyStatus', '==', 'On Duty')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setSalesmen(list);
      setLastUpdated(new Date());
      setLoading(false);
    }, (err) => {
      console.error('Salesman listener error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // Real-time listener: active (unresolved) stop events for this owner
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'stopEvents'),
      where('ownerId', '==', user.uid),
      where('resolved', '==', false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setStopEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user?.uid]);

  const activeLocations = salesmen.filter((s) => s.liveLocation);
  const mapCenter = activeLocations.length > 0
    ? [activeLocations[0].liveLocation.lat, activeLocations[0].liveLocation.lng]
    : [20.5937, 78.9629];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Status bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${activeLocations.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700">{activeLocations.length} on duty</span>
          <span className="text-xs text-green-600 font-medium">● Live</span>
        </div>
        <div className="flex items-center gap-3">
          {stopEvents.length > 0 && (
            <span className="badge badge-yellow">⚠️ {stopEvents.length} stop{stopEvents.length > 1 ? 's' : ''}</span>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {format(lastUpdated, 'HH:mm:ss')}</span>
          )}
        </div>
      </div>

      {/* Stop event banners */}
      {stopEvents.map((ev) => <StopBanner key={ev.id} event={ev} />)}

      {/* Map */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Connecting…</div>
      ) : (
        <div className="flex-1 relative">
          <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {activeLocations.length > 0 && (
              <FitBounds positions={activeLocations.map((s) => [s.liveLocation.lat, s.liveLocation.lng])} />
            )}

            {activeLocations.map((s, idx) => {
              const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
              const stale = isStale(s);
              return (
                <Marker
                  key={s.uid}
                  position={[s.liveLocation.lat, s.liveLocation.lng]}
                  icon={makeIcon(color, getInitials(s.name), stale)}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <div className="font-bold text-gray-800 mb-1">{s.name}</div>
                      <div className="text-gray-500 text-xs">
                        {s.liveLocation.lat.toFixed(6)}, {s.liveLocation.lng.toFixed(6)}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        Last seen: {formatTs(s.liveLocation.timestamp)}
                      </div>
                      {stale && <div className="mt-1 text-orange-600 text-xs font-medium">⚠ Signal lost</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {activeLocations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
                <div className="bg-white/90 rounded-xl px-6 py-4 shadow text-center">
                  <div className="text-2xl mb-1">🗺️</div>
                  <div className="text-gray-600 font-medium">No salesmen on duty</div>
                </div>
              </div>
            )}
          </MapContainer>
        </div>
      )}

      {/* Salesman list */}
      {salesmen.length > 0 && (
        <div className="bg-white border-t border-gray-200 flex-shrink-0 max-h-40 overflow-y-auto">
          {salesmen.map((s, idx) => {
            const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
            const stale = isStale(s);
            return (
              <div key={s.uid} className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 last:border-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stale ? '#9ca3af' : color }} />
                <span className="text-sm font-medium text-gray-800 flex-1">{s.name}</span>
                {s.liveLocation
                  ? <span className="text-xs text-gray-400">{formatTs(s.liveLocation.timestamp)}</span>
                  : <span className="text-xs text-gray-400">No location</span>}
                {stale && <span className="text-xs text-orange-500">Signal lost</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StopBanner({ event }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = event.startTime?.seconds
      ? event.startTime.seconds * 1000
      : new Date(event.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [event.startTime]);

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 text-sm flex-shrink-0">
      <span className="text-yellow-600">⚠️</span>
      <span className="font-medium text-yellow-800">{event.salesmanName}</span>
      <span className="text-yellow-700">stopped at</span>
      <span className="text-yellow-800 font-medium truncate flex-1">{event.address}</span>
      <span className="text-yellow-600 flex-shrink-0">{elapsed} min</span>
    </div>
  );
}
