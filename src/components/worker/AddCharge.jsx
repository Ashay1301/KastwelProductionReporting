import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const FURNACES = ['A', 'B', 'A2', 'B2', 'C2'];
const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY = {
  date: todayStr(),
  shift: '1st Shift',
  furnaceId: '',
  operator: '',
  grade: '',
  finalWeight: '',
  startTime: '',
  endTime: '',
  energyMeterReading: '',
  temperature: '',
};

export default function AddCharge() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.furnaceId) { setError('Please select a furnace'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await authFetch('/api/reports/tav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          finalWeight: form.finalWeight !== '' ? Number(form.finalWeight) : undefined,
          energyMeterReading: form.energyMeterReading !== '' ? Number(form.energyMeterReading) : undefined,
          temperature: form.temperature !== '' ? Number(form.temperature) : undefined,
        }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || 'Failed to save');
      }
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 text-center gap-5">
        <CheckCircle size={56} className="text-green-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Charge Logged</h2>
          <p className="text-sm text-gray-500 mt-1">
            {FURNACE_LABELS[form.furnaceId]} — {form.shift}
          </p>
        </div>
        <button
          onClick={() => { setSaved(false); setForm((f) => ({ ...f, furnaceId: '', operator: '', grade: '', finalWeight: '', startTime: '', endTime: '', energyMeterReading: '', temperature: '' })); }}
          className="w-full max-w-xs bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl py-4"
        >
          Log Another Charge
        </button>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 underline">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-orange-600 min-h-[48px] flex items-center">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Log Charge</h1>
      </header>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-xl p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Shift Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select
                value={form.shift}
                onChange={(e) => set('shift', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option>1st Shift</option>
                <option>2nd Shift</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Furnace</label>
            <div className="grid grid-cols-5 gap-2">
              {FURNACES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set('furnaceId', id)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    form.furnaceId === id
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Charge Details</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <input
                type="text"
                value={form.operator}
                onChange={(e) => set('operator', e.target.value)}
                placeholder="Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <input
                type="text"
                value={form.grade}
                onChange={(e) => set('grade', e.target.value)}
                placeholder="e.g. MS60"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Weight (kg)</label>
            <input
              type="number"
              value={form.finalWeight}
              onChange={(e) => set('finalWeight', e.target.value)}
              placeholder="0"
              min="0"
              step="any"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Energy Meter Reading</label>
              <input
                type="number"
                value={form.energyMeterReading}
                onChange={(e) => set('energyMeterReading', e.target.value)}
                placeholder="kWh"
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input
                type="number"
                value={form.temperature}
                onChange={(e) => set('temperature', e.target.value)}
                placeholder="°C"
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-base transition-colors"
        >
          {saving ? 'Saving…' : 'Save Charge'}
        </button>
      </form>
    </div>
  );
}
