import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminOwners() {
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOwners = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/owners?page=${p}`);
      setOwners(res.data.owners);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch {
      toast.error('Failed to load owners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOwners(); }, []);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 1 || form.name.length > 100) e.name = 'Name must be 1–100 characters';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 12) e.password = 'Password must be at least 12 characters';
    if (form.password && form.password.length > 128) e.password = 'Password max 128 characters';
    return e;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    setSubmitting(true);
    try {
      await api.post('/admin/owners', form);
      toast.success('Owner account created');
      setShowForm(false);
      setForm({ name: '', email: '', password: '' });
      fetchOwners(1);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create owner';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (owner) => {
    const action = owner.isActive ? 'deactivate' : 'activate';
    try {
      await api.patch(`/admin/owners/${owner.uid}/${action}`);
      toast.success(`Owner ${action}d`);
      fetchOwners(page);
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Owners ({total})</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Owner'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">Create Owner Account</h2>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className={`input ${formErrors.name ? 'input-error' : ''}`} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" className={`input ${formErrors.email ? 'input-error' : ''}`} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="owner@company.com" />
              {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
            </div>
            <div>
              <label className="label">Password (min 12 characters)</label>
              <input type="password" className={`input ${formErrors.password ? 'input-error' : ''}`} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••••••" />
              {formErrors.password && <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>}
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating…' : 'Create Owner'}
            </button>
          </form>
        </div>
      )}

      {/* Owners list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : owners.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No owners found</div>
      ) : (
        <>
          <div className="space-y-3">
            {owners.map((owner) => (
              <div key={owner.uid} className="card flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{owner.name}</div>
                  <div className="text-sm text-gray-500 truncate">{owner.email}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Registered: {owner.createdAt ? format(new Date(owner.createdAt._seconds * 1000), 'dd MMM yyyy') : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={owner.isActive ? 'badge-green' : 'badge-red'}>
                    {owner.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleActive(owner)}
                    className={owner.isActive ? 'btn-danger text-xs px-3 py-1 min-h-[36px]' : 'btn-success text-xs px-3 py-1 min-h-[36px]'}
                  >
                    {owner.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => fetchOwners(page - 1)}>← Prev</button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => fetchOwners(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
