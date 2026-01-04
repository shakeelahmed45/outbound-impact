import { useState } from 'react';
import { AlertTriangle, RefreshCw, LogOut, CreditCard } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const SubscriptionBlockedModal = ({ user, onReactivateSuccess }) => {
  const { logout } = useAuthStore();
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState('');

  const handleReactivate = async () => {
    try {
      setReactivating(true);
      setError('');

      // Call backend to create new checkout session for reactivation
      const response = await api.post('/subscription/reactivate');

      if (response.data.status === 'success' && response.data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = response.data.checkoutUrl;
      } else {
        setError('Failed to create checkout session. Please contact support.');
      }
    } catch (err) {
      console.error('Reactivation error:', err);
      setError(err.response?.data?.message || 'Failed to reactivate subscription. Please try again or contact support.');
      setReactivating(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/signin';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Subscription Canceled</h2>
              <p className="text-red-100 text-sm mt-1">Access Restricted</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-red-900 font-medium mb-2">
              Your subscription has been canceled.
            </p>
            <p className="text-red-800 text-sm">
              You no longer have access to premium features. To continue using Outbound Impact, 
              please reactivate your subscription.
            </p>
          </div>

          {/* Account Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Account</p>
                <p className="text-gray-900 font-semibold text-sm">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Previous Plan</p>
                <p className="text-gray-900 font-semibold text-sm">
                  {user?.role === 'ORG_SMALL' ? 'Small Organization' :
                   user?.role === 'ORG_MEDIUM' ? 'Medium Organization' :
                   user?.role === 'ORG_ENTERPRISE' ? 'Enterprise' : 'Individual'}
                </p>
              </div>
            </div>
          </div>

          {/* What You Lost */}
          <div>
            <h4 className="font-bold text-gray-800 mb-3">Features No Longer Available:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>QR code generation and management</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>Media uploads and campaigns</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>Analytics and tracking</span>
              </li>
              {(user?.role === 'ORG_SMALL' || user?.role === 'ORG_MEDIUM' || user?.role === 'ORG_ENTERPRISE') && (
                <li className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-red-500 mt-0.5">✗</span>
                  <span>Team collaboration features</span>
                </li>
              )}
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-2 border-red-400 rounded-xl p-4">
              <p className="text-red-900 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Reactivate Button */}
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            >
              {reactivating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Redirecting to Checkout...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  <span>Reactivate Subscription</span>
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={reactivating}
              className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help? Contact us at{' '}
              <a 
                href="mailto:support@outboundimpact.org" 
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                support@outboundimpact.net
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBlockedModal;
