import { useEffect } from 'react';
import useAuthStore from '../../store/authStore';

/**
 * Public Route Wrapper - Prevents auth checks from triggering
 * Use this for routes that should be accessible without authentication
 */
const PublicRoute = ({ children }) => {
  const { _hasHydrated } = useAuthStore();

  useEffect(() => {
    console.log('🌍 PublicRoute: Rendering public content (no auth required)');
  }, []);

  // Show loading only while waiting for initial hydration
  // This prevents flash of wrong content
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ IMPORTANT: No authentication check here - this is public!
  console.log('✅ PublicRoute: Rendering public content');
  return children;
};

export default PublicRoute;