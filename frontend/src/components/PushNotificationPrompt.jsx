import { useState, useEffect } from 'react';
import { Bell, X, Smartphone } from 'lucide-react';
import { isPushSupported, getPermissionStatus, subscribeToPush } from '../services/pushService';
import useAuthStore from '../store/authStore';

/**
 * PushNotificationPrompt
 * 
 * Shows a one-time banner prompting users to enable push notifications.
 * Appears after 3 seconds on dashboard, dismissible, remembers choice PER USER.
 * 
 * ✅ FIX: User-specific localStorage keys so each account gets its own prompt.
 * ✅ FIX: Re-evaluates when user changes (login/switch account).
 * ✅ FIX: Also checks legacy global keys for backward compat.
 */
const PushNotificationPrompt = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // ✅ User-specific key helpers — each account gets its own flags
  const userId = user?.id || user?.userId;

  // ONLY check user-specific keys (not global) so new accounts always get a fresh prompt
  const isSetForUser = (base) => {
    if (!userId) return false;
    return localStorage.getItem(`${base}_${userId}`) === 'true';
  };

  const setKeyForUser = (base) => {
    if (userId) localStorage.setItem(`${base}_${userId}`, 'true');
  };

  useEffect(() => {
    // Wait for user to be available
    if (!userId) {
      console.log('📱 [PushPrompt] Waiting for user context...');
      return;
    }

    const supported = isPushSupported();
    const permission = getPermissionStatus();
    const alreadySubscribed = isSetForUser('push_subscribed');
    const dismissed = isSetForUser('push_dismissed');

    console.log('📱 [PushPrompt] Checking conditions:', {
      userId: userId.slice(0, 8) + '...',
      supported,
      permission,
      alreadySubscribed,
      dismissed,
      userSpecificSubKey: `push_subscribed_${userId}`,
    });

    if (!supported) {
      console.log('📱 [PushPrompt] Not showing — push not supported on this browser/device');
      console.log('📱 [PushPrompt] Details: SW=' + ('serviceWorker' in navigator) + 
        ' PushManager=' + ('PushManager' in window) + 
        ' Notification=' + ('Notification' in window) +
        ' Standalone=' + window.matchMedia('(display-mode: standalone)').matches);
      return;
    }
    if (alreadySubscribed) { console.log('📱 [PushPrompt] Not showing — already subscribed'); return; }
    if (dismissed) { console.log('📱 [PushPrompt] Not showing — previously dismissed'); return; }
    if (permission === 'denied') { console.log('📱 [PushPrompt] Not showing — browser permission denied'); return; }

    console.log('📱 [PushPrompt] ✅ All conditions passed — showing prompt in 3 seconds');
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [userId]); // ✅ FIX: Re-run when user changes

  const handleEnable = async () => {
    console.log('📱 [PushPrompt] User clicked Enable');
    setLoading(true);
    const result = await subscribeToPush();
    console.log('📱 [PushPrompt] Subscribe result:', result);
    setLoading(false);

    if (result.success) {
      console.log('📱 [PushPrompt] ✅ Subscription successful!');
      setKeyForUser('push_subscribed');
      setShow(false);
    } else if (result.reason === 'denied') {
      console.log('📱 [PushPrompt] ❌ User denied permission in browser prompt');
      setKeyForUser('push_dismissed');
      setShow(false);
    } else {
      console.error('📱 [PushPrompt] ❌ Subscribe failed:', result.reason);
      // Don't dismiss — let user try again
    }
  };

  const handleDismiss = () => {
    console.log('📱 [PushPrompt] User dismissed prompt');
    setKeyForUser('push_dismissed');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white border border-purple-200 rounded-2xl shadow-xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Smartphone className="text-purple-600" size={20} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight">
              Enable Push Notifications
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Get instant alerts for QR scans, team updates, and milestones — even when the app is closed.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Bell size={13} />
                {loading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Not now
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
