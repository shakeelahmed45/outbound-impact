import { useState } from 'react';
import { X, Check, Loader, TrendingUp, Zap, Building2, ChevronRight } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import EnterpriseContactModal from './EnterpriseContactModal';

const UpgradePlanModal = ({ isOpen, onClose, currentPlan, onUpgradeSuccess }) => {
  const [selectedPlan, setSelectedPlan]           = useState('');
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState('');
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  const { user } = useAuthStore();

  const plans = {
    INDIVIDUAL: {
      name: 'Personal Single Use', price: 69, period: 'one-time', storage: '25 GB', color: 'emerald',
      features: ['1 stream', '25GB storage', 'Basic analytics', 'QR code generation', '12 months access'],
    },
    PERSONAL_LIFE: {
      name: 'Personal Life Events', price: 15, period: '/month', storage: '100 GB', color: 'purple',
      features: ['Up to 10 streams', '100GB storage', 'Full analytics', 'Push notifications', 'Unlimited QR & NFC'],
    },
    ORG_EVENTS: {
      name: 'Org Events', price: 199, period: 'one-time', storage: '250 GB', color: 'amber',
      features: ['1 event stream', '250GB storage', 'Team access', 'Attendee analytics', 'Branded event portal'],
    },
    ORG_SMALL: {
      name: 'Starter', price: 49, period: '/month', storage: '100 GB', color: 'emerald',
      features: ['Up to 1,000 members', '100GB storage', 'Team access (3 users)', 'Push notifications', 'Full analytics', 'CSV exports'],
    },
    ORG_MEDIUM: {
      name: 'Growth', price: 69, period: '/month', storage: '250 GB', color: 'purple',
      features: ['Up to 2,500 members', '250GB storage', 'Unlimited team users', 'Advanced analytics', 'Segmentation & groups', 'Messages'],
    },
    ORG_SCALE: {
      name: 'Pro', price: 99, period: '/month', storage: '500 GB', color: 'rose',
      features: ['Up to 5,000 members', '500GB storage', 'Unlimited team users', 'Full analytics + workflows', 'All export formats', 'Priority support'],
    },
    ORG_ENTERPRISE: {
      name: 'Enterprise', price: null, period: null, storage: 'Custom', color: 'teal',
      features: ['5,000+ members', 'Custom storage', 'White-label solution', 'API access', 'Dedicated account manager', '24/7 support'],
    },
  };

  const getAvailablePlans = () => {
    const upgradeMap = {
      'INDIVIDUAL':     ['PERSONAL_LIFE', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_SCALE', 'ORG_ENTERPRISE'],
      'PERSONAL_LIFE':  ['ORG_SMALL', 'ORG_MEDIUM', 'ORG_SCALE', 'ORG_ENTERPRISE'],
      'ORG_EVENTS':     ['ORG_SMALL', 'ORG_MEDIUM', 'ORG_SCALE', 'ORG_ENTERPRISE'],
      'ORG_SMALL':      ['ORG_MEDIUM', 'ORG_SCALE', 'ORG_ENTERPRISE'],
      'ORG_MEDIUM':     ['ORG_SCALE', 'ORG_ENTERPRISE'],
      'ORG_SCALE':      ['ORG_ENTERPRISE'],
      'ORG_ENTERPRISE': [],
    };
    return (upgradeMap[currentPlan] || []).map(key => ({ key, ...plans[key] }));
  };

  const getColorClasses = (color, isSelected) => {
    const map = {
      emerald: { border: isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300', badge: 'text-emerald-600 bg-emerald-100', check: 'text-emerald-500' },
      purple:  { border: isSelected ? 'border-purple-500 bg-purple-50'  : 'border-gray-200 hover:border-purple-300',  badge: 'text-purple-600 bg-purple-100',  check: 'text-purple-500'  },
      amber:   { border: isSelected ? 'border-amber-500 bg-amber-50'    : 'border-gray-200 hover:border-amber-300',   badge: 'text-amber-600 bg-amber-100',    check: 'text-amber-500'   },
      rose:    { border: isSelected ? 'border-rose-500 bg-rose-50'      : 'border-gray-200 hover:border-rose-300',    badge: 'text-rose-600 bg-rose-100',      check: 'text-rose-500'    },
      teal:    { border: isSelected ? 'border-teal-500 bg-teal-50'      : 'border-gray-200 hover:border-teal-300',    badge: 'text-teal-600 bg-teal-100',      check: 'text-teal-500'    },
    };
    return map[color] || map.emerald;
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) { setError('Please select a plan'); return; }

    // ✅ Enterprise → open contact modal instead of direct purchase
    if (selectedPlan === 'ORG_ENTERPRISE') {
      setShowEnterpriseModal(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/upgrade-plan', { newPlan: selectedPlan });
      if (response.data.status === 'success') {
        const { upgrade } = response.data;
        alert(
          `✅ Successfully upgraded!\n\nFrom: ${upgrade.oldPlan}\nTo: ${upgrade.newPlan}\n\nProrated charge: $${upgrade.proratedAmount.toFixed(2)}\nNext billing: ${new Date(upgrade.nextBillingDate).toLocaleDateString()}\n\nYour data has been automatically migrated!`
        );
        if (onUpgradeSuccess) onUpgradeSuccess(response.data.user);
        onClose();
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(err.response?.data?.message || 'Failed to upgrade plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availablePlans   = getAvailablePlans();
  const currentPlanData  = plans[currentPlan];
  const isEnterpriseSelected = selectedPlan === 'ORG_ENTERPRISE';

  if (availablePlans.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Upgrade Plan</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
          <p className="text-gray-600">You're already on the highest plan! 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white p-6 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  <TrendingUp size={28} /> Upgrade Your Plan
                </h2>
                <p className="text-purple-100 mt-1">
                  Current: <strong>{currentPlanData?.name || 'Free'}</strong>
                  {currentPlanData?.price && <span className="ml-2 opacity-75">(${currentPlanData.price}{currentPlanData.period})</span>}
                </p>
              </div>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
            )}

            {/* Info box — changes based on enterprise selection */}
            {isEnterpriseSelected ? (
              <div className="bg-gradient-to-r from-teal-50 to-violet-50 border border-teal-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Building2 className="text-teal-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-teal-900 mb-1">Enterprise — Custom Pricing</h3>
                    <p className="text-teal-700 text-sm">Enterprise plans are tailored to your organisation's size, storage needs, and requirements. Click "Contact Us" and our team will prepare a personalised plan and send you a checkout link within 1 business day.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Zap className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Prorated Billing</h3>
                    <p className="text-blue-700 text-sm">You'll only pay the difference. Credit from your current plan applies automatically!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Cards */}
            <div className={`grid gap-4 mb-6 ${availablePlans.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : availablePlans.length === 2 ? 'md:grid-cols-2' : ''}`}>
              {availablePlans.map((plan) => {
                const isSelected  = selectedPlan === plan.key;
                const isEnterprise = plan.key === 'ORG_ENTERPRISE';
                const c = getColorClasses(plan.color, isSelected);

                return (
                  <div key={plan.key} onClick={() => setSelectedPlan(plan.key)}
                    className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${c.border} ${isSelected ? 'shadow-lg scale-[1.02]' : 'hover:shadow-md'} ${isEnterprise ? 'relative overflow-hidden' : ''}`}>

                    {/* Enterprise gradient accent strip */}
                    {isEnterprise && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-violet-600" />
                    )}

                    <div className="flex items-center justify-between mb-3">
                      {isEnterprise ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-teal-500 to-violet-600 text-white">
                          CONTACT US
                        </span>
                      ) : (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.badge}`}>UPGRADE</span>
                      )}
                      {isSelected && <div className="bg-purple-500 text-white rounded-full p-1"><Check size={14} /></div>}
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-1">{plan.name}</h3>

                    {isEnterprise ? (
                      <div className="mb-3">
                        <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-violet-600 bg-clip-text text-transparent">
                          Custom Pricing
                        </span>
                        <p className="text-gray-400 text-xs mt-0.5">Tailored to your needs</p>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-500 text-sm">{plan.period}</span>
                      </div>
                    )}

                    <div className="bg-gray-100 rounded-lg px-3 py-1.5 mb-3 inline-block">
                      <p className="text-xs font-semibold text-gray-600">{plan.storage} Storage</p>
                    </div>

                    <ul className="space-y-1.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check size={14} className={`${c.check} flex-shrink-0`} /><span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isEnterprise && isSelected && (
                      <div className="mt-4 pt-3 border-t border-teal-200">
                        <p className="text-xs text-teal-600 font-medium flex items-center gap-1">
                          <ChevronRight size={12} /> Click "Contact Us" below to get a custom quote
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <button onClick={onClose} className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-all" disabled={loading}>
                Cancel
              </button>

              {isEnterpriseSelected ? (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="px-8 py-3 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-white"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #7c3aed)' }}
                >
                  <Building2 size={20} />
                  Contact Us
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={!selectedPlan || loading}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  {loading ? <><Loader className="animate-spin" size={20} /> Upgrading...</> : <><TrendingUp size={20} /> Upgrade Now</>}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              {isEnterpriseSelected
                ? "Our team will review your requirements and send a personalised checkout link within 1 business day."
                : "All your data, campaigns, and content will automatically move to your new plan!"}
            </p>
          </div>
        </div>
      </div>

      {/* ✅ Enterprise Contact Modal — pre-filled with user's name & email */}
      <EnterpriseContactModal
        isOpen={showEnterpriseModal}
        onClose={() => {
          setShowEnterpriseModal(false);
          // Close the upgrade modal too after enterprise enquiry submitted
        }}
        prefillName={user?.name || ''}
        prefillEmail={user?.email || ''}
      />
    </>
  );
};

export default UpgradePlanModal;