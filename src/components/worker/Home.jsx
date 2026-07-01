import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, LogOut, ClipboardList, Factory } from 'lucide-react';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

export default function WorkerHome() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/reports/stats/today')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Factory size={20} className="text-orange-600" />
          <span className="font-bold text-gray-900">Production</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Today's Production</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
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
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">By Furnace</h2>
                </div>
                {stats.byFurnace.map((f) => (
                  <div key={f.furnaceId} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-800">{FURNACE_LABELS[f.furnaceId] || f.furnaceId}</span>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{f.count} charges</span>
                      <span className="font-semibold text-gray-800">{f.totalWeight} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button
          onClick={() => navigate('/add-charge')}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 text-base shadow-sm transition-colors"
        >
          <Plus size={22} />
          Add Charge
        </button>

        <Link
          to="/my-charges"
          className="w-full bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 text-base transition-colors hover:bg-gray-50"
        >
          <ClipboardList size={20} />
          My Charges Today
        </Link>
      </div>
    </div>
  );
}
