import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🔒 ProtectedRoute: Checking auth state...', {
      _hasHydrated,
      isAuthenticated,
      hasToken: !!token
    });
    
    // ✅ Wait for Zustand persist to restore state from localStorage
    if (_hasHydrated) {
      console.log('✅ ProtectedRoute: State rehydrated, setting ready=true');
      setIsReady(true);
    } else {
      console.log('⏳ ProtectedRoute: Waiting for rehydration...');
    }
  }, [_hasHydrated, isAuthenticated, token]);

  // ✅ Show loading while Zustand persist is restoring state
  if (!isReady) {
    console.log('⏳ ProtectedRoute: Showing loading spinner (waiting for rehydration)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-semibold">Loading...</p>
          <p className="text-gray-500 text-sm mt-2">Restoring session...</p>
        </div>
      </div>
    );
  }

  // ✅ Now check authentication AFTER state is restored
  if (!isAuthenticated || !token) {
    console.log('❌ ProtectedRoute: Not authenticated, redirecting to sign-in');
    return <Navigate to="/signin" replace />;
  }

  console.log('✅ ProtectedRoute: Authenticated, rendering protected content');
  return children;
};

export default ProtectedRoute;
