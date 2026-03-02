import { useState, useEffect } from 'react';
import { Bell, BellRing, X } from 'lucide-react';
import axios from 'axios';

/**
 * CampaignPushPrompt
 * 
 * Shows a bell icon on the public campaign page that lets visitors
 * subscribe to push notifications for new content in this campaign.
 * 
 * Works for non-authenticated users who "Add to Home Screen".
 * Uses campaign-specific localStorage keys so each campaign is tracked independently.
 */
const CampaignPushPrompt = ({ campaignSlug, campaignName }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  const storageKey = `campaign_push_${campaignSlug}`;
  const dismissKey = `campaign_push_dismissed_${campaignSlug}`;
  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    // Check if push is supported
    const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(pushSupported);

    if (!pushSupported) return;

    // Check if already subscribed or dismissed for this campaign
    const alreadySub = localStorage.getItem(storageKey) === 'true';
    const dismissed = localStorage.getItem(dismissKey) === 'true';

    if (alreadySub) {
      setIsSubscribed(true);
      return;
    }

    if (dismissed) return;

    // Show the banner after 2 seconds
    const timer = setTimeout(() => setShowBanner(true), 2000);
    return () => clearTimeout(timer);
  }, [campaignSlug]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Step 1: Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      console.log('📱 [CampaignPush] SW registered');

      // Step 2: Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('📱 [CampaignPush] Permission denied');
        localStorage.setItem(dismissKey, 'true');
        setShowBanner(false);
        setLoading(false);
        return;
      }

      // Step 3: Get VAPID public key
      const vapidRes = await axios.get(`${API_URL}/api/push/vapid-public-key`);
      const vapidKey = vapidRes.data.publicKey;
      if (!vapidKey) {
        console.error('📱 [CampaignPush] No VAPID key');
        setLoading(false);
        return;
      }

      // Step 4: Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Step 5: Send subscription to backend
      await axios.post(`${API_URL}/api/campaigns/public/${campaignSlug}/push/subscribe`, {
        subscription: sub.toJSON(),
      });

      console.log('📱 [CampaignPush] ✅ Subscribed!');
      localStorage.setItem(storageKey, 'true');
      setIsSubscribed(true);
      setShowBanner(false);
    } catch (err) {
      console.error('📱 [CampaignPush] Subscribe failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, 'true');
    setShowBanner(false);
  };

  // Helper: Convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Don't render anything if push not supported
  if (!supported) return null;

  // Already subscribed — show a small green bell indicator
  if (isSubscribed) {
    return (
      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full" title="Notifications enabled for this campaign">
        <BellRing size={16} className="text-green-300" />
        <span className="font-medium text-xs">Notifications On</span>
      </div>
    );
  }

  // Bell button in the header (always visible when not subscribed)
  return (
    <>
      {/* Inline bell button in campaign header */}
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-2 rounded-full transition-all disabled:opacity-50"
        title="Get notified when new content is added"
      >
        <Bell size={16} className={loading ? 'animate-pulse' : 'animate-bounce'} />
        <span className="font-medium text-xs">{loading ? 'Enabling...' : 'Get Notified'}</span>
      </button>

      {/* Slide-up banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50">
          <div className="bg-white border border-purple-200 rounded-2xl shadow-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Bell className="text-purple-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                  Stay Updated
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Get notified when new content is added to <strong>{campaignName}</strong>.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Bell size={13} />
                    {loading ? 'Enabling...' : 'Enable Notifications'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CampaignPushPrompt;
