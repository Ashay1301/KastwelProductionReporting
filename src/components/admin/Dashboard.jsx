import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Factory, BarChart2, Users } from 'lucide-react';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Dashboard() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('today');

  const today = dateStr(new Date());
  const yesterday = dateStr(new Date(Date.now() - 86400000));

  const load = (day) => {
    setLoading(true);
    authFetch(`/api/reports?from=${day}&to=${day}`)
      .then((r) => r.json())
      .then(async ({ reports }) => {
        const full = await Promise.all(
          (reports || []).map((r) =>
            authFetch(`/api/reports/${r._id}`).then((res) => res.json()).then(({ report }) => report)
          )
        );
        const allTavs = full.flatMap((r) => r.tavs || []);
        const furnaceIds = ['A', 'B', 'A2', 'B2', 'C2'];
        const byFurnace = furnaceIds.map((id) => {
          const tavs = allTavs.filter((t) => t.furnaceId === id);
          return { furnaceId: id, count: tavs.length, totalWeight: tavs.reduce((s, t) => s + (t.finalWeight || 0), 0) };
        }).filter((f) => f.count > 0);
        setStats({
          totalTavs: allTavs.length,
          totalWeight: allTavs.reduce((s, t) => s + (t.finalWeight || 0), 0),
          byFurnace,
          reports: full,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(view === 'today' ? today : yesterday); }, [view]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Factory size={20} className="text-orange-600" />
          <span className="font-bold text-gray-900">Production</span>
          <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full ml-1">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/reports" className="text-sm text-gray-600 hover:text-orange-600 flex items-center gap-1">
            <BarChart2 size={16} /> Reports
          </Link>
          <Link to="/admin/users" className="text-sm text-gray-600 hover:text-orange-600 flex items-center gap-1">
            <Users size={16} /> Users
          </Link>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
            {['today', 'yesterday'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors capitalize ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Charges</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.totalTavs ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Weight</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalWeight ?? 0}<span className="text-base font-normal text-gray-400 ml-1">kg</span></p>
              </div>
            </div>

            {stats?.byFurnace?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-3 gap-1 px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span>Furnace</span><span className="text-center">Charges</span><span className="text-right">Weight</span>
                </div>
                {stats.byFurnace.map((f) => (
                  <div key={f.furnaceId} className="grid grid-cols-3 gap-1 px-4 py-3 border-b border-gray-50 last:border-0 text-sm">
                    <span className="font-medium text-gray-800">{FURNACE_LABELS[f.furnaceId] || f.furnaceId}</span>
                    <span className="text-center text-gray-600">{f.count}</span>
                    <span className="text-right font-semibold text-gray-800">{f.totalWeight} kg</span>
                  </div>
                ))}
              </div>
            )}

            {stats?.reports?.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700">Reports</h2>
                {stats.reports.map((r) => (
                  <button
                    key={r._id}
                    onClick={() => navigate(`/admin/reports/${r._id}`)}
                    className="w-full bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between hover:border-orange-300 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm text-gray-900">{r.shift}</p>
                      <p className="text-xs text-gray-400">{r.submissionId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">{r.tavs?.length ?? 0} charges</p>
                      <p className="text-xs text-gray-500">{(r.tavs || []).reduce((s, t) => s + (t.finalWeight || 0), 0)} kg</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!stats?.totalTavs && (
              <div className="text-center py-12 text-gray-400 text-sm">No production data for {view}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
