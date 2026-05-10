import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

export default function AccountantDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then((res) => {
      const orders = res.data.orders || [];
      const total = res.data.total || orders.length;
      const pending = orders.filter((o) => o.status === 'Pending').length;
      const delivered = orders.filter((o) => o.status === 'Delivered').length;
      const totalValue = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
      setStats({ total, pending, delivered, totalValue });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome, {user?.name}</h1>
      <p className="text-gray-500 text-sm mb-6">Accounts overview</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label="Total Orders" value={stats.total} icon="📦" color="blue" />
          <StatCard label="Pending" value={stats.pending} icon="⏳" color="yellow" />
          <StatCard label="Delivered" value={stats.delivered} icon="✅" color="green" />
          <StatCard label="Total Value" value={`₹${stats.totalValue.toFixed(0)}`} icon="💰" color="purple" />
        </div>
      )}

      <Link to="/accountant/orders"
        className="card flex items-center gap-4 hover:shadow-md transition-shadow">
        <span className="text-3xl">📋</span>
        <div>
          <div className="font-semibold text-gray-800">View All Orders</div>
          <div className="text-sm text-gray-500">Filter by salesman, date, and more</div>
        </div>
        <span className="ml-auto text-gray-400">→</span>
      </Link>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
