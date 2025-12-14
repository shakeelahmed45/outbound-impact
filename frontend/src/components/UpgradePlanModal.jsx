import { useState } from 'react';
import { X, Check, Loader, TrendingUp, Zap } from 'lucide-react';
import api from '../services/api';

const UpgradePlanModal = ({ isOpen, onClose, currentPlan, onUpgradeSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Plan details
  const plans = {
    INDIVIDUAL: {
      name: 'Individual',
      price: 15,
      storage: '2 GB',
      features: ['2GB Storage', 'Basic QR codes', '1 User'],
    },
    ORG_SMALL: {
      name: 'Small Organization',
      price: 30,
      storage: '10 GB',
      features: ['10GB Storage', 'Advanced QR & NFC', 'Up to 5 Users', 'Team Collaboration'],
    },
    ORG_MEDIUM: {
      name: 'Medium Organization',
      price: 50,
      storage: '30 GB',
      features: ['30GB Storage', 'Advanced QR & NFC', 'Up to 20 Users', 'Analytics Dashboard', 'Priority Support'],
    },
    ORG_ENTERPRISE: {
      name: 'Enterprise',
      price: 100,
      storage: '100 GB',
      features: ['100GB Storage', 'All Features', 'Unlimited Users', 'API Access', 'White Label', 'Dedicated Support'],
    },
  };

  // Get available upgrade options (only plans higher than current)
  const getAvailablePlans = () => {
    const planOrder = ['INDIVIDUAL', 'ORG_SMALL', 'ORG_MEDIUM', 'ORG_ENTERPRISE'];
    const currentIndex = planOrder.indexOf(currentPlan);
    
    return planOrder.slice(currentIndex + 1).map(planKey => ({
      key: planKey,
      ...plans[planKey],
    }));
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/upgrade-plan', {
        newPlan: selectedPlan
      });

      if (response.data.status === 'success') {
        // Show success message with proration details
        const { upgrade } = response.data;
        
        alert(
          `✅ Successfully upgraded!\n\n` +
          `From: ${upgrade.oldPlan}\n` +
          `To: ${upgrade.newPlan}\n\n` +
          `Prorated charge: $${upgrade.proratedAmount.toFixed(2)}\n` +
          `Next billing: ${new Date(upgrade.nextBillingDate).toLocaleDateString()}\n\n` +
          `Your data has been automatically migrated to the new plan!`
        );

        // Notify parent component
        if (onUpgradeSuccess) {
          onUpgradeSuccess(response.data.user);
        }

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

  const availablePlans = getAvailablePlans();

  if (availablePlans.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Upgrade Plan</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-600">You're already on the highest plan! 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp size={32} />
                Upgrade Your Plan
              </h2>
              <p className="text-purple-100 mt-2">
                Current Plan: <strong>{plans[currentPlan]?.name}</strong>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Zap className="text-blue-600 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Prorated Billing</h3>
                <p className="text-blue-700 text-sm">
                  You'll only pay for the unused portion of your new plan. The remaining value from
                  your current plan will be credited to your upgrade!
                </p>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {availablePlans.map((plan) => (
              <div
                key={plan.key}
                onClick={() => setSelectedPlan(plan.key)}
                className={`
                  border-2 rounded-xl p-6 cursor-pointer transition-all
                  ${selectedPlan === plan.key
                    ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }
                `}
              >
                {/* Plan Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    UPGRADE
                  </span>
                  {selectedPlan === plan.key && (
                    <div className="bg-purple-500 text-white rounded-full p-1">
                      <Check size={16} />
                    </div>
                  )}
                </div>

                {/* Plan Name */}
                <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>

                {/* Storage */}
                <div className="bg-gray-100 rounded-lg px-3 py-2 mb-4">
                  <p className="text-sm font-semibold text-gray-700">{plan.storage} Storage</p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={16} className="text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Upgrade Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={!selectedPlan || loading}
              className="
                px-8 py-3 bg-gradient-to-r from-purple-600 to-violet-600 
                text-white font-semibold rounded-lg shadow-lg
                hover:shadow-xl transform hover:scale-105 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                flex items-center gap-2
              "
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Upgrading...
                </>
              ) : (
                <>
                  <TrendingUp size={20} />
                  Upgrade Now
                </>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            💡 All your data, campaigns, and content will automatically move to your new plan!
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlanModal;
