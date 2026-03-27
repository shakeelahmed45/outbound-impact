import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

/**
 * SessionGuard — INACTIVITY-based session timeout warning
 * 
 * Tracks real user activity (mouse, keyboard, touch, scroll).
 * Only shows a warning when the user has been IDLE for close to
 * the admin-configured sessionTimeoutMinutes.
 * 
 * NEVER forces logout or redirects — the backend auth middleware
 * and api.js interceptor handle the actual session expiry.
 */
const SessionGuard = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const timeoutMinutesRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const heartbeatRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SUPPORT';

  // Reset activity timestamp on any user interaction
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // Hide warning if it's showing (user became active)
    setShowWarning(false);
  }, []);

  const clearTimers = useCallback(() => {
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    checkIntervalRef.current = null;
    heartbeatRef.current = null;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token || isAdmin) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    let isCancelled = false;

    // === 1. Fetch the timeout setting from server ===
    const init = async () => {
      try {
        const res = await api.get('/auth/session-status');
        if (isCancelled) return;
        const minutes = res.data?.sessionTimeoutMinutes;
        if (minutes && minutes > 0) {
          timeoutMinutesRef.current = minutes;
          console.log(`[SessionGuard] Inactivity timeout: ${minutes} min`);
        }
      } catch {
        // Endpoint might not exist yet, or network error — silently skip
      }
    };

    // === 2. Listen for user activity on the page ===
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // === 3. Periodically check idle time ===
    checkIntervalRef.current = setInterval(() => {
      const timeout = timeoutMinutesRef.current;
      if (!timeout) return; // No timeout configured

      const idleMs = Date.now() - lastActivityRef.current;
      const idleMinutes = idleMs / (60 * 1000);
      const warningThreshold = timeout - 5; // Show warning 5 min before expiry

      if (idleMinutes >= warningThreshold && idleMinutes < timeout) {
        const remaining = Math.max(1, Math.ceil(timeout - idleMinutes));
        setMinutesLeft(remaining);
        setShowWarning(true);
      } else if (idleMinutes < warningThreshold) {
        // User is active — hide warning if shown
        setShowWarning(false);
      }
      // If idleMinutes >= timeout, the next API call will get 401 from backend
    }, 30 * 1000); // Check every 30 seconds

    // === 4. Heartbeat to detect suspension (api.js interceptor handles errors) ===
    heartbeatRef.current = setInterval(async () => {
      if (isCancelled) return;
      try {
        await api.get('/auth/session-status');
      } catch {
        // api.js interceptor handles 401/403 — we don't do anything here
      }
    }, 5 * 1000); // Every 5 seconds — near-instant kick on suspension

    // Initialize after a brief delay
    const initTimer = setTimeout(init, 3000);

    return () => {
      isCancelled = true;
      clearTimeout(initTimer);
      clearTimers();
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isAuthenticated, token, isAdmin, handleUserActivity, clearTimers]);

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
              ? 'You\'ve been inactive. Your session will expire shortly — move your mouse or press a key to stay signed in.'
              : `You've been inactive for a while. Session expires in ~${minutesLeft} minutes. Any activity will reset the timer.`
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