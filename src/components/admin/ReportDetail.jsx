import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Download, Pencil, X, Check, Plus, Trash2 } from 'lucide-react';
import { exportSingleReport } from '../../utils/excelExport';

const FURNACES = ['A', 'B', 'A2', 'B2', 'C2'];
const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

const EMPTY_TAV = { furnaceId: '', operator: '', grade: '', finalWeight: '', startTime: '', endTime: '', energyMeterReading: '', temperature: '', loggedBy: '', seqNo: '' };

function TavRow({ tav, index, editing, onChange, onDelete }) {
  if (!editing) {
    return (
      <div className="border border-gray-100 rounded-lg p-3 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{FURNACE_LABELS[tav.furnaceId] || tav.furnaceId || '—'}</span>
          <span className="text-xs text-orange-600 font-semibold">#{tav.seqNo || index + 1}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {tav.operator && <Field label="Operator" value={tav.operator} />}
          {tav.grade && <Field label="Grade" value={tav.grade} />}
          {tav.finalWeight != null && <Field label="Weight" value={`${tav.finalWeight} kg`} />}
          {tav.startTime && <Field label="Start" value={tav.startTime} />}
          {tav.endTime && <Field label="End" value={tav.endTime} />}
          {tav.energyMeterReading != null && <Field label="Energy" value={`${tav.energyMeterReading} kWh`} />}
          {tav.temperature != null && <Field label="Temp" value={`${tav.temperature}°C`} />}
          {tav.loggedBy && <Field label="Logged by" value={tav.loggedBy} />}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="border-2 border-orange-300 rounded-lg p-3 bg-orange-50 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Editing Charge {index + 1}</span>
        <button type="button" onClick={() => onDelete(index)} className="text-red-500 hover:text-red-700">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Furnace</label>
          <select value={tav.furnaceId} onChange={(e) => onChange(index, 'furnaceId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">Select</option>
            {FURNACES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Operator</label>
          <input type="text" value={tav.operator || ''} onChange={(e) => onChange(index, 'operator', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
          <input type="text" value={tav.grade || ''} onChange={(e) => onChange(index, 'grade', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Final Weight (kg)</label>
          <input type="number" value={tav.finalWeight ?? ''} onChange={(e) => onChange(index, 'finalWeight', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
          <input type="time" value={tav.startTime || ''} onChange={(e) => onChange(index, 'startTime', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
          <input type="time" value={tav.endTime || ''} onChange={(e) => onChange(index, 'endTime', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Energy Meter</label>
          <input type="number" value={tav.energyMeterReading ?? ''} onChange={(e) => onChange(index, 'energyMeterReading', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Temperature (°C)</label>
          <input type="number" value={tav.temperature ?? ''} onChange={(e) => onChange(index, 'temperature', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedTavs, setEditedTavs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then(({ report }) => { setReport(report); setEditedTavs(report?.tavs || []); })
      .finally(() => setLoading(false));
  }, [id, authFetch]);

  const startEdit = () => { setEditedTavs(report.tavs.map((t) => ({ ...t }))); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setError(''); };

  const handleChange = (i, key, val) => {
    setEditedTavs((prev) => prev.map((t, idx) => idx === i ? { ...t, [key]: val } : t));
  };

  const handleDelete = (i) => {
    setEditedTavs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleAddTav = () => {
    setEditedTavs((prev) => [...prev, { ...EMPTY_TAV }]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const cleaned = editedTavs.map((t, i) => ({
        ...t,
        finalWeight: t.finalWeight !== '' && t.finalWeight != null ? Number(t.finalWeight) : undefined,
        energyMeterReading: t.energyMeterReading !== '' && t.energyMeterReading != null ? Number(t.energyMeterReading) : undefined,
        temperature: t.temperature !== '' && t.temperature != null ? Number(t.temperature) : undefined,
        seqNo: t.seqNo || i + 1,
      }));
      const res = await authFetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tavs: cleaned }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const { report: updated } = await res.json();
      setReport(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!report) return <div className="p-8 text-center text-gray-400">Report not found</div>;

  const tavs = editing ? editedTavs : (report.tavs || []);
  const furnaceIds = [...new Set(tavs.map((t) => t.furnaceId).filter(Boolean))].sort();
  const totalWeight = tavs.reduce((s, t) => s + (Number(t.finalWeight) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link to="/admin/reports" className="flex items-center gap-1 text-orange-600 font-medium min-h-[48px]">
          <ArrowLeft size={18} /> Reports
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={cancelEdit} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg px-3 py-2 min-h-[44px]">
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg px-3 py-2 min-h-[44px] disabled:opacity-60">
                <Check size={15} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg px-3 py-2 min-h-[44px]">
                <Pencil size={15} /> Edit
              </button>
              <button onClick={() => exportSingleReport(report)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-3 py-2 min-h-[44px]">
                <Download size={15} /> Excel
              </button>
            </>
          )}
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {new Date(report.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </h1>
            <p className="text-sm text-gray-500">{report.shift} — {report.submissionId}</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Grand total */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <span className="text-base font-bold text-orange-900">Grand Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-orange-700">{totalWeight} kg</span>
            <p className="text-xs text-orange-500">{tavs.length} charges</p>
          </div>
        </div>

        {/* Per-furnace sections */}
        {furnaceIds.map((fid) => {
          const fTavs = tavs.map((t, i) => ({ ...t, _idx: i })).filter((t) => t.furnaceId === fid);
          const fWeight = fTavs.reduce((s, t) => s + (Number(t.finalWeight) || 0), 0);
          return (
            <div key={fid} className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-gray-700">{FURNACE_LABELS[fid] || fid}</h3>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-600">{fTavs.length} charges</span>
                  <span className="text-sm font-bold text-orange-600 ml-2">{fWeight} kg</span>
                </div>
              </div>
              {fTavs.map((t) => (
                <TavRow key={t._idx} tav={t} index={t._idx} editing={editing} onChange={handleChange} onDelete={handleDelete} />
              ))}
            </div>
          );
        })}

        {/* Tavs with no furnace set (during edit) */}
        {editing && editedTavs.filter((t) => !t.furnaceId).map((t, i) => {
          const actualIdx = editedTavs.indexOf(t);
          return <TavRow key={actualIdx} tav={t} index={actualIdx} editing={true} onChange={handleChange} onDelete={handleDelete} />;
        })}

        {editing && (
          <button onClick={handleAddTav} className="w-full border-2 border-dashed border-orange-300 text-orange-600 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-orange-50 transition-colors">
            <Plus size={18} /> Add Charge
          </button>
        )}

        {report.remarks && !editing && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Remarks</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
}
