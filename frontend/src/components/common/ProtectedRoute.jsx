import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // ✅ Wait for Zustand persist to restore state from localStorage
    if (_hasHydrated) {
      setIsReady(true);
    }
  }, [_hasHydrated]);

  // ✅ Show loading while Zustand persist is restoring state
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Now check authentication AFTER state is restored
  if (!isAuthenticated || !token) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default ProtectedRoute;
