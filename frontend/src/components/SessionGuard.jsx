import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

/**
 * SessionGuard — SAFE version
 * 
 * Only shows a WARNING BANNER before session expiry.
 * NEVER forces logout or redirects — that's handled by api.js interceptor.
 * 
 * Two functions:
 * 1. Client-side timer: shows "session expiring" warning 5 min before timeout
 * 2. Heartbeat: periodically pings server to detect suspension early
 *    (api.js interceptor handles the actual 401/403 response)
 */
const SessionGuard = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);

  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const heartbeatRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SUPPORT';

  // Decode JWT to get iat
  const getTokenIat = useCallback(() => {
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );
      return payload?.iat || null;
    } catch {
      return null;
    }
  }, [token]);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    warningTimerRef.current = null;
    countdownRef.current = null;
    heartbeatRef.current = null;
  }, []);

  useEffect(() => {
    // Skip for non-authenticated users and admins
    if (!isAuthenticated || !token || isAdmin) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    let isCancelled = false;

    // === 1. Setup session expiry warning timer ===
    const setupWarningTimer = async () => {
      const iat = getTokenIat();
      if (!iat) return;

      // Fetch session timeout from server
      let timeoutMinutes = null;
      try {
        const res = await api.get('/auth/session-status');
        if (isCancelled) return;
        timeoutMinutes = res.data?.sessionTimeoutMinutes;
      } catch {
        // Server might not have the endpoint yet, or network issue — skip silently
        return;
      }

      if (!timeoutMinutes || timeoutMinutes <= 0) return;

      const issuedAtMs = iat * 1000;
      const expiryMs = issuedAtMs + (timeoutMinutes * 60 * 1000);
      const now = Date.now();
      const timeUntilExpiry = expiryMs - now;

      // Already expired — DON'T force logout here
      // The next API call will trigger a 401 and api.js interceptor handles it
      if (timeUntilExpiry <= 0) return;

      console.log(`[SessionGuard] Session expires in ${Math.round(timeUntilExpiry / 60000)} min`);

      // Show warning 5 minutes before expiry
      const warningTime = timeUntilExpiry - (5 * 60 * 1000);

      if (warningTime > 0) {
        warningTimerRef.current = setTimeout(() => {
          if (isCancelled) return;
          setShowWarning(true);
          setMinutesLeft(5);
          countdownRef.current = setInterval(() => {
            setMinutesLeft((prev) => {
              if (prev <= 1) {
                clearInterval(countdownRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 60000);
        }, warningTime);
      } else if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0) {
        // Less than 5 min left — show warning immediately
        setShowWarning(true);
        setMinutesLeft(Math.max(1, Math.ceil(timeUntilExpiry / 60000)));
      }
    };

    // === 2. Setup heartbeat (just pings server — api.js interceptor handles errors) ===
    const setupHeartbeat = () => {
      // Ping every 3 minutes — if user is suspended, server returns 403,
      // which api.js interceptor catches and dispatches 'account-suspended' event
      heartbeatRef.current = setInterval(async () => {
        if (isCancelled) return;
        try {
          await api.get('/auth/session-status');
          // Success = session still valid, do nothing
        } catch {
          // api.js interceptor already handles 401/403 responses
          // We intentionally do NOT force logout here
        }
      }, 3 * 60 * 1000); // Every 3 minutes
    };

    // Small delay to let auth state fully settle after login
    const initTimer = setTimeout(() => {
      if (isCancelled) return;
      setupWarningTimer();
      setupHeartbeat();
    }, 5000); // Wait 5 seconds before first check

    return () => {
      isCancelled = true;
      clearTimeout(initTimer);
      clearTimers();
    };
  }, [isAuthenticated, token, isAdmin, getTokenIat, clearTimers]);

  // Don't render anything if no warning needed
  if (!isAuthenticated || !showWarning) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] px-4 py-2">
      <div className="max-w-xl mx-auto bg-amber-50 border border-amber-300 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
          <Clock className="text-amber-600" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            Session Expiring Soon
          </p>
          <p className="text-xs text-amber-600">
            {minutesLeft <= 1
              ? 'Your session will expire shortly. Please save your work and sign in again.'
              : `Your session will expire in approximately ${minutesLeft} minutes.`
            }
          </p>
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="flex-shrink-0 p-1 text-amber-400 hover:text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default SessionGuard;
