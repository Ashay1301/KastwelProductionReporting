import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Pencil, X, Check } from 'lucide-react';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'worker' };

export default function UserManagement() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    authFetch('/api/users').then((r) => r.json()).then(({ users }) => setUsers(users || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const { message } = await res.json(); throw new Error(message); }
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id) => {
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    if (user.isActive && !window.confirm(`Disable ${user.name}? They will not be able to log in.`)) return;
    await authFetch(`/api/users/${user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link to="/admin" className="flex items-center gap-1 text-orange-600 font-medium min-h-[48px]">
          <ArrowLeft size={18} /> Dashboard
        </Link>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setError(''); }}
          className="flex items-center gap-1 bg-orange-600 text-white text-sm font-semibold rounded-lg px-3 py-2"
        >
          <Plus size={15} /> Add User
        </button>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

        {showAdd && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border-2 border-orange-200 p-4 space-y-3">
            <h2 className="text-sm font-bold text-orange-700">New User</h2>
            <input type="text" placeholder="Full name" value={form.name} onChange={(e) => setF('name', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setF('email', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setF('password', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <select value={form.role} onChange={(e) => setF('role', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60">
                {saving ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u._id} className={`bg-white rounded-xl border ${u.isActive ? 'border-gray-100' : 'border-red-100 opacity-60'} p-4`}>
                {editId === u._id ? (
                  <div className="space-y-2">
                    <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    <input type="password" value={editForm.password || ''} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="New password (leave blank to keep)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    <select value={editForm.role || u.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => setEditId(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1">
                        <X size={14} /> Cancel
                      </button>
                      <button onClick={() => handleUpdate(u._id)} disabled={saving} className="flex-1 bg-orange-600 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
                        <Check size={14} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email} · <span className="capitalize">{u.role}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditId(u._id); setEditForm({ name: u.name, role: u.role }); setShowAdd(false); setError(''); }}
                        className="p-2 text-gray-400 hover:text-orange-600"><Pencil size={16} /></button>
                      <button onClick={() => toggleActive(u)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
