import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import BatchDetailPage from './pages/BatchDetailPage.tsx';
import CheckoutPage from './pages/CheckoutPage.tsx';
import { useEffect } from 'react';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      document.body.dataset.authenticated = user ? 'true' : 'false';
    }
  }, [loading, user]);

  if (loading) {
    return <LoadingScreen label="Checking session" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Library Vision</h1>
        <div className="app-header__actions">
          <span>{user?.email}</span>
          <button className="secondary-button" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="batches/:batchId" element={<BatchDetailPage />} />
          <Route path="images/:imageId" element={<CheckoutPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
