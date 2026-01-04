import React, { useState, useEffect } from 'react';
import api from '../services/api';

const RefundSection = () => {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      // ✅ CORRECT PATH: /user/refund/check-eligibility
      const response = await api.get('/user/refund/check-eligibility');
      setEligibility(response.data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setEligibility({
        status: 'error',
        eligible: false,
        message: 'Unable to check refund eligibility'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!refundReason || refundReason.trim().length < 10) {
      alert('Please provide a reason for the refund (minimum 10 characters)');
      return;
    }

    if (!window.confirm('⚠️ FINAL WARNING: This will PERMANENTLY DELETE your account and ALL data. This CANNOT be undone. Are you absolutely sure?')) {
      return;
    }

    try {
      setProcessing(true);
      // ✅ CORRECT PATH: /user/refund/request
      const response = await api.post('/user/refund/request', {
        reason: refundReason
      });

      if (response.data.status === 'success') {
        alert(`✅ Refund processed successfully!\n\n` +
              `Refund Amount: $${response.data.refund.amount}\n` +
              `Refund ID: ${response.data.refund.id}\n\n` +
              `Your account has been deleted. You will now be logged out.`);
        
        // Clear auth and redirect
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error requesting refund:', error);
      alert('Failed to process refund. Please contact support.');
    } finally {
      setProcessing(false);
      setShowModal(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Refund Policy</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking eligibility...</p>
        </div>
      </div>
    );
  }

  if (!eligibility || !eligibility.eligible) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Refund Policy</h3>
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <p className="text-gray-700">
            {eligibility?.message || 'Refund eligibility information not available'}
          </p>
        </div>
        <div className="text-sm text-gray-600">
          <p>Our 7-day refund policy allows you to request a full refund within 7 days of subscribing. If you have any concerns, please contact our support team.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Refund Policy</h3>
        
        {/* Eligibility Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-green-800">You are eligible for a refund!</span>
          </div>
          <p className="text-green-700">
            You have <strong>{eligibility.daysRemaining} days remaining</strong> to request a refund.
          </p>
          <p className="text-sm text-green-600 mt-1">
            Subscribed: {new Date(eligibility.subscriptionStartDate).toLocaleDateString()}
          </p>
        </div>

        {/* Warning Section */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start mb-2">
            <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-red-800 mb-2">⚠️ PERMANENT ACCOUNT DELETION</h4>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>Your account will be <strong>permanently deleted</strong></li>
                <li>All media files will be <strong>permanently removed</strong></li>
                <li>All campaigns will be <strong>deleted</strong></li>
                <li>All QR codes will <strong>stop working</strong></li>
                <li>All analytics data will be <strong>lost forever</strong></li>
                <li>You will <strong>NOT be able to log in again</strong></li>
                <li className="font-bold">This action <strong>CANNOT BE UNDONE</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Refund Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Request Refund & Delete Account
        </button>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Refunds typically process within 5-10 business days
        </p>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Final Confirmation</h3>
            
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold mb-2">This will:</p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Process your refund</li>
                <li>• <strong>Permanently delete your account</strong></li>
                <li>• <strong>Delete ALL your data</strong></li>
                <li>• Make all your QR codes stop working</li>
                <li>• <strong>CANNOT BE UNDONE</strong></li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please tell us why you're requesting a refund: <span className="text-red-500">*</span>
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="4"
                placeholder="Minimum 10 characters required..."
                disabled={processing}
              />
              <p className="text-xs text-gray-500 mt-1">
                {refundReason.length}/10 characters minimum
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleRefundRequest}
                disabled={processing || refundReason.trim().length < 10}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Confirm Refund & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RefundSection;
