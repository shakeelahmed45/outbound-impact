import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import AuthPage from '../../pages/AuthPage';

/**
 * Smart root redirect that waits for Zustand rehydration
 * then redirects to dashboard if authenticated, or shows landing if not
 */
const RootRedirect = () => {
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (_hasHydrated) {
      setIsReady(true);
    }
  }, [_hasHydrated, isAuthenticated, token]);

  // Loading while Zustand persist restores state
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #faf8fc, #f5f0fa, #f0eaf5)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-600 font-semibold text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Authenticated → dashboard
  if (isAuthenticated && token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Not authenticated → luxury landing page
  return <AuthPage />;
};

export default RootRedirect;
