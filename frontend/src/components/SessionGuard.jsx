import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

/**
 * SessionGuard
 * 
 * Monitors session validity and auto-logs out users when:
 * 1. Session timeout expires (based on admin-configured sessionTimeoutMinutes)
 * 2. Account gets suspended (detected via periodic heartbeat)
 * 
 * Shows a warning banner 5 minutes before session expiry.
 * 
 * Place this inside <BrowserRouter> but outside specific routes so it
 * runs globally for all authenticated users.
 */
const SessionGuard = () => {
  const { isAuthenticated, token, logout, user } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const expiryTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const heartbeatRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SUPPORT';

  // Decode JWT to get iat (issued at) timestamp
  const decodeJwtPayload = useCallback((token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }, []);

  // Force logout with message
  const forceLogout = useCallback((reason) => {
    console.log(`[SessionGuard] Force logout: ${reason}`);
    clearAllTimers();
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');

    // Store reason for SignIn page to show
    sessionStorage.setItem('logout_reason', reason);
    window.location.href = '/signin';
  }, [logout]);

  const clearAllTimers = useCallback(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
  }, []);

  // Heartbeat: periodic check for suspension/session validity
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    const check = async () => {
      try {
        await api.get('/auth/session-status');
        // Success = session is still valid
      } catch (err) {
        const code = err.response?.data?.code;
        const status = err.response?.status;

        if (status === 403 && code === 'ACCOUNT_SUSPENDED') {
          // Suspension detected — the api.js interceptor will dispatch 'account-suspended' event
          // But also stop heartbeat
          clearAllTimers();
          return;
        }

        if (status === 401) {
          // Session expired or token invalid
          forceLogout(
            code === 'SESSION_EXPIRED'
              ? 'Your session has expired. Please sign in again.'
              : 'Your session is no longer valid. Please sign in again.'
          );
          return;
        }

        // Network error or server down — don't logout, just log
        if (!err.response) {
          console.log('[SessionGuard] Heartbeat: network error (ignoring)');
        }
      }
    };

    // Check every 2 minutes
    heartbeatRef.current = setInterval(check, 2 * 60 * 1000);

    // Also check immediately on mount (catch suspended users who reload page)
    setTimeout(check, 3000); // small delay to let app hydrate
  }, [clearAllTimers, forceLogout]);

  // Setup session expiry timer
  const setupExpiryTimer = useCallback(async () => {
    if (!token) return;

    const decoded = decodeJwtPayload(token);
    if (!decoded?.iat) return;

    // Fetch session timeout from server
    let sessionTimeoutMinutes = null;
    try {
      const res = await api.get('/auth/session-status');
      sessionTimeoutMinutes = res.data?.sessionTimeoutMinutes;
    } catch {
      // If we can't fetch, don't set timer (heartbeat will catch issues)
      return;
    }

    if (!sessionTimeoutMinutes || sessionTimeoutMinutes <= 0) return;

    const issuedAtMs = decoded.iat * 1000;
    const expiryMs = issuedAtMs + (sessionTimeoutMinutes * 60 * 1000);
    const now = Date.now();
    const timeUntilExpiry = expiryMs - now;

    if (timeUntilExpiry <= 0) {
      // Already expired
      forceLogout('Your session has expired. Please sign in again.');
      return;
    }

    console.log(`[SessionGuard] Session expires in ${Math.round(timeUntilExpiry / 60000)} min`);

    // Set expiry timer
    expiryTimerRef.current = setTimeout(() => {
      forceLogout('Your session has expired. Please sign in again.');
    }, timeUntilExpiry);

    // Set warning timer (5 minutes before expiry)
    const warningTime = timeUntilExpiry - (5 * 60 * 1000);
    if (warningTime > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        setMinutesLeft(5);

        // Countdown every minute
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
    } else if (timeUntilExpiry <= 5 * 60 * 1000) {
      // Less than 5 min left — show warning immediately
      setShowWarning(true);
      setMinutesLeft(Math.ceil(timeUntilExpiry / 60000));
    }
  }, [token, decodeJwtPayload, forceLogout]);

  // Main effect: setup everything when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token || isAdmin) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    setupExpiryTimer();
    startHeartbeat();

    return () => clearAllTimers();
  }, [isAuthenticated, token, isAdmin, setupExpiryTimer, startHeartbeat, clearAllTimers]);

  // Don't render anything if not authenticated or no warning
  if (!isAuthenticated || !showWarning) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] px-4 py-2 animate-slide-down">
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
              ? 'Your session will expire in less than a minute. Save your work and sign in again.'
              : `Your session will expire in approximately ${minutesLeft} minutes. Save your work.`
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
