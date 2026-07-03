import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, Settings } from 'lucide-react';
import { getSession } from './SessionSetup';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

const EMPTY_CHARGE = { finalWeight: '', startTime: '', endTime: '', energyMeterReading: '', temperature: '' };

export default function AddCharge() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const session = getSession();

  const [charge, setCharge] = useState(EMPTY_CHARGE);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 gap-4 text-center">
        <p className="text-gray-600">No active session. Set up your furnace details first.</p>
        <button onClick={() => navigate('/session-setup?mode=realtime')}
          className="bg-orange-600 text-white font-bold rounded-2xl px-6 py-3">
          Start Session
        </button>
      </div>
    );
  }

  const set = (k, v) => setCharge((c) => ({ ...c, [k]: v }));

  const handleSave = async (andDone = false) => {
    setError('');
    setSaving(true);
    try {
      const res = await authFetch('/api/reports/tav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...session, ...charge }),
      });
      if (!res.ok) { const { message } = await res.json(); throw new Error(message || 'Failed to save'); }
      const newCount = count + 1;
      setCount(newCount);
      setLastSaved({ ...charge, seqNo: newCount });
      setCharge(EMPTY_CHARGE);
      if (andDone) navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-orange-600 min-h-[48px] flex items-center">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Log Charge</h1>
        <button onClick={() => navigate('/session-setup?mode=realtime')} className="text-gray-400 hover:text-orange-600 min-h-[48px] flex items-center">
          <Settings size={18} />
        </button>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Locked session banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-bold text-orange-800">{FURNACE_LABELS[session.furnaceId] || session.furnaceId}</span>
              {session.operator && <span className="text-orange-700"> · {session.operator}</span>}
              {session.grade && <span className="text-orange-600"> · Grade {session.grade}</span>}
              {session.lotNo && <span className="text-orange-500"> · {session.lotNo}</span>}
            </div>
            <span className="text-xs text-orange-400">{session.shift}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-orange-500">{new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            {count > 0 && <p className="text-xs font-bold text-orange-600">{count} charge{count !== 1 ? 's' : ''} logged this session</p>}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Last saved confirmation */}
        {lastSaved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle size={16} />
            <span>Charge #{lastSaved.seqNo} saved — {lastSaved.finalWeight ? `${lastSaved.finalWeight} kg` : 'no weight'} · {lastSaved.startTime || '?'}–{lastSaved.endTime || '?'}</span>
          </div>
        )}

        {/* Charge number */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-gray-800">Charge #{count + 1}</h2>
          <p className="text-xs text-gray-400">Fill only the changing fields</p>
        </div>

        <div className="bg-white rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Weight (kg)</label>
            <input type="number" value={charge.finalWeight} onChange={(e) => set('finalWeight', e.target.value)}
              placeholder="e.g. 261.300" min="0" step="any" autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="text" value={charge.startTime} onChange={(e) => set('startTime', e.target.value)}
                placeholder="e.g. 08:30" maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="text" value={charge.endTime} onChange={(e) => set('endTime', e.target.value)}
                placeholder="e.g. 10:15" maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Energy Meter</label>
              <input type="number" value={charge.energyMeterReading} onChange={(e) => set('energyMeterReading', e.target.value)}
                placeholder="kWh reading" min="0" step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input type="number" value={charge.temperature} onChange={(e) => set('temperature', e.target.value)}
                placeholder="°C" min="0" step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => handleSave(false)} disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-sm transition-colors">
            {saving ? 'Saving…' : 'Save & Next →'}
          </button>
          <button type="button" onClick={() => handleSave(true)} disabled={saving}
            className="bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-sm transition-colors">
            Save & Done
          </button>
        </div>

        <button onClick={() => navigate('/')} className="w-full text-sm text-gray-400 py-2 underline">
          Back to Home (without saving)
        </button>
      </div>
    </div>
  );
}
