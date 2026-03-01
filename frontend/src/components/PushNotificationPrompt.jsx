import { useState, useEffect } from 'react';
import { Bell, X, Smartphone } from 'lucide-react';
import { isPushSupported, getPermissionStatus, subscribeToPush } from '../services/pushService';

/**
 * PushNotificationPrompt
 * 
 * Shows a one-time banner prompting users to enable push notifications.
 * Appears after 3 seconds on dashboard, dismissible, remembers choice.
 * 
 * Usage: Add <PushNotificationPrompt /> to DashboardLayout or App.jsx
 */
const PushNotificationPrompt = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't show if:
    // 1. Push not supported
    // 2. Already subscribed
    // 3. Already dismissed
    // 4. Permission already denied
    if (!isPushSupported()) return;
    if (localStorage.getItem('push_subscribed') === 'true') return;
    if (localStorage.getItem('push_dismissed') === 'true') return;
    if (getPermissionStatus() === 'denied') return;
    if (getPermissionStatus() === 'granted' && localStorage.getItem('push_subscribed') === 'true') return;

    // Show after 3 second delay
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    const result = await subscribeToPush();
    setLoading(false);

    if (result.success) {
      setShow(false);
    } else if (result.reason === 'denied') {
      // User denied in browser prompt
      localStorage.setItem('push_dismissed', 'true');
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_dismissed', 'true');
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
