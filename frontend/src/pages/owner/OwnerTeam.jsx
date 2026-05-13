import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ROLES = ['salesman', 'accountant'];
const emptyForm = { name: '', phone: '', email: '', password: '', role: 'salesman' };

function validate(form) {
  const e = {};
  if (!form.name || form.name.length < 1 || form.name.length > 100)
    e.name = 'Name must be 1–100 characters';
  if (form.role === 'salesman' && (!form.phone || !/^\d{7,15}$/.test(form.phone)))
    e.phone = 'Phone must be 7–15 digits';
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = 'Valid email required';
  if (!form.password || form.password.length < 12)
    e.password = 'Password must be at least 12 characters';
  if (form.password && form.password.length > 64)
    e.password = 'Password max 64 characters';
  return e;
}

export default function OwnerTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/team');
      setTeam(res.data.team || []);
    } catch {
      toast.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    setSubmitting(true);
    try {
      const endpoint = form.role === 'salesman' ? '/owner/team/salesman' : '/owner/team/accountant';
      await api.post(endpoint, form);
      toast.success(`${form.role === 'salesman' ? 'Salesman' : 'Accountant'} created`);
      setShowForm(false);
      setForm(emptyForm);
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create member');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (member) => {
    const action = member.isActive ? 'deactivate' : 'activate';
    try {
      await api.patch(`/owner/team/${member.uid}/${action}`);
      toast.success(`${member.name} ${action}d`);
      fetchTeam();
    } catch {
      toast.error('Action failed');
    }
  };

  const filtered = filter === 'all' ? team : team.filter((m) => m.role === filter);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Team ({team.length})</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-5">
          <h2 className="font-semibold text-gray-700 mb-4">Add Team Member</h2>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px] ${
                    form.role === r
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}>
                  {r === 'salesman' ? '👤 Salesman' : '🧾 Accountant'}
                </button>
              ))}
            </div>
            <div>
              <label className="label">Full Name</label>
              <input className={`input ${formErrors.name ? 'input-error' : ''}`}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name" />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            {form.role === 'salesman' && (
              <div>
                <label className="label">Phone Number</label>
                <input className={`input ${formErrors.phone ? 'input-error' : ''}`}
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210" inputMode="numeric" />
                {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
              </div>
            )}
            <div>
              <label className="label">Email Address</label>
              <input type="email" className={`input ${formErrors.email ? 'input-error' : ''}`}
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="member@company.com" />
              {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
            </div>
            <div>
              <label className="label">Password (min 12 characters)</label>
              <input type="password" className={`input ${formErrors.password ? 'input-error' : ''}`}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••••••" />
              {formErrors.password && <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>}
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Creating…' : 'Create Member'}
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['all', 'salesman', 'accountant'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] border transition-colors ${
              filter === f ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'
            }`}>
            {f === 'all' ? 'All' : f === 'salesman' ? 'Salesmen' : 'Accountants'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No team members found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((member) => (
            <div key={member.uid} className="card flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{member.name}</span>
                  <span className={`badge ${member.role === 'salesman' ? 'badge-blue' : 'badge-yellow'}`}>
                    {member.role}
                  </span>
                  {member.role === 'salesman' && (
                    <span className={`badge ${member.dutyStatus === 'On Duty' ? 'badge-green' : 'badge-gray'}`}>
                      {member.dutyStatus}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 truncate mt-0.5">{member.email}</div>
                {member.phone && <div className="text-xs text-gray-400">{member.phone}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Fixed: added badge base class */}
                <span className={`badge ${member.isActive ? 'badge-green' : 'badge-red'}`}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => toggleActive(member)}
                  className={`text-xs px-3 py-1 rounded-lg min-h-[36px] font-medium transition-colors ${
                    member.isActive
                      ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  }`}>
                  {member.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
