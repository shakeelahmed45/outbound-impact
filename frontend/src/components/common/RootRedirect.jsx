import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';

/**
 * Smart root redirect that waits for Zustand rehydration
 * then redirects to dashboard if authenticated, or signin if not
 */
const RootRedirect = () => {
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🏠 RootRedirect: Checking auth state...', {
      _hasHydrated,
      isAuthenticated,
      hasToken: !!token
    });
    
    // ✅ Wait for Zustand persist to restore state from localStorage
    if (_hasHydrated) {
      console.log('✅ RootRedirect: State rehydrated, ready to redirect');
      setIsReady(true);
    } else {
      console.log('⏳ RootRedirect: Waiting for rehydration...');
    }
  }, [_hasHydrated, isAuthenticated, token]);

  // ✅ Show loading while Zustand persist is restoring state
  if (!isReady) {
    console.log('⏳ RootRedirect: Showing loading spinner (waiting for rehydration)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-semibold">Loading...</p>
          <p className="text-gray-500 text-sm mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // ✅ After rehydration, redirect based on auth status
  if (isAuthenticated && token) {
    console.log('✅ RootRedirect: Authenticated, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('❌ RootRedirect: Not authenticated, redirecting to /signin');
  return <Navigate to="/signin" replace />;
};

export default RootRedirect;
