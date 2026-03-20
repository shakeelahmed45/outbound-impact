// IncreaseStorageModal.jsx
// Modal to purchase 50 / 100 / 200 GB storage add-on packs via Stripe checkout.

import { useState } from 'react';
import { X, HardDrive, Zap, Loader, CheckCircle, ExternalLink } from 'lucide-react';
import api from '../services/api';

const PACKS = [
  {
    gb:      50,
    icon:    '📦',
    label:   '50 GB',
    price:   '$4.99',
    period:  'one-time',
    color:   'emerald',
    popular: false,
    perks:   ['Instant activation', 'Never expires', 'Add more anytime'],
  },
  {
    gb:      100,
    icon:    '🚀',
    label:   '100 GB',
    price:   '$8.99',
    period:  'one-time',
    color:   'violet',
    popular: true,
    perks:   ['Best value per GB', 'Instant activation', 'Never expires'],
  },
  {
    gb:      200,
    icon:    '💎',
    label:   '200 GB',
    price:   '$14.99',
    period:  'one-time',
    color:   'amber',
    popular: false,
    perks:   ['Largest pack', 'Instant activation', 'Never expires'],
  },
];

const colorMap = {
  emerald: {
    border:  'border-emerald-400',
    bg:      'bg-emerald-50',
    badge:   'bg-emerald-500 text-white',
    btn:     'bg-emerald-500 hover:bg-emerald-600 text-white',
    icon:    'text-emerald-600',
    ring:    'ring-emerald-400',
    check:   'text-emerald-500',
  },
  violet: {
    border:  'border-violet-400',
    bg:      'bg-violet-50',
    badge:   'bg-violet-600 text-white',
    btn:     'bg-gradient-to-r from-teal-500 to-violet-600 hover:from-teal-600 hover:to-violet-700 text-white',
    icon:    'text-violet-600',
    ring:    'ring-violet-400',
    check:   'text-violet-500',
  },
  amber: {
    border:  'border-amber-400',
    bg:      'bg-amber-50',
    badge:   'bg-amber-500 text-white',
    btn:     'bg-amber-500 hover:bg-amber-600 text-white',
    icon:    'text-amber-600',
    ring:    'ring-amber-400',
    check:   'text-amber-500',
  },
};

const IncreaseStorageModal = ({ isOpen, onClose, currentStorageFormatted, percentUsed }) => {
  const [selected,  setSelected]  = useState(100);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  if (!isOpen) return null;

  const selectedPack = PACKS.find(p => p.gb === selected);
  const c            = colorMap[selectedPack?.color || 'violet'];

  const handlePurchase = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/storage-alerts/checkout', { gb: selected });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        setError('Could not create checkout session. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-violet-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <HardDrive size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Increase Storage</h2>
              <p className="text-white/80 text-sm">One-time purchase · Instant activation</p>
            </div>
          </div>

          {/* Current usage bar */}
          {percentUsed != null && (
            <div className="mt-4 bg-white/10 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/80">Current usage</span>
                <span className="font-semibold">{percentUsed}% of {currentStorageFormatted}</span>
              </div>
              <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${percentUsed >= 95 ? 'bg-red-400' : 'bg-amber-300'}`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pack selector */}
        <div className="p-6">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Choose a storage pack
          </p>

          <div className="space-y-3 mb-6">
            {PACKS.map(pack => {
              const pc      = colorMap[pack.color];
              const isChosen = selected === pack.gb;
              return (
                <button
                  key={pack.gb}
                  onClick={() => setSelected(pack.gb)}
                  className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                    isChosen
                      ? `${pc.border} ${pc.bg} ring-2 ${pc.ring} ring-offset-1`
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pack.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{pack.label}</span>
                          {pack.popular && (
                            <span className="text-xs font-semibold bg-violet-600 text-white px-2 py-0.5 rounded-full">
                              Most Popular
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {pack.perks.map(perk => (
                            <span key={perk} className="text-xs text-slate-500">{perk}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-lg">{pack.price}</p>
                      <p className="text-xs text-slate-500">{pack.period}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className={c.check} />
              <span className="font-semibold text-slate-700 text-sm">What you'll get</span>
            </div>
            <p className="text-sm text-slate-600">
              <strong>{selectedPack?.gb}GB</strong> of additional storage added to your account instantly after payment.
              Your new total will increase by {selectedPack?.gb}GB. Add-ons never expire.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handlePurchase}
            disabled={loading}
            className={`w-full ${c.btn} font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md`}
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Redirecting to checkout…
              </>
            ) : (
              <>
                <Zap size={18} />
                Add {selectedPack?.gb}GB for {selectedPack?.price}
                <ExternalLink size={15} className="opacity-70" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400 mt-3">
            Secure payment via Stripe · No subscription · One-time charge
          </p>
        </div>
      </div>
    </div>
  );
};

export default IncreaseStorageModal;