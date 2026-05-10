import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ salesmen: 0, onDuty: 0, orders: 0, stopEvents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/owner/team'),
      api.get('/orders?page=1'),
      api.get('/owner/stop-events'),
    ]).then(([teamRes, ordersRes, stopRes]) => {
      const team = teamRes.data.team || [];
      setStats({
        salesmen: team.filter((m) => m.role === 'salesman').length,
        onDuty: team.filter((m) => m.dutyStatus === 'On Duty').length,
        orders: ordersRes.data.total || 0,
        stopEvents: (stopRes.data.events || []).filter((e) => !e.resolved).length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome, {user?.name}</h1>
      <p className="text-gray-500 text-sm mb-6">Here's your team overview</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard label="Salesmen" value={stats.salesmen} icon="👤" color="blue" />
          <StatCard label="On Duty" value={stats.onDuty} icon="🟢" color="green" />
          <StatCard label="Total Orders" value={stats.orders} icon="📦" color="purple" />
          <StatCard label="Active Stops" value={stats.stopEvents} icon="⚠️" color="orange" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/owner/map" className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow text-center">
          <span className="text-3xl mb-2">🗺️</span>
          <span className="font-medium text-gray-700">Live Map</span>
        </Link>
        <Link to="/owner/team" className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow text-center">
          <span className="text-3xl mb-2">👥</span>
          <span className="font-medium text-gray-700">Team</span>
        </Link>
        <Link to="/owner/orders" className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow text-center">
          <span className="text-3xl mb-2">📦</span>
          <span className="font-medium text-gray-700">Orders</span>
        </Link>
        <Link to="/owner/history" className="card flex flex-col items-center py-5 hover:shadow-md transition-shadow text-center">
          <span className="text-3xl mb-2">📍</span>
          <span className="font-medium text-gray-700">History</span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
