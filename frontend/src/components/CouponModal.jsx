import { useState } from 'react';
import { X, Check, Tag } from 'lucide-react';

const CouponModal = ({ isOpen, onClose, onApplyCoupon, appliedCoupon }) => {
  const [couponInput, setCouponInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleApply = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setError('Please enter a coupon code');
      return;
    }
    
    setError('');
    setSuccess(true);
    onApplyCoupon(code);
    
    // Close modal after showing success
    setTimeout(() => {
      setSuccess(false);
      setCouponInput('');
      onClose();
    }, 1500);
  };

  const handleRemove = () => {
    onApplyCoupon(null);
    setCouponInput('');
    setError('');
    setSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto transform transition-all">
          
          {/* Header */}
          <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 px-8 py-8 rounded-t-2xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Tag className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Apply Coupon Code</h2>
                <p className="text-purple-100 text-sm mt-1">Enter your promotional code for instant savings</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {appliedCoupon ? (
              // Coupon Applied Success State
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-500 rounded-full p-2.5 flex-shrink-0">
                      <Check className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-green-900 font-bold text-lg mb-1">Coupon Applied Successfully</p>
                      <p className="text-green-700 text-sm mb-4">Your discount will be automatically applied at checkout</p>
                      
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Active Code</p>
                        <p className="text-xl font-bold text-gray-900 font-mono tracking-wide">{appliedCoupon}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleRemove}
                    className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all"
                  >
                    Remove
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : success ? (
              // Success Animation State
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4 animate-pulse">
                  <Check className="text-white" size={40} />
                </div>
                <p className="text-xl font-bold text-gray-900">Coupon Applied!</p>
                <p className="text-gray-600 mt-2">Redirecting...</p>
              </div>
            ) : (
              // Input State
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    Enter Coupon Code
                  </label>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setError('');
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleApply();
                    }}
                    placeholder="ENTER CODE"
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-mono uppercase tracking-wider transition-all placeholder:text-gray-400"
                    autoFocus
                  />
                  {error && (
                    <div className="mt-3 flex items-center gap-2 text-red-600">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-bold text-purple-700">Note:</span> Your discount will be validated and applied automatically when you proceed to the checkout page.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!couponInput.trim()}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    Apply Coupon
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CouponModal;
