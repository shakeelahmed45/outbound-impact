import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const AcceptInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [actionComplete, setActionComplete] = useState(false);
  const [actionType, setActionType] = useState(''); // 'accepted' or 'declined'

  useEffect(() => {
    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await api.get(`/team/invitation/${token}`);
      if (response.data.status === 'success') {
        setInvitation(response.data.invitation);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const response = await api.post(`/team/invitation/${token}/accept`);
      if (response.data.status === 'success') {
        setActionComplete(true);
        setActionType('accepted');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this invitation?')) return;
    
    setDeclining(true);
    try {
      const response = await api.post(`/team/invitation/${token}/decline`);
      if (response.data.status === 'success') {
        setActionComplete(true);
        setActionType('declined');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to decline invitation');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/signin')}
            className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (actionComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          {actionType === 'accepted' ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Invitation Accepted! 🎉</h1>
              <p className="text-gray-600 mb-6">
                You've successfully joined <strong>{invitation.organizationName}'s</strong> team as a <strong>{invitation.role}</strong>.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Please sign in to access your team's content and start collaborating.
              </p>
              <button
                onClick={() => navigate('/signin')}
                className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold w-full"
              >
                Sign In to Continue
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} className="text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Invitation Declined</h1>
              <p className="text-gray-600 mb-6">
                You've declined the invitation from <strong>{invitation.organizationName}</strong>.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold w-full hover:bg-gray-50"
              >
                Go to Homepage
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const isExpired = invitation.isExpired;
  const alreadyAccepted = invitation.status === 'ACCEPTED';
  const alreadyDeclined = invitation.status === 'DECLINED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/logo.webp" 
            alt="Outbound Impact" 
            className="w-24 h-24 mx-auto mb-4"
            onError={(e) => e.target.style.display = 'none'}
          />
          <h1 className="text-3xl font-bold text-primary mb-2">Team Invitation</h1>
        </div>

        {/* Status Messages */}
        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800 text-sm font-medium">This invitation has expired</p>
          </div>
        )}

        {alreadyAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            <p className="text-green-800 text-sm font-medium">This invitation has already been accepted</p>
          </div>
        )}

        {alreadyDeclined && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="text-gray-600 flex-shrink-0" size={20} />
            <p className="text-gray-800 text-sm font-medium">This invitation has been declined</p>
          </div>
        )}

        {/* Invitation Details */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-600 mb-2">You've been invited to join:</p>
          <h2 className="text-2xl font-bold text-primary mb-4">{invitation.organizationName}</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Email:</span>
              <span className="text-sm font-medium text-gray-900">{invitation.email}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Role:</span>
              <span className="px-3 py-1 bg-purple-100 text-primary rounded-full text-sm font-medium">
                {invitation.role}
              </span>
            </div>

            {!isExpired && invitation.daysRemaining > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-orange-600" />
                <span className="text-orange-600 font-medium">
                  Expires in {invitation.daysRemaining} day{invitation.daysRemaining !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Role Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-blue-800">
            <strong>As a {invitation.role}:</strong>{' '}
            {invitation.role === 'VIEWER' && 'You can view all content, campaigns, and analytics.'}
            {invitation.role === 'EDITOR' && 'You can view and edit content, create campaigns, and manage media.'}
            {invitation.role === 'ADMIN' && 'You have full access to all features including team management and settings.'}
          </p>
        </div>

        {/* Action Buttons */}
        {!isExpired && !alreadyAccepted && !alreadyDeclined && (
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="w-full gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Accept Invitation
                </>
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={accepting || declining}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {declining ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle size={20} />
                  Decline
                </>
              )}
            </button>
          </div>
        )}

        {(isExpired || alreadyAccepted || alreadyDeclined) && (
          <button
            onClick={() => navigate('/signin')}
            className="w-full gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
          >
            Go to Sign In
          </button>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;