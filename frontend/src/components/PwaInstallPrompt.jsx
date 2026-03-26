// PwaInstallPrompt.jsx
// Shows a one-time dismissible banner prompting users to install the PWA.
// Once installed, the OI icon appears in the phone's native share sheet
// and the app works like a real mobile app (standalone, offline-capable).
//
// The banner only shows when:
//  1. The browser fires beforeinstallprompt (Chrome, Edge, Samsung, Opera)
//  2. The user hasn't dismissed it before (localStorage flag)
//  3. The app is NOT already installed (display-mode: standalone)
//
// On iOS Safari, beforeinstallprompt doesn't exist — we show a manual
// instruction ("Tap Share → Add to Home Screen") instead.

import { useState, useEffect } from 'react';
import { Download, X, Share2, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'oi-pwa-install-dismissed';
const DISMISS_DAYS = 14; // Show again after 14 days if dismissed

const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed as standalone?
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (navigator.standalone === true) return; // iOS standalone

    // Was it dismissed recently?
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iosDevice) {
      setIsIos(true);
      setShowBanner(true);
      return;
    }

    // Chrome / Edge / Samsung / Opera — listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-24 sm:w-[380px] z-40 animate-slideUp">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-white" />
            <span className="text-white font-bold text-sm">Install Outbound Impact</span>
          </div>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {isIos ? (
            <>
              <p className="text-gray-700 text-sm mb-3">
                Install OI on your iPhone for the best experience — including sharing content directly from any app.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>Tap the <Share2 size={14} className="inline text-blue-500 mx-0.5" /> <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Tap <strong>"Add"</strong> — that's it!</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-700 text-sm mb-3">
                Install OI for a faster experience and to share content directly from any app on your phone.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Works offline</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Share from any app</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Push notifications</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-4 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Not Now
          </button>
          {!isIos && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 px-4 py-2.5 text-white gradient-btn rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {installing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Installing...</>
              ) : (
                <><Download size={16} /> Install App</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;