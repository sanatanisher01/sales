import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format, formatDuration, intervalToDuration } from 'date-fns';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TRAIL_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

function formatTs(ts) {
  if (!ts) return '—';
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return format(d, 'dd MMM yyyy, HH:mm');
}

function sessionDuration(session) {
  if (!session.startedAt || !session.endedAt) return null;
  const start = session.startedAt._seconds ? new Date(session.startedAt._seconds * 1000) : new Date(session.startedAt);
  const end = session.endedAt._seconds ? new Date(session.endedAt._seconds * 1000) : new Date(session.endedAt);
  return formatDuration(intervalToDuration({ start, end }), { format: ['hours', 'minutes'] }) || '< 1 min';
}

export default function OwnerHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [trail, setTrail] = useState([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [team, setTeam] = useState([]);
  const [filterSalesman, setFilterSalesman] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/owner/duty-sessions'),
      api.get('/owner/team'),
    ]).then(([sessRes, teamRes]) => {
      setSessions(sessRes.data.sessions || []);
      setTeam((teamRes.data.team || []).filter((m) => m.role === 'salesman'));
    }).catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const loadTrail = async (session) => {
    setSelected(session);
    setTrail([]);
    setTrailLoading(true);
    try {
      const res = await api.get(`/owner/duty-sessions/${session.id}/trail`);
      setTrail(res.data.trail || []);
    } catch {
      toast.error('Failed to load trail');
    } finally {
      setTrailLoading(false);
    }
  };

  const filtered = filterSalesman
    ? sessions.filter((s) => s.salesmanId === filterSalesman)
    : sessions;

  const trailPositions = trail.map((p) => [p.lat, p.lng]);
  const mapCenter = trailPositions.length > 0 ? trailPositions[0] : [20.5937, 78.9629];

  const colorIdx = selected
    ? sessions.filter((s) => s.salesmanId === selected.salesmanId).indexOf(selected) % TRAIL_COLORS.length
    : 0;
  const trailColor = TRAIL_COLORS[colorIdx];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Route History</h1>

      {/* Filter */}
      <div className="mb-4">
        <select className="input max-w-xs text-sm" value={filterSalesman}
          onChange={(e) => setFilterSalesman(e.target.value)}>
          <option value="">All Salesmen</option>
          {team.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Session list */}
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No sessions available</div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map((session, idx) => (
                <button key={session.id} onClick={() => loadTrail(session)}
                  className={`card w-full text-left transition-all ${
                    selected?.id === session.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
                  }`}>
                  <div className="flex items-start gap-3">
                    <span className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: TRAIL_COLORS[idx % TRAIL_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">{session.salesmanName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatTs(session.startedAt)}
                        {session.endedAt && ` → ${formatTs(session.endedAt)}`}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`badge ${session.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                          {session.status}
                        </span>
                        {session.totalDistanceKm > 0 && (
                          <span className="text-xs text-gray-500">
                            {session.totalDistanceKm.toFixed(2)} km
                          </span>
                        )}
                        {sessionDuration(session) && (
                          <span className="text-xs text-gray-500">{sessionDuration(session)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map panel */}
        <div className="h-[60vh] md:h-[70vh] rounded-xl overflow-hidden border border-gray-200 relative">
          {!selected ? (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
              Select a session to view route
            </div>
          ) : trailLoading ? (
            <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400">
              Loading trail…
            </div>
          ) : (
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {trailPositions.length === 1 ? (
                /* Single point */
                <CircleMarker center={trailPositions[0]} radius={8} color={trailColor} fillColor={trailColor} fillOpacity={1}>
                  <Popup>{selected.salesmanName}</Popup>
                </CircleMarker>
              ) : trailPositions.length > 1 ? (
                <>
                  <Polyline positions={trailPositions} color={trailColor} weight={4} opacity={0.85} />
                  {/* Start marker */}
                  <CircleMarker center={trailPositions[0]} radius={8} color="#16a34a" fillColor="#16a34a" fillOpacity={1}>
                    <Popup>Start</Popup>
                  </CircleMarker>
                  {/* End marker */}
                  <CircleMarker center={trailPositions[trailPositions.length - 1]} radius={8} color="#dc2626" fillColor="#dc2626" fillOpacity={1}>
                    <Popup>End</Popup>
                  </CircleMarker>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
                  <div className="bg-white/90 rounded-xl px-4 py-3 shadow text-sm text-gray-500">
                    No GPS data for this session
                  </div>
                </div>
              )}
            </MapContainer>
          )}

          {/* Trail info overlay */}
          {selected && !trailLoading && trail.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/90 rounded-lg px-3 py-2 text-xs text-gray-700 shadow z-[1000]">
              <span className="font-medium">{selected.salesmanName}</span>
              {' · '}
              {trail.length} points
              {selected.totalDistanceKm > 0 && ` · ${selected.totalDistanceKm.toFixed(2)} km`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
