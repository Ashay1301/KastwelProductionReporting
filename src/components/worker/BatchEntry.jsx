import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle, Settings, ChevronRight, LayoutList, Table2 } from 'lucide-react';
import { getSession } from './SessionSetup';

const FURNACES = ['A', 'B', 'A2', 'B2', 'C2'];
const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function computeLotNo(dateStr, grade) {
  if (!grade) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year.slice(-2)}${month}${day}/${grade}`;
}

function addOneMinute(timeStr) {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const total = h * 60 + m + 1;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function isFilled(c) {
  return c.finalWeight !== '' || c.startTime !== '' || c.endTime !== '' || c.energyMeterReading !== '' || c.temperature !== '';
}

function isComplete(c) {
  return c.startTime !== '' && c.endTime !== '' && c.energyMeterReading !== '' && c.temperature !== '' && c.finalWeight !== '';
}

function isPartial(c) {
  return isFilled(c) && !isComplete(c);
}

function hasOverride(c, session) {
  return (c.furnaceId && c.furnaceId !== session?.furnaceId) ||
    (c.operator && c.operator !== session?.operator) ||
    (c.grade && c.grade !== session?.grade);
}

// ─── Card view ───────────────────────────────────────────────────────────────

function ChargeCard({ index, charge, session, expanded, onToggle, onChange, onDelete, isOnly }) {
  const [showOverride, setShowOverride] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const filled = isFilled(charge);
  const partial = isPartial(charge);
  const overridden = hasOverride(charge, session);

  const effectiveFurnace = charge.furnaceId || session?.furnaceId || '';
  const effectiveOperator = charge.operator !== undefined ? charge.operator : (session?.operator || '');
  const effectiveGrade = charge.grade !== undefined ? charge.grade : (session?.grade || '');

  return (
    <div className={`rounded-xl border transition-colors ${expanded ? 'border-orange-300 bg-orange-50' : partial ? 'border-amber-200 bg-amber-50' : filled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            partial ? 'bg-amber-400 text-white' : filled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>{index + 1}</span>
          <div className="text-left">
            {filled ? (
              <>
                <p className="text-sm text-gray-700">
                  {effectiveGrade ? `Grade ${effectiveGrade}` : ''}
                  {(charge.startTime || charge.endTime)
                    ? `${effectiveGrade ? ' · ' : ''}${charge.startTime || '?'} – ${charge.endTime || '?'}`
                    : ''}
                  {charge.energyMeterReading ? ` · ${charge.energyMeterReading} kWh` : ''}
                  {charge.temperature ? ` · ${charge.temperature}°C` : ''}
                </p>
                <p className={`text-xs mt-0.5 font-semibold ${charge.finalWeight !== '' ? 'text-green-700' : 'text-gray-400'}`}>
                  {charge.finalWeight !== '' ? `${charge.finalWeight} kg` : 'Weight not filled'}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Tap to fill</p>
            )}
            {overridden && (
              <p className="text-xs text-orange-500 mt-0.5">
                {FURNACE_LABELS[effectiveFurnace] || effectiveFurnace}
                {effectiveOperator ? ` · ${effectiveOperator}` : ''}
                {effectiveGrade ? ` · ${effectiveGrade}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOnly && filled && (
            pendingDelete ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => onDelete(index)}
                  className="text-xs text-white bg-red-500 hover:bg-red-600 font-bold px-2 py-0.5 rounded">
                  Delete
                </button>
                <button type="button" onClick={() => setPendingDelete(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={(e) => { e.stopPropagation(); setPendingDelete(true); }}
                className="text-gray-300 hover:text-red-400 p-1 transition-colors">
                <Trash2 size={14} />
              </button>
            )
          )}
          {expanded ? <ChevronUp size={18} className="text-orange-500" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <input type="text" value={charge.startTime} onChange={(e) => onChange(index, 'startTime', e.target.value)}
                placeholder="08:30" maxLength={5} autoFocus
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Final Weight (kg)</label>
            <input type="number" value={charge.finalWeight} onChange={(e) => onChange(index, 'finalWeight', e.target.value)}
              placeholder="e.g. 261.300" min="0" step="any"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
          </div>

          <button type="button" onClick={() => setShowOverride((s) => !s)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors py-1">
            <ChevronRight size={13} className={`transition-transform ${showOverride ? 'rotate-90' : ''}`} />
            {overridden ? <span className="text-orange-600 font-semibold">Overrides active</span> : 'Different furnace / operator / grade for this charge?'}
          </button>

          {showOverride && (
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <p className="text-xs text-gray-400">Leave blank to use the session default</p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Furnace</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {FURNACES.map((id) => (
                    <button key={id} type="button"
                      onClick={() => onChange(index, 'furnaceId', charge.furnaceId === id ? '' : id)}
                      className={`py-2 rounded-md text-xs font-bold border transition-colors ${
                        (charge.furnaceId || session?.furnaceId) === id && charge.furnaceId
                          ? 'bg-orange-600 text-white border-orange-600'
                          : charge.furnaceId === '' && session?.furnaceId === id
                          ? 'bg-gray-100 text-gray-500 border-gray-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                      }`}>
                      {id}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Currently: {FURNACE_LABELS[effectiveFurnace] || effectiveFurnace}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Operator</label>
                  <input type="text" value={charge.operator ?? ''} onChange={(e) => onChange(index, 'operator', e.target.value)}
                    placeholder={session?.operator || 'Name'}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <input type="text" value={charge.grade ?? ''} onChange={(e) => onChange(index, 'grade', e.target.value)}
                    placeholder={session?.grade || 'e.g. 819'}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

            </div>
          )}

          <button type="button" onClick={onToggle}
            className="w-full bg-orange-100 text-orange-700 font-semibold rounded-lg py-2 text-sm hover:bg-orange-200 transition-colors">
            Done with this charge ↑
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Grid view ───────────────────────────────────────────────────────────────

function BatchGrid({ charges, session, onChange, onDelete, addCharge }) {
  const [pendingDeleteRow, setPendingDeleteRow] = useState(null);

  const cell = (overridden) =>
    `w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 ${
      overridden ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-gray-200 bg-white text-gray-800'
    }`;

  const handleStartFocus = (i) => {
    if (!charges[i].startTime && i > 0) {
      const suggested = addOneMinute(charges[i - 1]?.endTime);
      if (suggested) onChange(i, 'startTime', suggested);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="text-sm border-collapse" style={{ minWidth: 880 }}>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 text-center w-10 border-r border-gray-200">#</th>
            <th className="px-2 py-2.5 text-left min-w-[90px]">Furnace</th>
            <th className="px-2 py-2.5 text-left min-w-[110px]">Operator</th>
            <th className="px-2 py-2.5 text-left min-w-[70px]">Grade</th>
            <th className="px-2 py-2.5 text-left min-w-[75px]">Start</th>
            <th className="px-2 py-2.5 text-left min-w-[75px]">End</th>
            <th className="px-2 py-2.5 text-left min-w-[85px]">Energy</th>
            <th className="px-2 py-2.5 text-left min-w-[75px]">Temp °C</th>
            <th className="px-2 py-2.5 text-left min-w-[95px]">Weight (kg)</th>
            <th className="px-2 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c, i) => {
            const furnaceOverridden = !!c.furnaceId && c.furnaceId !== session?.furnaceId;
            const operatorOverridden = !!c.operator && c.operator !== session?.operator;
            const gradeOverridden = !!c.grade && c.grade !== session?.grade;
            const filled = isFilled(c);

            return (
              <tr key={i} className={`border-t border-gray-100 transition-colors hover:bg-gray-50/50 ${filled ? 'bg-green-50/20' : ''}`}>
                <td className="sticky left-0 bg-white px-3 py-2 text-center border-r border-gray-100">
                  <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                    filled ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>{i + 1}</span>
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={c.furnaceId || session?.furnaceId || FURNACES[0]}
                    onChange={(e) => onChange(i, 'furnaceId', e.target.value)}
                    className={cell(furnaceOverridden)}>
                    {FURNACES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" value={c.operator ?? ''} onChange={(e) => onChange(i, 'operator', e.target.value)}
                    placeholder={session?.operator || '—'} className={cell(operatorOverridden)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" value={c.grade ?? ''} onChange={(e) => onChange(i, 'grade', e.target.value)}
                    placeholder={session?.grade || '—'} className={cell(gradeOverridden)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" value={c.startTime} onChange={(e) => onChange(i, 'startTime', e.target.value)}
                    onFocus={() => handleStartFocus(i)}
                    placeholder="HH:MM" maxLength={5} className={cell(false)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" value={c.endTime} onChange={(e) => onChange(i, 'endTime', e.target.value)}
                    placeholder="HH:MM" maxLength={5} className={cell(false)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" value={c.energyMeterReading} onChange={(e) => onChange(i, 'energyMeterReading', e.target.value)}
                    placeholder="kWh" min="0" step="any" className={cell(false)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" value={c.temperature} onChange={(e) => onChange(i, 'temperature', e.target.value)}
                    placeholder="°C" min="0" step="any" className={cell(false)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" value={c.finalWeight} onChange={(e) => onChange(i, 'finalWeight', e.target.value)}
                    placeholder="kg" min="0" step="any" className={cell(false)} />
                </td>
                <td className="px-2 py-1.5 text-center" style={{ minWidth: 70 }}>
                  {charges.length > 1 && (
                    pendingDeleteRow === i ? (
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => { onDelete(i); setPendingDeleteRow(null); }}
                          className="text-xs text-white bg-red-500 hover:bg-red-600 font-bold px-1.5 py-0.5 rounded">
                          Del
                        </button>
                        <button type="button" onClick={() => setPendingDeleteRow(null)}
                          className="text-xs text-gray-400 px-1">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setPendingDeleteRow(i)}
                        className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50/50">
            <td colSpan={10} className="px-3 py-2">
              <button type="button" onClick={addCharge}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-600 transition-colors">
                <Plus size={14} /> Add Charge
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const EMPTY_CHARGE = () => ({
  furnaceId: '', operator: '', grade: '',
  finalWeight: '', startTime: '', endTime: '',
  energyMeterReading: '', temperature: '',
});

export default function BatchEntry() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const session = getSession();

  const [charges, setCharges] = useState(() => Array.from({ length: 18 }, EMPTY_CHARGE));
  const [expanded, setExpanded] = useState(0);
  const [layout, setLayout] = useState(() => localStorage.getItem('production_batch_layout') || 'card');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 gap-4 text-center">
        <p className="text-gray-600">No active session. Set up your furnace details first.</p>
        <button onClick={() => navigate('/session-setup?mode=batch')}
          className="bg-orange-600 text-white font-bold rounded-2xl px-6 py-3">Start Session</button>
      </div>
    );
  }

  const SESSION_FIELDS = ['furnaceId', 'operator', 'grade'];

  const handleChange = (i, key, val) => {
    setCharges((prev) => prev.map((c, idx) => {
      if (idx === i) return { ...c, [key]: val };
      if (idx > i && SESSION_FIELDS.includes(key)) return { ...c, [key]: val };
      return c;
    }));
  };

  const handleToggle = (i) => {
    setExpanded((prev) => {
      if (prev === i) {
        const nextUnfilled = charges.findIndex((c, idx) => idx > i && !isFilled(c));
        const next = nextUnfilled !== -1 ? nextUnfilled : null;
        if (next !== null) autoFillStartTime(next, charges);
        return next;
      }
      autoFillStartTime(i, charges);
      return i;
    });
  };

  const autoFillStartTime = (i, currentCharges) => {
    if (i === 0) return;
    const prevEnd = currentCharges[i - 1]?.endTime;
    const suggested = addOneMinute(prevEnd);
    if (suggested && !currentCharges[i].startTime) {
      setCharges((prev) => prev.map((c, idx) => idx === i && !c.startTime ? { ...c, startTime: suggested } : c));
    }
  };

  const handleDelete = (i) => {
    setCharges((prev) => prev.filter((_, idx) => idx !== i));
    setExpanded(null);
  };

  const addCharge = () => {
    const newIdx = charges.length;
    setCharges((prev) => [...prev, EMPTY_CHARGE()]);
    setTimeout(() => autoFillStartTime(newIdx, charges), 0);
    setExpanded(newIdx);
  };

  const switchLayout = (l) => {
    setLayout(l);
    localStorage.setItem('production_batch_layout', l);
  };

  const resolveCharge = (c) => {
    const grade = c.grade !== '' ? c.grade : session.grade;
    return {
    furnaceId: c.furnaceId || session.furnaceId,
    operator: c.operator !== '' ? c.operator : session.operator,
    grade,
    lotNo: computeLotNo(session.date, grade),
    finalWeight: c.finalWeight,
    startTime: c.startTime,
    endTime: c.endTime,
    energyMeterReading: c.energyMeterReading,
    temperature: c.temperature,
  };
  };

  const filledCharges = charges.filter(isFilled).map(resolveCharge);

  const handleSubmit = async () => {
    if (filledCharges.length === 0) { setError('Fill in at least one charge before submitting'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/reports/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: session.date, shift: session.shift, charges: filledCharges }),
      });
      if (!res.ok) { const { message } = await res.json(); throw new Error(message || 'Failed to submit'); }
      setSubmittedCount(filledCharges.length);
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
          <h2 className="text-xl font-bold text-gray-900">{submittedCount} Charges Submitted</h2>
          <p className="text-sm text-gray-500 mt-1">
            {FURNACE_LABELS[session.furnaceId] || session.furnaceId} · {session.shift} · {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <button onClick={() => navigate('/session-setup?mode=batch')}
          className="w-full max-w-xs bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl py-4">
          Log Another Batch
        </button>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 underline">Back to Home</button>
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => switchLayout('card')}
            title="Card view"
            className={`p-2 rounded-lg transition-colors ${layout === 'card' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <LayoutList size={18} />
          </button>
          <button
            onClick={() => switchLayout('grid')}
            title="Grid view"
            className={`p-2 rounded-lg transition-colors ${layout === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <Table2 size={18} />
          </button>
          <button onClick={() => navigate('/session-setup?mode=batch')}
            className="text-gray-400 hover:text-orange-600 p-2 ml-1 min-h-[48px] flex items-center">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className={`${layout === 'grid' ? 'px-4' : 'max-w-xl mx-auto px-4'} py-4 space-y-4`}>
        {/* Session banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-orange-800">{FURNACE_LABELS[session.furnaceId] || session.furnaceId}</span>
            <span className="text-xs text-orange-400">{session.shift} · {new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          {(session.operator || session.grade) && (
            <p className="text-orange-600 text-xs mt-0.5">
              {[session.operator, session.grade && `Grade ${session.grade}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

        {layout === 'card' && (
          <p className="text-xs text-gray-400 px-1">
            Start time is auto-filled from the previous charge's end time +1 min. Tap any charge to override furnace/operator/grade.
          </p>
        )}

        {layout === 'grid' && (
          <p className="text-xs text-gray-400 px-1">
            Orange cells indicate values that differ from the session default and cascade to all rows below. Start time auto-fills on focus.
          </p>
        )}

        {layout === 'card' ? (
          <>
            {charges.map((c, i) => (
              <ChargeCard
                key={i}
                index={i}
                charge={c}
                session={session}
                expanded={expanded === i}
                onToggle={() => handleToggle(i)}
                onChange={handleChange}
                onDelete={handleDelete}
                isOnly={charges.length === 1}
              />
            ))}

            <button type="button" onClick={addCharge}
              className="w-full border-2 border-dashed border-gray-300 text-gray-500 rounded-xl py-3 flex items-center justify-center gap-2 text-sm hover:border-orange-300 hover:text-orange-600 transition-colors">
              <Plus size={16} /> Add Charge
            </button>
          </>
        ) : (
          <BatchGrid
            charges={charges}
            session={session}
            onChange={handleChange}
            onDelete={handleDelete}
            addCharge={addCharge}
          />
        )}

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
