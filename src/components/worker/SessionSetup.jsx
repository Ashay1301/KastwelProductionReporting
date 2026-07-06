import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const FURNACES = ['A', 'B', 'A2', 'B2', 'C2'];
const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem('production_session') || 'null'); } catch { return null; }
}

export function saveSession(s) {
  localStorage.setItem('production_session', JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem('production_session');
}

export default function SessionSetup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') || 'realtime';

  const existing = getSession();
  const [form, setForm] = useState({
    date: existing?.date || todayStr(),
    shift: existing?.shift || '1st Shift',
    furnaceId: existing?.furnaceId || '',
    operator: existing?.operator || '',
    grade: existing?.grade || '',
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleStart = (e) => {
    e.preventDefault();
    if (!form.furnaceId) { setError('Please select a furnace'); return; }
    saveSession(form);
    navigate(mode === 'batch' ? '/batch-entry' : '/log-charge');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-orange-600 min-h-[48px] flex items-center">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Session Setup</h1>
          <p className="text-xs text-gray-400">{mode === 'batch' ? 'End-of-shift entry' : 'Real-time entry'}</p>
        </div>
      </header>

      <form onSubmit={handleStart} className="max-w-xl mx-auto px-4 py-5 space-y-4">
        <p className="text-sm text-gray-500">
          Set the details that stay the same for all charges in this batch. You only need to do this once per furnace run.
        </p>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

        {form.date && form.date !== todayStr() && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
            Session date is <strong>{new Date(form.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> — is that correct?
          </div>
        )}

        <div className="bg-white rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select value={form.shift} onChange={(e) => set('shift', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option>1st Shift</option>
                <option>2nd Shift</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Furnace</label>
            <div className="grid grid-cols-5 gap-2">
              {FURNACES.map((id) => (
                <button key={id} type="button" onClick={() => set('furnaceId', id)}
                  className={`py-2.5 rounded-lg text-xs font-bold border transition-colors leading-tight ${
                    form.furnaceId === id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                  }`}>
                  {FURNACE_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <input type="text" value={form.operator} onChange={(e) => set('operator', e.target.value)}
                placeholder="Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <input type="text" value={form.grade} onChange={(e) => set('grade', e.target.value)}
                placeholder="e.g. 819"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

        </div>

        <button type="submit"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl py-4 text-base transition-colors">
          {mode === 'batch' ? 'Start Entering Charges →' : 'Start Logging →'}
        </button>
      </form>
    </div>
  );
}
