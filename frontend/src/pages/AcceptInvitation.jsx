import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, Eye, EyeOff, Lock, Shield } from 'lucide-react';
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
  const [actionType, setActionType] = useState('');
  
  // Password setup state
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  useEffect(() => {
    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await api.get(`/team/invitation/${token}`);
      if (response.data.status === 'success') {
        setInvitation(response.data.invitation);
        setUserExists(response.data.userExists);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper function to check if this is an admin role
  const isAdminRole = (role) => {
    return role === 'ADMIN' || role === 'CUSTOMER_SUPPORT';
  };

  // ✅ Helper function to get the correct login path
  const getLoginPath = () => {
    if (invitation && isAdminRole(invitation.role)) {
      return '/admin-login';  // ✅ FIXED: Correct URL
    }
    return '/signin';
  };

  // ✅ Helper function to get friendly role name
  const getRoleName = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'CUSTOMER_SUPPORT':
        return 'Customer Support Agent';
      default:
        return role;
    }
  };

  const handleAccept = async () => {
    if (!userExists) {
      setShowPasswordSetup(true);
      return;
    }

    setAccepting(true);
    try {
      const response = await api.post(`/team/invitation/${token}/accept`, {});
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

  const handlePasswordSetup = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSettingPassword(true);
    setError('');

    try {
      const response = await api.post(`/team/invitation/${token}/accept`, {
        name: name.trim(),
        password,
      });

      if (response.data.status === 'success') {
        setActionComplete(true);
        setActionType('accepted');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to setup account');
    } finally {
      setSettingPassword(false);
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

  if (error && !showPasswordSetup) {
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
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Welcome to the Team! 🎉</h1>
              <p className="text-gray-600 mb-6">
                You have successfully joined <strong>{invitation.organizationName}</strong> as a <strong>{getRoleName(invitation.role)}</strong>.
              </p>
              
              {/* ✅ Show different message for admin roles */}
              {isAdminRole(invitation.role) ? (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <Shield className="text-purple-600 flex-shrink-0" size={20} />
                    <p className="text-purple-800 text-sm font-medium text-left">
                      You now have admin access. Please sign in through the Admin Portal.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/admin-login')}
                    className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold w-full"
                  >
                    Go to Admin Login
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-6">
                    {userExists 
                      ? 'Please sign in with your existing credentials to access your team content.'
                      : 'Your account has been created! Please sign in with your new credentials.'}
                  </p>
                  <button
                    onClick={() => navigate('/signin')}
                    className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold w-full"
                  >
                    Sign In to Continue
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} className="text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Invitation Declined</h1>
              <p className="text-gray-600 mb-6">
                You have declined the invitation from <strong>{invitation.organizationName}</strong>.
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

  if (showPasswordSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h1>
            <p className="text-gray-600">
              Set up your account to join as <strong>{getRoleName(invitation.role)}</strong>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* ✅ Show admin badge for admin roles */}
          {isAdminRole(invitation.role) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <Shield className="text-purple-600 flex-shrink-0" size={20} />
              <p className="text-purple-800 text-sm font-medium">
                You're creating an admin account with elevated privileges.
              </p>
            </div>
          )}

          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800 font-medium mb-2">Password Requirements:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className={password.length >= 6 ? 'text-green-600' : 'text-gray-400'} />
                  At least 6 characters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className={password === confirmPassword && password.length > 0 ? 'text-green-600' : 'text-gray-400'} />
                  Passwords match
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={settingPassword}
                className="w-full gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {settingPassword ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Setting Up Account...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Complete Registration
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPasswordSetup(false)}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                disabled={settingPassword}
              >
                Back
              </button>
            </div>
          </form>
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
        <div className="text-center mb-8">
          <img 
            src="/logo.webp" 
            alt="Outbound Impact" 
            className="w-50 h-24 mx-auto mb-4"
            onError={(e) => e.target.style.display = 'none'}
          />
          <h1 className="text-3xl font-bold text-primary mb-2">
            {isAdminRole(invitation.role) ? 'Admin Team Invitation' : 'Team Invitation'}
          </h1>
        </div>

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

        {!isExpired && !alreadyAccepted && !alreadyDeclined && userExists && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="text-blue-600 flex-shrink-0" size={20} />
            <p className="text-blue-800 text-sm font-medium">
              Great! You already have an account. Just accept to join the team.
            </p>
          </div>
        )}

        {!isExpired && !alreadyAccepted && !alreadyDeclined && !userExists && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Lock className="text-primary flex-shrink-0" size={20} />
            <p className="text-primary text-sm font-medium">
              You will create your account in the next step
            </p>
          </div>
        )}

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-600 mb-2">You have been invited to join:</p>
          <h2 className="text-2xl font-bold text-primary mb-4">{invitation.organizationName}</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Email:</span>
              <span className="text-sm font-medium text-gray-900">{invitation.email}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Role:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isAdminRole(invitation.role) 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-purple-100 text-primary'
              }`}>
                {getRoleName(invitation.role)}
              </span>
            </div>

            {!isExpired && invitation.daysRemaining > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-orange-600" />
                <span className="text-orange-600 font-medium">
                  Expires in {invitation.daysRemaining} {invitation.daysRemaining !== 1 ? 'days' : 'day'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-blue-800">
            <strong>As a {getRoleName(invitation.role)}:</strong>{' '}
            {invitation.role === 'VIEWER' && 'You can view all content, campaigns, and analytics.'}
            {invitation.role === 'EDITOR' && 'You can view and edit content, create campaigns, and manage media.'}
            {invitation.role === 'ADMIN' && 'You have full administrative access to the platform including user management, system settings, and all features.'}
            {invitation.role === 'CUSTOMER_SUPPORT' && 'You can access the admin panel to help users, manage support tickets, and view user information.'}
          </p>
        </div>

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
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  {userExists ? 'Accept Invitation' : 'Accept & Setup Account'}
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
            onClick={() => navigate(getLoginPath())}
            className="w-full gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
          >
            {isAdminRole(invitation.role) ? 'Go to Admin Login' : 'Go to Sign In'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
