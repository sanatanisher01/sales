import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const emptyItem = { productName: '', quantity: '', unitPrice: '' };

function validateOrder(form) {
  const e = {};
  if (!form.customerName || form.customerName.length < 1 || form.customerName.length > 100)
    e.customerName = 'Customer name is required (max 100 chars)';
  if (!form.customerPhone || !/^\d{7,15}$/.test(form.customerPhone))
    e.customerPhone = 'Phone must be 7–15 digits';
  if (form.items.length === 0)
    e.items = 'At least one item is required';
  form.items.forEach((item, i) => {
    if (!item.productName || item.productName.length < 1 || item.productName.length > 100)
      e[`item_${i}_name`] = 'Product name required (max 100 chars)';
    const qty = parseInt(item.quantity);
    if (!item.quantity || isNaN(qty) || qty < 1 || qty > 9999)
      e[`item_${i}_qty`] = 'Quantity must be 1–9999';
    const price = parseFloat(item.unitPrice);
    if (item.unitPrice === '' || isNaN(price) || price < 0)
      e[`item_${i}_price`] = 'Price must be ≥ 0';
  });
  return e;
}

export default function NewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    items: [{ ...emptyItem }],
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  // Track online/offline
  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      flushQueue();
    };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const flushQueue = async () => {
    const raw = localStorage.getItem('order_queue');
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (queue.length === 0) return;
    const remaining = [];
    for (const payload of queue) {
      try {
        await api.post('/orders', payload);
      } catch {
        remaining.push(payload);
      }
    }
    if (remaining.length === 0) {
      localStorage.removeItem('order_queue');
      toast.success(`${queue.length - remaining.length} queued order(s) submitted`);
    } else {
      localStorage.setItem('order_queue', JSON.stringify(remaining));
    }
  };

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });

  const removeItem = (idx) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const totalValue = form.items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const buildPayload = () => ({
    customerName: form.customerName.trim(),
    customerPhone: form.customerPhone.trim(),
    items: form.items.map((item) => ({
      productName: item.productName.trim(),
      quantity: parseInt(item.quantity),
      unitPrice: parseFloat(parseFloat(item.unitPrice).toFixed(2)),
    })),
    note: form.note.trim(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateOrder(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    const payload = buildPayload();

    if (offline) {
      // Queue for later
      const raw = localStorage.getItem('order_queue');
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(payload);
      localStorage.setItem('order_queue', JSON.stringify(queue));
      toast.success('No connection — order saved and will submit when online');
      setForm({ customerName: '', customerPhone: '', items: [{ ...emptyItem }], note: '' });
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/orders', payload);
      toast.success('Order submitted successfully');
      setForm({ customerName: '', customerPhone: '', items: [{ ...emptyItem }], note: '' });
      navigate('/salesman/orders');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit order';
      toast.error(msg);
      // Keep form data so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700">
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-800">New Order</h1>
      </div>

      {offline && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
          ⚠ You're offline. Orders will be saved and submitted when you reconnect.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Customer info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Customer Details</h2>
          <div>
            <label className="label">Customer Name *</label>
            <input className={`input ${errors.customerName ? 'input-error' : ''}`}
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Customer name" />
            {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>}
          </div>
          <div>
            <label className="label">Phone Number *</label>
            <input className={`input ${errors.customerPhone ? 'input-error' : ''}`}
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder="9876543210" inputMode="numeric" />
            {errors.customerPhone && <p className="mt-1 text-xs text-red-600">{errors.customerPhone}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Items</h2>
            <button type="button" onClick={addItem}
              className="text-primary-600 text-sm font-medium min-h-[36px] px-2 hover:underline">
              + Add Item
            </button>
          </div>

          {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}

          {form.items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="text-red-500 text-xs min-h-[36px] px-2 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <div>
                <label className="label text-xs">Product Name *</label>
                <input className={`input ${errors[`item_${idx}_name`] ? 'input-error' : ''}`}
                  value={item.productName}
                  onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                  placeholder="Product name" />
                {errors[`item_${idx}_name`] && <p className="mt-1 text-xs text-red-600">{errors[`item_${idx}_name`]}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Quantity *</label>
                  <input className={`input ${errors[`item_${idx}_qty`] ? 'input-error' : ''}`}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    placeholder="1" inputMode="numeric" />
                  {errors[`item_${idx}_qty`] && <p className="mt-1 text-xs text-red-600">{errors[`item_${idx}_qty`]}</p>}
                </div>
                <div>
                  <label className="label text-xs">Unit Price (₹) *</label>
                  <input className={`input ${errors[`item_${idx}_price`] ? 'input-error' : ''}`}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                    placeholder="0.00" inputMode="decimal" />
                  {errors[`item_${idx}_price`] && <p className="mt-1 text-xs text-red-600">{errors[`item_${idx}_price`]}</p>}
                </div>
              </div>
              {item.quantity && item.unitPrice && (
                <div className="text-xs text-gray-500 text-right">
                  Subtotal: ₹{((parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-gray-900">₹{totalValue.toFixed(2)}</span>
          </div>
        </div>

        {/* Note */}
        <div className="card">
          <label className="label">Note (optional)</label>
          <textarea className="input resize-none" rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Any additional notes…" />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full text-base py-3 min-h-[52px]">
          {submitting ? 'Submitting…' : offline ? 'Save Offline' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}
