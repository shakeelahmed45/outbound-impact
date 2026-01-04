import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import api from '../services/api';

const RefundSection = () => {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/refund/check-eligibility');
      setEligibility(response.data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Please provide a reason (minimum 10 characters)');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      await api.post('/api/refund/request', { reason });

      setSuccess(true);
      setShowModal(false);

      // User will be logged out automatically as account is deleted
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
      }, 3000);

    } catch (error) {
      console.error('Refund request error:', error);
      setError(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Refund Processed Successfully!
          </h3>
          <p className="text-gray-600 mb-2">
            You will receive a confirmation email shortly.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Your account has been deleted. Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {eligibility?.eligible ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-gray-400" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              7-Day Refund Policy
            </h3>

            {eligibility?.eligible ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-semibold mb-2">
                    ✅ You are eligible for a refund!
                  </p>
                  <p className="text-green-700 text-sm">
                    You have <strong>{eligibility.daysRemaining} days</strong> remaining to request a full refund.
                  </p>
                </div>

                {/* ⚠️ CRITICAL WARNING ABOUT ACCOUNT DELETION */}
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Trash2 className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-900 font-bold text-base mb-2">
                        ⚠️ PERMANENT ACCOUNT DELETION
                      </p>
                      <p className="text-red-800 text-sm font-semibold mb-3">
                        If you cancel this subscription, you will lose access to this account and ALL data will be deleted permanently.
                      </p>
                    </div>
                  </div>
                  <ul className="text-red-700 text-sm space-y-2 ml-4 list-disc">
                    <li><strong>Your account will be permanently deleted</strong></li>
                    <li><strong>All uploaded media (images, videos, audio) will be permanently removed</strong></li>
                    <li><strong>All campaigns and QR codes will stop working</strong></li>
                    <li><strong>All analytics data will be lost forever</strong></li>
                    <li><strong>You will not be able to log in again</strong></li>
                    <li><strong>This action CANNOT be undone</strong></li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800 text-sm mb-2">
                    <strong>✅ What you will receive:</strong>
                  </p>
                  <ul className="text-blue-700 text-sm space-y-1 ml-4 list-disc">
                    <li>Full refund to your original payment method</li>
                    <li>Refund typically processes within 5-10 business days</li>
                    <li>Confirmation email with refund details</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Request Refund & Delete Account
                </button>
              </>
            ) : (
              <>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-gray-700">
                    {eligibility?.message || 'Refund eligibility information not available'}
                  </p>
                  
                  {eligibility?.daysSinceSubscription !== undefined && (
                    <p className="text-sm text-gray-500 mt-2">
                      Subscription started {eligibility.daysSinceSubscription} days ago.
                    </p>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  Our 7-day refund policy allows you to request a full refund within 7 days of subscribing. 
                  If you have any concerns, please contact our support team.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Refund Request Modal with STRONG WARNING */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Request Refund & Delete Account
                </h2>
              </div>

              {/* FINAL WARNING */}
              <div className="bg-red-50 border-2 border-red-600 rounded-lg p-5 mb-6">
                <p className="text-red-900 font-bold text-lg mb-3 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  FINAL WARNING - READ CAREFULLY
                </p>
                <div className="bg-white border-2 border-red-400 rounded p-3 mb-3">
                  <p className="text-red-900 font-bold text-center text-base">
                    ⚠️ YOUR ACCOUNT AND ALL DATA WILL BE PERMANENTLY DELETED ⚠️
                  </p>
                </div>
                <ul className="text-red-800 text-sm space-y-2 ml-4 list-disc font-medium">
                  <li>Account permanently deleted - cannot be recovered</li>
                  <li>All media files permanently removed</li>
                  <li>All campaigns permanently deleted</li>
                  <li>All QR codes will stop working</li>
                  <li>All analytics data lost forever</li>
                  <li>You cannot log in again with this email</li>
                  <li><strong>THIS ACTION CANNOT BE UNDONE</strong></li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for refund (required) *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError('');
                  }}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  placeholder="Please tell us why you're requesting a refund and deleting your account (minimum 10 characters)..."
                  disabled={processing}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {reason.length} / 10 minimum characters
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
                <p className="text-yellow-900 text-sm font-semibold mb-2">
                  💡 Need help instead?
                </p>
                <p className="text-yellow-800 text-sm">
                  Before deleting your account, consider contacting our support team at{' '}
                  <a href="mailto:support@outboundimpact.org" className="text-purple-600 underline">
                    support@outboundimpact.org
                  </a>
                  {' '}to resolve any issues.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setReason('');
                    setError('');
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestRefund}
                  disabled={processing || reason.trim().length < 10}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Delete Account & Refund
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                By clicking "Delete Account & Refund", you acknowledge that your account and all data will be permanently deleted and this action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RefundSection;
