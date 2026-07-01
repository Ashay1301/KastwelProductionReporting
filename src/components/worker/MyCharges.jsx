import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Flame } from 'lucide-react';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MyCharges() {
  const { user, authFetch } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayStr();
    authFetch(`/api/reports?from=${today}&to=${today}`)
      .then((r) => r.json())
      .then(({ reports }) => {
        // We need full reports to see tav details — fetch each one
        return Promise.all(
          (reports || []).map((r) =>
            authFetch(`/api/reports/${r._id}`).then((res) => res.json()).then(({ report }) => report)
          )
        );
      })
      .then((full) => setReports(full.filter(Boolean)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch]);

  const myTavs = reports
    .flatMap((r) =>
      (r.tavs || [])
        .filter((t) => t.loggedBy === user?.name)
        .map((t) => ({ ...t, reportShift: r.shift, reportDate: r.date }))
    )
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/" className="text-orange-600 min-h-[48px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-gray-900">My Charges Today</h1>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myTavs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Flame size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No charges logged today</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">{myTavs.length} charge{myTavs.length !== 1 ? 's' : ''} logged</p>
            {myTavs.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm text-gray-900">{FURNACE_LABELS[t.furnaceId] || t.furnaceId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{t.reportShift}</span>
                    <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">#{t.seqNo}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {t.operator && <Row label="Operator" value={t.operator} />}
                  {t.grade && <Row label="Grade" value={t.grade} />}
                  {t.finalWeight != null && <Row label="Final Weight" value={`${t.finalWeight} kg`} />}
                  {t.startTime && <Row label="Start" value={t.startTime} />}
                  {t.endTime && <Row label="End" value={t.endTime} />}
                  {t.energyMeterReading != null && <Row label="Energy" value={`${t.energyMeterReading} kWh`} />}
                  {t.temperature != null && <Row label="Temp" value={`${t.temperature}°C`} />}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}
