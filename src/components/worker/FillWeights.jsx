import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, Scale } from 'lucide-react';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function FillWeights() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState(todayStr());
  const [shift, setShift] = useState('');
  const [pending, setPending] = useState([]);
  const [weights, setWeights] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ date });
      if (shift) params.set('shift', shift);
      const res = await authFetch(`/api/reports/pending-weights?${params}`);
      const { pending: items } = await res.json();
      setPending(items || []);
      setWeights({});
      setSaved({});
    } catch {
      setError('Failed to load pending charges');
    } finally {
      setLoading(false);
    }
  }, [date, shift, authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (tav) => {
    const w = weights[tav.tavId];
    if (!w && w !== 0) return;
    setSaving((s) => ({ ...s, [tav.tavId]: true }));
    try {
      const res = await authFetch(`/api/reports/${tav.reportId}/tav/${tav.tavId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalWeight: w }),
      });
      if (!res.ok) throw new Error('Failed');
      setSaved((s) => ({ ...s, [tav.tavId]: true }));
    } catch {
      setError('Failed to save weight — try again');
    } finally {
      setSaving((s) => ({ ...s, [tav.tavId]: false }));
    }
  };

  const unsaved = pending.filter((t) => !saved[t.tavId]);

  const grouped = unsaved.reduce((acc, t) => {
    const key = t.furnaceId || '?';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-orange-600 min-h-[48px] flex items-center">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-orange-600" />
          <div>
            <h1 className="font-bold text-gray-900">Fill Weights</h1>
            <p className="text-xs text-gray-400">
              {loading ? 'Loading…' : `${unsaved.length} charge${unsaved.length !== 1 ? 's' : ''} pending`}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Date / Shift filter */}
        <div className="bg-white rounded-xl p-4 flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">All Shifts</option>
              <option>1st Shift</option>
              <option>2nd Shift</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && unsaved.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
            <CheckCircle size={48} className="text-green-400" />
            <p className="font-semibold text-gray-700">All weights filled</p>
            <p className="text-sm text-gray-400">No pending charges for this date / shift</p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([furnaceId, tavs]) => (
          <div key={furnaceId} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <span className="text-sm font-bold text-orange-800">{FURNACE_LABELS[furnaceId] || furnaceId}</span>
              <span className="text-xs text-orange-500 font-medium">{tavs.length} pending · {tavs[0]?.reportShift}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {tavs.map((tav) => (
                <div key={tav.tavId} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      Charge #{tav.seqNo}
                      {tav.grade ? <span className="text-gray-500 font-normal"> · Grade {tav.grade}</span> : ''}
                    </p>
                    {(tav.startTime || tav.endTime) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {tav.startTime || '?'} – {tav.endTime || '?'}
                        {tav.temperature ? ` · ${tav.temperature}°C` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      value={weights[tav.tavId] ?? ''}
                      min="0" step="any"
                      placeholder="kg"
                      onChange={(e) => setWeights((w) => ({ ...w, [tav.tavId]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(tav)}
                      className="w-24 border border-gray-300 rounded-lg px-2 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSave(tav)}
                      disabled={!weights[tav.tavId] || saving[tav.tavId]}
                      className="bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-sm font-bold rounded-lg px-4 py-2.5 transition-colors min-w-[60px] text-center">
                      {saving[tav.tavId] ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
