import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BrowseEmails from './pages/BrowseEmails';
import MyBatches from './pages/MyBatches';
import SendEmails from './pages/SendEmails';
import SentHistory from './pages/SentHistory';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import Unsubscribe from './pages/Unsubscribe';

function ProtectedRoute({ children, adminOnly = false, requireApproval = false }) {
  const { company, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  if (!company) return <Navigate to="/login" />;
  if (adminOnly && !company.is_admin) return <Navigate to="/" />;
  if (requireApproval && !company.is_approved && !company.is_admin) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { company, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;

  return (
    <Routes>
      <Route path="/unsubscribe/:token" element={<Unsubscribe />} />
      <Route path="*" element={
        <>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/login" element={company ? <Navigate to="/" /> : <Login />} />
              <Route path="/register" element={company ? <Navigate to="/" /> : <Register />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/browse" element={<ProtectedRoute requireApproval><BrowseEmails /></ProtectedRoute>} />
              <Route path="/batches" element={<ProtectedRoute requireApproval><MyBatches /></ProtectedRoute>} />
              <Route path="/send" element={<ProtectedRoute requireApproval><SendEmails /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute requireApproval><SentHistory /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requireApproval><Settings /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
            </Routes>
          </main>
        </>
      } />
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
