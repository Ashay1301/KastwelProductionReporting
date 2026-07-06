import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getSession, saveSession } from './SessionSetup';

const FURNACES = ['A', 'B', 'A2', 'B2', 'C2'];
const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function addOneMinute(timeStr) {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const total = h * 60 + m + 1;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function computeLotNo(dateStr, grade) {
  if (!grade) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year.slice(-2)}${month}${day}/${grade}`;
}

const emptyCharge = (startTime = '') => ({
  startTime,
  endTime: '',
  energyMeterReading: '',
  temperature: '',
  finalWeight: '',
});

export default function AddCharge() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(() => getSession());
  const [charge, setCharge] = useState(() => emptyCharge());
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});

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

  const openEdit = () => {
    setEditForm({ furnaceId: session.furnaceId, operator: session.operator, grade: session.grade });
    setShowEdit(true);
  };

  const applyEdit = () => {
    const updated = { ...session, ...editForm };
    saveSession(updated);
    setSession(updated);
    setShowEdit(false);
  };

  const handleSave = async (andDone = false) => {
    const allEmpty = !charge.startTime && !charge.endTime && !charge.energyMeterReading && !charge.temperature && !charge.finalWeight;
    if (allEmpty) { setError('Fill in at least one field before saving'); return; }
    setError('');
    setSaving(true);
    try {
      const lotNo = computeLotNo(session.date, session.grade);
      const res = await authFetch('/api/reports/tav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...session, ...charge, lotNo }),
      });
      if (!res.ok) { const { message } = await res.json(); throw new Error(message || 'Failed to save'); }
      const newCount = count + 1;
      setCount(newCount);
      setLastSaved({ ...charge, seqNo: newCount });
      setCharge(emptyCharge(addOneMinute(charge.endTime)));
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
        <div className="w-10" />
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Session banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-bold text-orange-800">{FURNACE_LABELS[session.furnaceId] || session.furnaceId}</span>
              {session.operator && <span className="text-orange-700"> · {session.operator}</span>}
              {session.grade && <span className="text-orange-600"> · Grade {session.grade}</span>}
            </div>
            <button
              onClick={() => showEdit ? setShowEdit(false) : openEdit()}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors">
              {showEdit ? <><ChevronUp size={13} /> Close</> : <><ChevronDown size={13} /> Change</>}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-orange-500">
              {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}{session.shift}
            </p>
            {count > 0 && <p className="text-xs font-bold text-orange-600">{count} charge{count !== 1 ? 's' : ''} logged</p>}
          </div>

          {/* Inline session editor */}
          {showEdit && (
            <div className="mt-3 pt-3 border-t border-orange-200 space-y-3">
              <div>
                <label className="block text-xs font-medium text-orange-700 mb-1.5">Furnace</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {FURNACES.map((id) => (
                    <button key={id} type="button"
                      onClick={() => setEditForm((f) => ({ ...f, furnaceId: id }))}
                      className={`py-2 rounded-md text-xs font-bold border transition-colors ${
                        editForm.furnaceId === id
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
                      }`}>
                      {id}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-orange-700 mb-1">Operator</label>
                  <input type="text" value={editForm.operator ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, operator: e.target.value }))}
                    className="w-full border border-orange-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-orange-700 mb-1">Grade</label>
                  <input type="text" value={editForm.grade ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value }))}
                    className="w-full border border-orange-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <button type="button" onClick={applyEdit}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg py-2 text-sm transition-colors">
                Apply for this and subsequent charges
              </button>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Last saved confirmation */}
        {lastSaved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle size={16} />
            <span>
              Charge #{lastSaved.seqNo} saved
              {lastSaved.startTime ? ` · ${lastSaved.startTime}–${lastSaved.endTime || '?'}` : ''}
              {lastSaved.finalWeight ? ` · ${lastSaved.finalWeight} kg` : ' · no weight'}
            </span>
          </div>
        )}

        {/* Charge number */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-gray-800">Charge #{count + 1}</h2>
          <p className="text-xs text-gray-400">Fill only the changing fields</p>
        </div>

        <div className="bg-white rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="text" value={charge.startTime} onChange={(e) => set('startTime', e.target.value)}
                placeholder="HH:MM" maxLength={5} autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="text" value={charge.endTime} onChange={(e) => set('endTime', e.target.value)}
                placeholder="HH:MM" maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Energy Meter</label>
              <input type="text" inputMode="decimal" value={charge.energyMeterReading} onChange={(e) => set('energyMeterReading', e.target.value)}
                placeholder="kWh reading"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input type="text" inputMode="decimal" value={charge.temperature} onChange={(e) => set('temperature', e.target.value)}
                placeholder="°C"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Weight (kg)</label>
            <input type="number" value={charge.finalWeight} onChange={(e) => set('finalWeight', e.target.value)}
              placeholder="e.g. 261.300" min="0" step="any"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
