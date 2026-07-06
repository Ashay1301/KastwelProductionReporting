import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Factory, Clock, ClipboardList, Zap, Scale } from 'lucide-react';
import { getSession, clearSession } from './SessionSetup';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

export default function WorkerHome() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const session = getSession();

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
          <button onClick={logout} className="text-gray-400 hover:text-gray-600"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Today's Production</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Today's stats */}
        {!loading && (
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
        )}

        {/* Active session banner */}
        {session && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Active Session</p>
              <button onClick={() => { clearSession(); window.location.reload(); }} className="text-xs text-orange-400 underline">Clear</button>
            </div>
            <p className="text-sm font-semibold text-orange-800">
              {FURNACE_LABELS[session.furnaceId] || session.furnaceId}
              {session.operator ? ` · ${session.operator}` : ''}
              {session.grade ? ` · Grade ${session.grade}` : ''}
            </p>
          </div>
        )}

        {/* Mode selector */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Log Charges</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => session ? navigate('/log-charge') : navigate('/session-setup?mode=realtime')}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl p-4 text-left transition-colors shadow-sm"
            >
              <Zap size={22} className="mb-2" />
              <p className="font-bold text-sm">Real-time</p>
              <p className="text-xs text-orange-200 mt-0.5">Log each charge as it happens</p>
            </button>

            <button
              onClick={() => session ? navigate('/batch-entry') : navigate('/session-setup?mode=batch')}
              className="bg-gray-800 hover:bg-gray-900 text-white rounded-2xl p-4 text-left transition-colors shadow-sm"
            >
              <ClipboardList size={22} className="mb-2" />
              <p className="font-bold text-sm">End of Shift</p>
              <p className="text-xs text-gray-400 mt-0.5">Fill all 18 charges at once</p>
            </button>
          </div>
        </div>

        <Link to="/my-charges"
          className="w-full bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm hover:bg-gray-50 transition-colors">
          <Clock size={18} />
          My Charges Today
        </Link>

        <Link to="/fill-weights"
          className="w-full bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm hover:bg-gray-50 transition-colors relative">
          <Scale size={18} />
          Fill Weights
          {!loading && stats?.pendingWeights > 0 && (
            <span className="absolute right-4 bg-orange-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {stats.pendingWeights}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
