import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Zap } from 'lucide-react';
import api from '../services/api';

const Plans = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  
  // ✅ Coupon code state
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  
  // Enterprise customization state
  const [enterpriseStorage, setEnterpriseStorage] = useState(1500);
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
        'Lifetime access',
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
    { value: 1500, label: '1.5 TB', price: 0 },
    { value: 2000, label: '2 TB', price: 50 },
    { value: 3000, label: '3 TB', price: 150 },
    { value: 5000, label: '5 TB', price: 350 },
    { value: 10000, label: '10 TB', price: 850 },
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
    let basePrice = 99;
    
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
    setCouponError('');
    setCouponSuccess('');

    try {
      const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');

      if (!signupData.email || !signupData.password) {
        navigate('/signup');
        return;
      }

      // ✅ Prepare checkout data
      const requestData = {
        ...signupData,
        plan: planId,
      };

      // ✅ Add coupon code if provided
      if (couponCode.trim()) {
        requestData.couponCode = couponCode.trim().toUpperCase();
        console.log('🎫 Applying coupon code:', couponCode.trim().toUpperCase());
      }

      const response = await api.post('/auth/checkout', requestData);

      if (response.data.status === 'success') {
        if (couponCode.trim()) {
          setCouponSuccess('✅ Coupon code applied successfully!');
        }
        // Small delay to show success message
        setTimeout(() => {
          window.location.href = response.data.url;
        }, 500);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create checkout';
      
      // ✅ Show coupon-specific errors
      if (errorMessage.toLowerCase().includes('coupon') || errorMessage.toLowerCase().includes('invalid')) {
        setCouponError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
      setSelectedPlan('');
    }
  };

  const handleEnterpriseCheckout = async () => {
    setLoading(true);
    setSelectedPlan('ORG_ENTERPRISE');
    setCouponError('');
    setCouponSuccess('');

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

      // ✅ Prepare request data
      const requestData = {
        ...signupData,
        plan: 'ORG_ENTERPRISE',
        enterpriseConfig,
      };

      // ✅ Add coupon code if provided
      if (couponCode.trim()) {
        requestData.couponCode = couponCode.trim().toUpperCase();
        console.log('🎫 Applying coupon code to Enterprise:', couponCode.trim().toUpperCase());
      }

      const response = await api.post('/auth/checkout', requestData);

      if (response.data.status === 'success') {
        if (couponCode.trim()) {
          setCouponSuccess('✅ Coupon code applied successfully!');
        }
        setTimeout(() => {
          window.location.href = response.data.url;
        }, 500);
      }
    } catch (error) {
      console.error('Enterprise checkout error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Failed to create enterprise checkout. Please make sure STRIPE_ENTERPRISE_PRICE is set in backend .env';
      
      // ✅ Show coupon-specific errors
      if (errorMessage.toLowerCase().includes('coupon') || errorMessage.toLowerCase().includes('invalid')) {
        setCouponError(errorMessage);
      } else {
        alert(errorMessage);
      }
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

      {/* ✅ Coupon Code Input - ADDED! */}
      <div className="max-w-md mx-auto mb-8">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🎟️</span>
            <h3 className="text-lg font-bold text-purple-800">Have a Coupon Code?</h3>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError('');
                setCouponSuccess('');
              }}
              placeholder="Enter coupon code"
              className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase font-mono text-lg"
              disabled={loading}
            />
          </div>

          {/* Success Message */}
          {couponSuccess && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-semibold flex items-center gap-2">
                <span>✅</span>
                {couponSuccess}
              </p>
            </div>
          )}

          {/* Error Message */}
          {couponError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-semibold flex items-center gap-2">
                <span>❌</span>
                {couponError}
              </p>
            </div>
          )}

          <p className="mt-3 text-sm text-purple-600">
            💡 Enter your code and select a plan below. The discount will be applied at checkout!
          </p>
        </div>
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
                <span className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  🔥 Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {plan.name}
              </h3>
              <div className="mb-2">
                <span className="text-5xl font-bold text-primary">
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
