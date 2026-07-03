import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle, Settings } from 'lucide-react';
import { getSession } from './SessionSetup';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

const EMPTY = () => ({ finalWeight: '', startTime: '', endTime: '', energyMeterReading: '', temperature: '' });

function isFilled(c) {
  return c.finalWeight !== '' || c.startTime !== '' || c.endTime !== '' || c.energyMeterReading !== '' || c.temperature !== '';
}

function ChargeCard({ index, charge, expanded, onToggle, onChange, onDelete, isLast }) {
  const filled = isFilled(charge);

  return (
    <div className={`rounded-xl border transition-colors ${expanded ? 'border-orange-300 bg-orange-50' : filled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            filled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>{index + 1}</span>
          {filled ? (
            <span className="text-sm text-gray-700">
              {charge.finalWeight ? `${charge.finalWeight} kg` : '—'}
              {charge.startTime ? ` · ${charge.startTime}` : ''}
              {charge.endTime ? `–${charge.endTime}` : ''}
              {charge.temperature ? ` · ${charge.temperature}°C` : ''}
            </span>
          ) : (
            <span className="text-sm text-gray-400">Tap to fill</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isLast && filled && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(index); }}
              className="text-red-400 hover:text-red-600 p-1">
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={18} className="text-orange-500" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Final Weight (kg)</label>
            <input type="number" value={charge.finalWeight} onChange={(e) => onChange(index, 'finalWeight', e.target.value)}
              placeholder="e.g. 261.300" min="0" step="any" autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <input type="text" value={charge.startTime} onChange={(e) => onChange(index, 'startTime', e.target.value)}
                placeholder="08:30" maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
              <input type="text" value={charge.endTime} onChange={(e) => onChange(index, 'endTime', e.target.value)}
                placeholder="10:15" maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Energy Meter</label>
              <input type="number" value={charge.energyMeterReading} onChange={(e) => onChange(index, 'energyMeterReading', e.target.value)}
                placeholder="kWh" min="0" step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temperature (°C)</label>
              <input type="number" value={charge.temperature} onChange={(e) => onChange(index, 'temperature', e.target.value)}
                placeholder="°C" min="0" step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
            </div>
          </div>
          {/* Auto-advance to next on enter-like tap */}
          <button type="button" onClick={onToggle}
            className="w-full bg-orange-100 text-orange-700 font-semibold rounded-lg py-2 text-sm">
            Done with this charge ↑
          </button>
        </div>
      )}
    </div>
  );
}

export default function BatchEntry() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const session = getSession();

  const [charges, setCharges] = useState(() => Array.from({ length: 18 }, EMPTY));
  const [expanded, setExpanded] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 gap-4 text-center">
        <p className="text-gray-600">No active session. Set up your furnace details first.</p>
        <button onClick={() => navigate('/session-setup?mode=batch')}
          className="bg-orange-600 text-white font-bold rounded-2xl px-6 py-3">
          Start Session
        </button>
      </div>
    );
  }

  const handleChange = (i, key, val) => {
    setCharges((prev) => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  };

  const handleToggle = (i) => {
    setExpanded((prev) => {
      if (prev === i) {
        // Collapse current, auto-open next unfilled
        const nextUnfilled = charges.findIndex((c, idx) => idx > i && !isFilled(c));
        return nextUnfilled !== -1 ? nextUnfilled : null;
      }
      return i;
    });
  };

  const handleDelete = (i) => {
    setCharges((prev) => prev.filter((_, idx) => idx !== i));
    setExpanded(null);
  };

  const addCharge = () => {
    setCharges((prev) => [...prev, EMPTY()]);
    setExpanded(charges.length);
  };

  const filledCharges = charges.filter(isFilled);

  const handleSubmit = async () => {
    if (filledCharges.length === 0) { setError('Fill in at least one charge before submitting'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/reports/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...session, charges: filledCharges }),
      });
      if (!res.ok) { const { message } = await res.json(); throw new Error(message || 'Failed to submit'); }
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 text-center gap-5">
        <CheckCircle size={56} className="text-green-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">{filledCharges.length} Charges Submitted</h2>
          <p className="text-sm text-gray-500 mt-1">
            {FURNACE_LABELS[session.furnaceId] || session.furnaceId} · {session.shift} · {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <button onClick={() => navigate('/session-setup?mode=batch')}
          className="w-full max-w-xs bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl py-4">
          Log Another Batch
        </button>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 underline">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-orange-600 min-h-[48px] flex items-center">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-gray-900 text-sm">End-of-Shift Entry</h1>
          <p className="text-xs text-gray-400">{filledCharges.length}/{charges.length} filled</p>
        </div>
        <button onClick={() => navigate('/session-setup?mode=batch')} className="text-gray-400 hover:text-orange-600 min-h-[48px] flex items-center">
          <Settings size={18} />
        </button>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {/* Session banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-orange-800">{FURNACE_LABELS[session.furnaceId] || session.furnaceId}</span>
            <span className="text-xs text-orange-400">{session.shift} · {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          {(session.operator || session.grade || session.lotNo) && (
            <p className="text-orange-600 text-xs mt-0.5">
              {[session.operator, session.grade && `Grade ${session.grade}`, session.lotNo].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

        <p className="text-xs text-gray-400 px-1">Tap each charge to fill in the details. Unfilled charges are skipped on submit.</p>

        {/* Charge cards */}
        {charges.map((c, i) => (
          <ChargeCard
            key={i}
            index={i}
            charge={c}
            expanded={expanded === i}
            onToggle={() => handleToggle(i)}
            onChange={handleChange}
            onDelete={handleDelete}
            isLast={charges.length === 1}
          />
        ))}

        {/* Add charge */}
        <button type="button" onClick={addCharge}
          className="w-full border-2 border-dashed border-gray-300 text-gray-500 rounded-xl py-3 flex items-center justify-center gap-2 text-sm hover:border-orange-300 hover:text-orange-600 transition-colors">
          <Plus size={16} /> Add Charge
        </button>

        {/* Submit */}
        <div className="pt-2 pb-6">
          <button type="button" onClick={handleSubmit} disabled={saving || filledCharges.length === 0}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-2xl py-4 text-base transition-colors">
            {saving ? 'Submitting…' : `Submit ${filledCharges.length} Charge${filledCharges.length !== 1 ? 's' : ''}`}
          </button>
          {filledCharges.length < charges.length && (
            <p className="text-center text-xs text-gray-400 mt-2">
              {charges.length - filledCharges.length} empty charge{charges.length - filledCharges.length !== 1 ? 's' : ''} will be skipped
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
