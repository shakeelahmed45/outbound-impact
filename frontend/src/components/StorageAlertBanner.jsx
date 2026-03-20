// StorageAlertBanner.jsx
// Renders an actionable, dismissible banner when the user is at ≥ 80% storage.
// Props:
//   storageUsed  (Number, bytes)
//   storageLimit (Number, bytes)
// It fetches its own data if props aren't passed, or uses props directly.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, AlertCircle, X, TrendingUp, HardDrive, ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import IncreaseStorageModal from './IncreaseStorageModal';
import UpgradePlanModal from './UpgradePlanModal';
import useAuthStore from '../store/authStore';

const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (n === 0) return '0 Bytes';
  const k     = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i     = Math.floor(Math.log(n) / Math.log(k));
  return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const DISMISS_KEY = 'storage_banner_dismissed_at';

// Dismiss lasts 4 hours — after that it reappears
const isDismissed = () => {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < 4 * 60 * 60 * 1000;
  } catch { return false; }
};

const StorageAlertBanner = ({ storageUsed: propUsed, storageLimit: propLimit }) => {
  const { user }               = useAuthStore();
  const navigate               = useNavigate();

  const [dismissed,            setDismissed]            = useState(isDismissed());
  const [showStorageModal,     setShowStorageModal]     = useState(false);
  const [showUpgradeModal,     setShowUpgradeModal]     = useState(false);
  const [storageData,          setStorageData]          = useState(null);

  // Check for ?storage_success=1 on page load (redirect back from Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('storage_success') === '1') {
      // Clear the query param without a full reload
      window.history.replaceState({}, '', window.location.pathname);
      // Banner will auto-refresh below
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/storage-alerts/status');
      if (res.data?.status === 'success') {
        setStorageData(res.data.storage);
      }
    } catch (_) {
      // Silently ignore — don't break dashboard if this endpoint fails
    }
  }, []);

  useEffect(() => {
    // If props are supplied directly (from parent's stats fetch), use them
    if (propUsed != null && propLimit != null) {
      const used    = Number(propUsed);
      const limit   = Number(propLimit);
      const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
      setStorageData({
        used:         used.toString(),
        limit:        limit.toString(),
        usedFormatted:  formatBytes(used),
        limitFormatted: formatBytes(limit),
        percentUsed:  percent,
        isWarning:    percent >= 80,
        isCritical:   percent >= 95,
      });
    } else {
      // Fetch from API
      fetchStatus();
    }
  }, [propUsed, propLimit, fetchStatus]);

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch (_) {}
    setDismissed(true);
  };

  // Nothing to show
  if (!storageData || !storageData.isWarning || dismissed) return null;

  const { percentUsed, usedFormatted, limitFormatted, isCritical } = storageData;

  const barColor   = isCritical ? 'bg-red-500'    : 'bg-amber-400';
  const bgColor    = isCritical ? 'bg-red-50'     : 'bg-amber-50';
  const borderColor= isCritical ? 'border-red-200': 'border-amber-200';
  const textColor  = isCritical ? 'text-red-700'  : 'text-amber-700';
  const iconColor  = isCritical ? 'text-red-500'  : 'text-amber-500';
  const Icon       = isCritical ? AlertCircle     : AlertTriangle;

  return (
    <>
      {/* ── BANNER ─────────────────────────────────────────── */}
      <div className={`${bgColor} border ${borderColor} rounded-xl p-4 mb-6 relative`}>
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className={`absolute top-3 right-3 ${textColor} opacity-50 hover:opacity-100 transition-opacity`}
          aria-label="Dismiss storage warning"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-6">

          {/* Icon + text */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon size={22} className={`${iconColor} mt-0.5 flex-shrink-0`} />
            <div className="min-w-0">
              <p className={`font-semibold ${textColor} text-sm`}>
                {isCritical
                  ? `🚨 Storage Critical — ${percentUsed}% full`
                  : `⚠️ Storage Running Low — ${percentUsed}% used`}
              </p>
              <p className={`text-xs ${textColor} opacity-75 mt-0.5`}>
                {usedFormatted} of {limitFormatted} used.{' '}
                {isCritical
                  ? 'New uploads will be blocked when storage is full.'
                  : 'Upgrade your plan or add storage to avoid interruptions.'}
              </p>

              {/* Usage bar */}
              <div className="mt-2.5 bg-white/60 rounded-full h-1.5 w-full max-w-xs overflow-hidden">
                <div
                  className={`${barColor} h-full rounded-full transition-all`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowStorageModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-white border border-current rounded-lg hover:bg-opacity-80 transition-all text-violet-600 border-violet-300 hover:bg-violet-50"
            >
              <HardDrive size={13} />
              Add Storage
            </button>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all text-white shadow-sm hover:shadow ${
                isCritical
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gradient-to-r from-teal-500 to-violet-600 hover:from-teal-600 hover:to-violet-700'
              }`}
            >
              <TrendingUp size={13} />
              Upgrade Plan
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────── */}
      <IncreaseStorageModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        currentStorageFormatted={limitFormatted}
        percentUsed={percentUsed}
      />

      <UpgradePlanModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={user?.role}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false);
          setDismissed(true); // hide banner — plan upgraded
        }}
      />
    </>
  );
};

export default StorageAlertBanner;