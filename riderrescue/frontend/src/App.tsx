import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth, homeFor } from './lib/auth';
import type { Role } from './lib/types';
import Navbar from './components/Navbar';
import { AdminLogin, LoginPage, MemberSignup, ProviderOnboarding } from './components/AuthPages';
import MemberDashboard from './components/MemberDashboard';
import ProviderDashboard from './components/ProviderDashboard';
import AdminDashboard from './components/AdminDashboard';

/** Client-side RBAC — the API enforces the same rules, this just routes people to the right place. */
function Protected({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading…</div>;
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return (<><Navbar /><Outlet /></>);
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup/member" element={<MemberSignup />} />
      <Route path="/signup/provider" element={<ProviderOnboarding />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route element={<Protected role="member" />}><Route path="/member" element={<MemberDashboard />} /></Route>
      <Route element={<Protected role="provider" />}><Route path="/provider" element={<ProviderDashboard />} /></Route>
      <Route element={<Protected role="admin" />}><Route path="/admin" element={<AdminDashboard />} /></Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
