import { useState } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const SubscriptionBlockedModal = ({ user, onReactivateSuccess }) => {
  const { logout } = useAuthStore();
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState('');

  // ✅ Check if user is organization owner (not a team member)
  const isOrganizationOwner = !user?.isTeamMember;

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      {/* Modal Container - Responsive and Scrollable */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 mx-auto">
        {/* Header - Sticky on scroll */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 sm:p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 sm:p-3 rounded-full flex-shrink-0">
              <AlertTriangle size={24} className="sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold leading-tight">
                {isOrganizationOwner ? 'Subscription Canceled' : 'Organization Access Blocked'}
              </h2>
              <p className="text-red-100 text-xs sm:text-sm mt-1">Access Restricted</p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 sm:p-4">
            {isOrganizationOwner ? (
              <>
                <p className="text-red-900 font-medium mb-2 text-sm sm:text-base">
                  Your subscription has been canceled.
                </p>
                <p className="text-red-800 text-xs sm:text-sm">
                  You no longer have access to premium features. To continue using Outbound Impact, 
                  please reactivate your subscription.
                </p>
              </>
            ) : (
              <>
                <p className="text-red-900 font-medium mb-2 text-sm sm:text-base">
                  Organization subscription has been canceled.
                </p>
                <p className="text-red-800 text-xs sm:text-sm">
                  The organization owner has canceled the subscription. You no longer have access to this organization's features. 
                  Please contact the organization owner to reactivate.
                </p>
              </>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-600 mb-1">
                  {isOrganizationOwner ? 'Account' : 'Your Email'}
                </p>
                <p className="text-gray-900 font-semibold text-xs sm:text-sm truncate" title={user?.email}>
                  {user?.email}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 mb-1">
                  {isOrganizationOwner ? 'Previous Plan' : 'Your Role'}
                </p>
                <p className="text-gray-900 font-semibold text-xs sm:text-sm">
                  {isOrganizationOwner ? (
                    user?.role === 'ORG_SMALL' ? 'Small Organization' :
                    user?.role === 'ORG_MEDIUM' ? 'Medium Organization' :
                    user?.role === 'ORG_ENTERPRISE' ? 'Enterprise' : 'Individual'
                  ) : (
                    user?.teamRole || 'Team Member'
                  )}
                </p>
              </div>
            </div>
            
            {/* Show organization info for team members */}
            {!isOrganizationOwner && user?.organization && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Organization</p>
                <p className="text-gray-900 font-semibold text-xs sm:text-sm">
                  {user.organization.name}
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Contact: {user.organization.email}
                </p>
              </div>
            )}
          </div>

          {/* What You Lost */}
          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm sm:text-base">Features No Longer Available:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-700 text-xs sm:text-sm">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                <span>QR code generation and management</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-xs sm:text-sm">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                <span>Media uploads and campaigns</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-xs sm:text-sm">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                <span>Analytics and tracking</span>
              </li>
              {((user?.role === 'ORG_SMALL' || user?.role === 'ORG_MEDIUM' || user?.role === 'ORG_ENTERPRISE') || !isOrganizationOwner) && (
                <li className="flex items-start gap-2 text-gray-700 text-xs sm:text-sm">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                  <span>Team collaboration features</span>
                </li>
              )}
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-2 border-red-400 rounded-xl p-3 sm:p-4">
              <p className="text-red-900 text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* ✅ ONLY show Reactivate button to ORGANIZATION OWNERS */}
            {isOrganizationOwner && (
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
              >
                {reactivating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    <span className="text-xs sm:text-base">Redirecting to Checkout...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>Reactivate Subscription</span>
                  </>
                )}
              </button>
            )}

            {/* ✅ Team members see message instead of reactivate button */}
            {!isOrganizationOwner && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-blue-900 text-sm font-medium mb-2">
                  ⓘ Only the organization owner can reactivate
                </p>
                <p className="text-blue-800 text-xs">
                  Please contact <strong>{user?.organization?.email}</strong> to reactivate the subscription.
                </p>
              </div>
            )}

            {/* Logout Button - EVERYONE sees this */}
            <button
              onClick={handleLogout}
              disabled={reactivating}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <LogOut size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center pt-3 sm:pt-4 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
              Need help? Contact us at{' '}
              <a 
                href="mailto:support@outboundimpact.net" 
                className="text-purple-600 hover:text-purple-800 font-medium break-all"
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
