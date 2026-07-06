import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ChevronRight, Download } from 'lucide-react';
import { exportBulkReports } from '../../utils/excelExport';


function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportList() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: todayStr(), to: todayStr(), shift: '', furnace: '' });
  const [fullReports, setFullReports] = useState([]);

  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.shift) params.set('shift', filters.shift);
      if (filters.furnace) params.set('furnace', filters.furnace);

      const res = await authFetch(`/api/reports?${params}`);
      const { reports: list } = await res.json();
      setReports(list || []);

      // Fetch full reports for export
      const full = await Promise.all(
        (list || []).map((r) =>
          authFetch(`/api/reports/${r._id}`).then((r2) => r2.json()).then(({ report }) => report)
        )
      );
      setFullReports(full.filter(Boolean));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; load(); return; }
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link to="/admin" className="flex items-center gap-1 text-orange-600 font-medium min-h-[48px]">
          <ArrowLeft size={18} /> Dashboard
        </Link>
        {fullReports.length > 0 && (
          <button
            onClick={() => exportBulkReports(fullReports, filters.from || 'export')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-3 py-2"
          >
            <Download size={15} /> Export Excel
          </button>
        )}
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">All Reports</h1>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
              <select value={filters.shift} onChange={(e) => setF('shift', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                <option value="">All Shifts</option>
                <option>1st Shift</option>
                <option>2nd Shift</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Furnace</label>
              <select value={filters.furnace} onChange={(e) => setF('furnace', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                <option value="">All Furnaces</option>
                <option value="A">A (500kg)</option>
                <option value="B">B (500kg)</option>
                <option value="A2">A2 (1000kg)</option>
                <option value="B2">B2 (1000kg)</option>
                <option value="C2">C2 (500kg)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No reports found for the selected filters</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">{reports.length} report{reports.length !== 1 ? 's' : ''} — {reports.reduce((s, r) => s + r.tavCount, 0)} total charges</p>
            {reports.map((r) => (
              <button
                key={r._id}
                onClick={() => navigate(`/admin/reports/${r._id}`)}
                className="w-full bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between hover:border-orange-300 transition-colors"
              >
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-900">
                    {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — {r.shift}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.submissionId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">{r.tavCount} charges</p>
                    <p className="text-xs text-gray-500">{r.totalWeight} kg</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
