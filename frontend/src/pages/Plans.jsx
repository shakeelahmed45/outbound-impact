import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Zap } from 'lucide-react';
import api from '../services/api';

const Plans = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  
  // Enterprise customization state
  const [enterpriseStorage, setEnterpriseStorage] = useState(100);
  const [enterpriseTeamMembers, setEnterpriseTeamMembers] = useState(50);

  const plans = [
    {
      id: 'INDIVIDUAL',
      name: 'Individual',
      price: '$85',
      period: 'one-time',
      storage: '250GB',
      features: [
        'Upload images, videos, audio',
        'QR code generation',
        'View tracking & analytics',
        '250GB storage',
        'Unlimited views',
      ],
    },
    {
      id: 'ORG_SMALL',
      name: 'Small Organization',
      price: '$35',
      period: 'per month',
      storage: '250GB',
      features: [
        'Everything in Individual',
        'Team management (up to 5 users)',
        'Campaign creation',
        '250GB storage',
        'Advanced analytics',
        'Priority support',
      ],
      popular: true,
    },
    {
      id: 'ORG_MEDIUM',
      name: 'Medium Organization',
      price: '$60',
      period: 'per month',
      storage: '500GB',
      features: [
        'Everything in Small Org',
        'Team management (up to 20 users)',
        'Custom branding',
        '500GB storage',
        'Export reports (CSV/PDF)',
        'Dedicated support',
      ],
    },
  ];

  // Storage options for Enterprise
  const storageOptions = [
    { value: 100, label: '100 GB', price: 0 },
    { value: 250, label: '250 GB', price: 35 },
    { value: 500, label: '500 GB', price: 60 },
    { value: 1500, label: '1.5 TB', price: 99 },
    { value: 2000, label: '2 TB', price: 160 },
    { value: 5000, label: '5 TB', price: 360 },
  ];

  // Team member options for Enterprise
  const teamOptions = [
    { value: 50, label: '50 Members', price: 0 },
    { value: 100, label: '100 Members', price: 30 },
    { value: 250, label: '250 Members', price: 120 },
    { value: 500, label: '500 Members', price: 270 },
    { value: 1000, label: '1000 Members', price: 570 },
    { value: -1, label: 'Unlimited', price: 150 },
  ];

  // Calculate Enterprise price
  const calculateEnterprisePrice = () => {
    let basePrice = 199;
    
    const storageOption = storageOptions.find(opt => opt.value === enterpriseStorage);
    if (storageOption) {
      basePrice += storageOption.price;
    }
    
    const teamOption = teamOptions.find(opt => opt.value === enterpriseTeamMembers);
    if (teamOption) {
      basePrice += teamOption.price;
    }
    
    return basePrice;
  };

  const handleSelectPlan = async (planId) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');

      if (!signupData.email || !signupData.password) {
        navigate('/signup');
        return;
      }

      const response = await api.post('/auth/checkout', {
        ...signupData,
        plan: planId,
      });

      if (response.data.status === 'success') {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.response?.data?.message || 'Failed to create checkout');
    } finally {
      setLoading(false);
      setSelectedPlan('');
    }
  };

  const handleEnterpriseCheckout = async () => {
    setLoading(true);
    setSelectedPlan('ORG_ENTERPRISE');

    try {
      const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');

      if (!signupData.email || !signupData.password) {
        alert('Please sign up first before selecting a plan');
        navigate('/signup');
        return;
      }

      const enterpriseConfig = {
        storageGB: enterpriseStorage,
        teamMembers: enterpriseTeamMembers,
        calculatedPrice: calculateEnterprisePrice(),
        features: {
          whiteLabel: true,
          apiAccess: true,
          customIntegrations: true,
          dedicatedSupport: true,
        }
      };

      console.log('Sending enterprise checkout request:', {
        plan: 'ORG_ENTERPRISE',
        enterpriseConfig
      });

      const response = await api.post('/auth/checkout', {
        ...signupData,
        plan: 'ORG_ENTERPRISE',
        enterpriseConfig,
      });

      if (response.data.status === 'success') {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Enterprise checkout error:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to create enterprise checkout. Please make sure STRIPE_ENTERPRISE_PRICE is set in backend .env');
    } finally {
      setLoading(false);
      setSelectedPlan('');
    }
  };

  const enterprisePrice = calculateEnterprisePrice();

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="text-center mb-12">
        <img 
          src="/logo.webp" 
          alt="Outbound Impact" 
          className="w-45 h-20 mx-auto mb-4 animate-pulse-slow"
          onError={(e) => e.target.style.display = 'none'}
        />
        <h1 className="text-5xl font-bold text-primary mb-3">
          Choose Your Plan
        </h1>
        <p className="text-xl text-secondary">
          Select the perfect plan for your needs
        </p>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl shadow-xl p-8 border-2 transition-all hover:scale-105 ${
              plan.popular ? 'border-primary' : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="gradient-btn text-white px-4 py-1 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-primary mb-2">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-secondary ml-2">
                  {plan.period}
                </span>
              </div>
              <p className="text-lg text-secondary font-semibold">
                {plan.storage} Storage
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="text-primary flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan.id)}
              disabled={loading && selectedPlan === plan.id}
              className="w-full gradient-btn text-white py-3 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && selectedPlan === plan.id ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                'Select Plan'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Enterprise Section */}
      <div className="max-w-7xl mx-auto mt-16">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-3xl p-4 sm:p-8 md:p-12 border-4 border-yellow-500">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-4">
              <Zap className="text-white" size={32} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Enterprise Plan</h2>
            <p className="text-lg sm:text-xl text-gray-700">Customize your plan to fit your organization's needs</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              {/* Storage Selection */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Select Storage Capacity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {storageOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEnterpriseStorage(option.value)}
                      className={`p-3 sm:p-4 rounded-lg border-2 font-semibold transition-all text-sm sm:text-base ${
                        enterpriseStorage === option.value
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      <div className="font-bold">{option.label}</div>
                      {option.price > 0 && (
                        <div className="text-xs text-gray-500">+${option.price}/mo</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Members Selection */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Select Team Size</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {teamOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEnterpriseTeamMembers(option.value)}
                      className={`p-3 sm:p-4 rounded-lg border-2 font-semibold transition-all text-sm sm:text-base ${
                        enterpriseTeamMembers === option.value
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      <div className="font-bold">{option.label}</div>
                      {option.price > 0 && (
                        <div className="text-xs text-gray-500">+${option.price}/mo</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enterprise Features List */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">All Enterprise Features Included</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Everything in Medium Org',
                    'Custom storage capacity',
                    'Flexible team size',
                    'White-label solution',
                    'Full API access',
                    'Custom integrations',
                    'Advanced security features',
                    'Priority email support',
                    '24/7 phone support',
                    'Dedicated account manager',
                    'Custom SLA agreements',
                    'Training & onboarding'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="text-yellow-600 flex-shrink-0" size={18} />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Summary Card */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 sm:p-8 text-white sticky top-8 shadow-2xl">
                <h3 className="text-xl sm:text-2xl font-bold mb-6">Your Enterprise Plan</h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center pb-3 border-b border-white/30">
                    <span className="font-medium text-sm sm:text-base">Storage</span>
                    <span className="font-bold text-base sm:text-lg">
                      {enterpriseStorage >= 1000 
                        ? `${enterpriseStorage / 1000} TB` 
                        : `${enterpriseStorage} GB`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-white/30">
                    <span className="font-medium text-sm sm:text-base">Team Members</span>
                    <span className="font-bold text-base sm:text-lg">
                      {enterpriseTeamMembers === -1 ? 'Unlimited' : enterpriseTeamMembers}
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs sm:text-sm opacity-90 mb-2">Included Features:</div>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Check size={14} />
                        <span>White-label solution</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} />
                        <span>Full API access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} />
                        <span>Custom integrations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} />
                        <span>24/7 dedicated support</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/20 rounded-xl p-4 sm:p-6 mb-6">
                  <div className="text-xs sm:text-sm opacity-90 mb-2">Total Monthly Price</div>
                  <div className="text-4xl sm:text-5xl font-bold mb-1">${enterprisePrice}</div>
                  <div className="text-xs sm:text-sm opacity-90">per month, billed monthly</div>
                </div>

                <button
                  onClick={handleEnterpriseCheckout}
                  disabled={loading && selectedPlan === 'ORG_ENTERPRISE'}
                  className="w-full bg-white text-yellow-600 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading && selectedPlan === 'ORG_ENTERPRISE' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span className="hidden sm:inline">Processing...</span>
                      <span className="sm:hidden">Processing</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Proceed to Checkout →</span>
                      <span className="sm:hidden">Checkout →</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-center mt-4 opacity-80">
                  Secure checkout powered by Stripe
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;