import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, ArrowLeft, Zap } from 'lucide-react';
import api from '../services/api';

const EnterprisePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Custom selections
  const [storageGB, setStorageGB] = useState(100);
  const [teamMembers, setTeamMembers] = useState(50);
  const [customFeatures, setCustomFeatures] = useState({
    whiteLabel: false,
    apiAccess: false,
    customIntegrations: false,
    dedicatedSupport: true,
  });

  // Storage options
  const storageOptions = [
    { value: 100, label: '100 GB' },
    { value: 250, label: '250 GB' },
    { value: 500, label: '500 GB' },
    { value: 1000, label: '1.5 TB (1000 GB)' },
    { value: 2000, label: '2 TB (2000 GB)' },
    { value: 5000, label: '5 TB (5000 GB)' },
  ];

  // Team member options
  const teamOptions = [
    { value: 50, label: '50 Team Members' },
    { value: 100, label: '100 Team Members' },
    { value: 250, label: '250 Team Members' },
    { value: 500, label: '500 Team Members' },
    { value: 1000, label: '1000 Team Members' },
    { value: -1, label: 'Unlimited Team Members' },
  ];

  // Calculate price based on selections
  const calculatePrice = () => {
    let basePrice = 199;
    
    // Storage pricing
    if (storageGB > 100) {
      basePrice += Math.floor((storageGB - 100) / 100) * 25;
    }
    
    // Team member pricing
    if (teamMembers > 50 && teamMembers !== -1) {
      basePrice += Math.floor((teamMembers - 50) / 50) * 30;
    } else if (teamMembers === -1) {
      basePrice += 150; // Unlimited team members
    }
    
    // Feature pricing
    if (customFeatures.whiteLabel) basePrice += 100;
    if (customFeatures.apiAccess) basePrice += 75;
    if (customFeatures.customIntegrations) basePrice += 150;
    
    return basePrice;
  };

  const handleProceed = async () => {
    setLoading(true);

    try {
      const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');

      if (!signupData.email || !signupData.password) {
        navigate('/signup');
        return;
      }

      // Store enterprise configuration
      const enterpriseConfig = {
        storageGB,
        teamMembers,
        features: customFeatures,
        calculatedPrice: calculatePrice(),
      };

      localStorage.setItem('enterpriseConfig', JSON.stringify(enterpriseConfig));

      const response = await api.post('/auth/checkout', {
        ...signupData,
        plan: 'ORG_ENTERPRISE',
        enterpriseConfig,
      });

      if (response.data.status === 'success') {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.response?.data?.message || 'Failed to create checkout');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (feature) => {
    setCustomFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const currentPrice = calculatePrice();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/plans')}
            className="inline-flex items-center gap-2 text-primary hover:text-secondary mb-6 font-semibold"
          >
            <ArrowLeft size={20} />
            Back to Plans
          </button>
          
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-4">
            <Zap className="text-white" size={40} />
          </div>
          
          <h1 className="text-5xl font-bold text-primary mb-3">
            Enterprise Plan
          </h1>
          <p className="text-xl text-secondary">
            Customize your plan to fit your organization's needs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">Configure Your Plan</h2>

              {/* Storage Selection */}
              <div className="mb-8">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Storage Capacity
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {storageOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStorageGB(option.value)}
                      className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                        storageGB === option.value
                          ? 'border-primary bg-purple-50 text-primary'
                          : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Members Selection */}
              <div className="mb-8">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Team Members
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {teamOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTeamMembers(option.value)}
                      className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                        teamMembers === option.value
                          ? 'border-primary bg-purple-50 text-primary'
                          : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Features */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Additional Features
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-all">
                    <input
                      type="checkbox"
                      checked={customFeatures.whiteLabel}
                      onChange={() => toggleFeature('whiteLabel')}
                      className="w-5 h-5 text-primary"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">White Label Solution</span>
                      <span className="text-secondary ml-2">+$100/month</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-all">
                    <input
                      type="checkbox"
                      checked={customFeatures.apiAccess}
                      onChange={() => toggleFeature('apiAccess')}
                      className="w-5 h-5 text-primary"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">API Access</span>
                      <span className="text-secondary ml-2">+$75/month</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-all">
                    <input
                      type="checkbox"
                      checked={customFeatures.customIntegrations}
                      onChange={() => toggleFeature('customIntegrations')}
                      className="w-5 h-5 text-primary"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">Custom Integrations</span>
                      <span className="text-secondary ml-2">+$150/month</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-primary rounded-lg bg-purple-50">
                    <input
                      type="checkbox"
                      checked={customFeatures.dedicatedSupport}
                      disabled
                      className="w-5 h-5 text-primary"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">24/7 Dedicated Support</span>
                      <span className="text-primary ml-2">✓ Included</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-xl p-8 text-white sticky top-8">
              <h3 className="text-2xl font-bold mb-6">Plan Summary</h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span>Storage</span>
                  <span className="font-semibold">
                    {storageGB >= 1000 ? `${storageGB / 1000} TB` : `${storageGB} GB`}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span>Team Members</span>
                  <span className="font-semibold">
                    {teamMembers === -1 ? 'Unlimited' : teamMembers}
                  </span>
                </div>

                {customFeatures.whiteLabel && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check size={16} />
                    <span>White Label Solution</span>
                  </div>
                )}

                {customFeatures.apiAccess && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check size={16} />
                    <span>API Access</span>
                  </div>
                )}

                {customFeatures.customIntegrations && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check size={16} />
                    <span>Custom Integrations</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} />
                  <span>24/7 Dedicated Support</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-4 mb-6">
                <div className="text-sm opacity-90 mb-1">Total Price</div>
                <div className="text-4xl font-bold">${currentPrice}</div>
                <div className="text-sm opacity-90">per month</div>
              </div>

              <button
                onClick={handleProceed}
                disabled={loading}
                className="w-full bg-white text-primary py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>

              <p className="text-xs text-center mt-4 opacity-75">
                You'll be redirected to secure Stripe checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterprisePage;