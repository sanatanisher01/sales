import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const statusBadge = {
  Pending: 'badge-yellow',
  Confirmed: 'badge-blue',
  Delivered: 'badge-green',
  Cancelled: 'badge-red',
};

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return format(d, 'dd MMM yyyy, HH:mm');
}

export default function SalesmanOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/salesman/orders')
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  // Check for queued offline orders
  const queuedCount = (() => {
    try {
      const raw = localStorage.getItem('order_queue');
      return raw ? JSON.parse(raw).length : 0;
    } catch { return 0; }
  })();

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
        <Link to="/salesman/orders/new" className="btn-primary text-sm">+ New</Link>
      </div>

      {queuedCount > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
          ⏳ {queuedCount} order(s) queued offline — will submit when online
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📦</div>
          <div className="text-gray-500 font-medium">No orders yet</div>
          <Link to="/salesman/orders/new" className="btn-primary mt-4 inline-flex">
            Submit First Order
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button key={order.id} onClick={() => setSelected(order)}
              className="card w-full text-left hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800">{order.customerName}</div>
                  <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  <div className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`badge ${statusBadge[order.status] || 'badge-gray'}`}>{order.status}</span>
                  <span className="text-sm font-semibold text-gray-800">₹{order.totalValue?.toFixed(2)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Order Details</h2>
                <button onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <Row label="Customer" value={selected.customerName} />
                <Row label="Phone" value={selected.customerPhone} />
                <Row label="Date" value={formatDate(selected.createdAt)} />
                <Row label="Status">
                  <span className={`badge ${statusBadge[selected.status] || 'badge-gray'}`}>{selected.status}</span>
                </Row>
                {selected.note && <Row label="Note" value={selected.note} />}

                <div>
                  <span className="text-gray-500 font-medium">Items</span>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-600">Product</th>
                          <th className="text-right px-3 py-2 text-gray-600">Qty</th>
                          <th className="text-right px-3 py-2 text-gray-600">Price</th>
                          <th className="text-right px-3 py-2 text-gray-600">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.items || []).map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{item.productName}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">₹{item.unitPrice?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              ₹{(item.quantity * item.unitPrice).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 font-semibold text-right text-gray-700">Total</td>
                          <td className="px-3 py-2 font-bold text-right text-gray-900">
                            ₹{selected.totalValue?.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      {children || <span className="text-gray-800 font-medium">{value}</span>}
    </div>
  );
}
