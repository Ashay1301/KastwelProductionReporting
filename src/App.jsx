import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import WorkerHome from './components/worker/Home';
import SessionSetup from './components/worker/SessionSetup';
import AddCharge from './components/worker/AddCharge';
import BatchEntry from './components/worker/BatchEntry';
import MyCharges from './components/worker/MyCharges';
import FillWeights from './components/worker/FillWeights';
import Dashboard from './components/admin/Dashboard';
import ReportList from './components/admin/ReportList';
import ReportDetail from './components/admin/ReportDetail';
import UserManagement from './components/admin/UserManagement';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace /> : <Login />} />

      {/* Worker routes */}
      <Route path="/" element={<ProtectedRoute role="worker"><WorkerHome /></ProtectedRoute>} />
      <Route path="/session-setup" element={<ProtectedRoute role="worker"><SessionSetup /></ProtectedRoute>} />
      <Route path="/log-charge" element={<ProtectedRoute role="worker"><AddCharge /></ProtectedRoute>} />
      <Route path="/batch-entry" element={<ProtectedRoute role="worker"><BatchEntry /></ProtectedRoute>} />
      <Route path="/my-charges" element={<ProtectedRoute role="worker"><MyCharges /></ProtectedRoute>} />
      <Route path="/fill-weights" element={<ProtectedRoute role="worker"><FillWeights /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute role="admin"><ReportList /></ProtectedRoute>} />
      <Route path="/admin/reports/:id" element={<ProtectedRoute role="admin"><ReportDetail /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute role="admin"><UserManagement /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={user?.role === 'admin' ? '/admin' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
