import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, Shield, LogOut, Upload, Trash2, MessageSquare, MessagesSquare, BookOpen, TrendingUp, UserCheck, Mail, Check, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import Tooltip from '../components/common/Tooltip';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/common/Toast';
import UpgradePlanModal from '../components/UpgradePlanModal';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const { toasts, showToast, removeToast } = useToast();

  const effectiveUser = user?.isTeamMember ? user.organization : user;
  const userIsTeamMember = user?.isTeamMember === true;
  const effectiveRole = effectiveUser?.role;

  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // ✅ NEW: Auto-renewal state
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [togglingRenewal, setTogglingRenewal] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  
  // ✅ Refund policy modal state
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);
  
  // Email change states
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    document.title = 'Settings | Outbound Impact';
    
    // ✅ Check if subscription has cancel_at_period_end set
    if (effectiveUser?.subscriptionStatus === 'canceling') {
      setAutoRenewal(false);
    }
  }, [effectiveUser]);

  const handleLogout = () => {
    logout();
    window.location.href = '/signin';
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/user/profile', profileData);
      if (response.data.status === 'success') {
        setUser(response.data.user);
        showToast('Profile updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle email change
  const handleEmailChange = async (e) => {
    e.preventDefault();
    
    if (!newEmail || newEmail.trim() === '') {
      showToast('Please enter a new email', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      showToast('New email is the same as current email', 'warning');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change your email to ${newEmail}?\n\nYou will need to sign in with this new email next time.`
    );

    if (!confirmed) {
      return;
    }

    setChangingEmail(true);

    try {
      const response = await api.put('/user/change-email', { newEmail });
      
      if (response.data.status === 'success') {
        showToast('Email changed successfully! Signing you out...', 'success');
        setShowEmailChange(false);
        setNewEmail('');
        
        setTimeout(() => {
          logout();
          window.location.href = '/signin';
        }, 1000); // ✅ 1 second for faster response
      } else {
        showToast('Failed to change email', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change email';
      showToast(errorMessage, 'error');
    } finally {
      setChangingEmail(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await api.put('/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      if (response.data.status === 'success') {
        showToast('Password changed successfully!', 'success');
        setShowPasswordChange(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setPasswordError('Failed to change password');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      setPasswordError(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploadingPhoto(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const photoData = e.target.result;

        const response = await api.post('/user/upload-photo', {
          photoData,
          fileName: file.name,
        });

        if (response.data.status === 'success') {
          setUser(response.data.user);
          showToast('Profile picture updated successfully!', 'success');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      showToast('Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ✅ FIXED: Toggle auto-renewal (removed frontend validation)
  const handleToggleAutoRenewal = async () => {
    const newState = !autoRenewal;
    
    const confirmed = window.confirm(
      newState 
        ? 'Enable auto-renewal? Your subscription will automatically renew at the end of the current period.'
        : 'Disable auto-renewal? Your subscription will be canceled at the end of the current billing period. You will still have access until then.'
    );

    if (!confirmed) return;

    setTogglingRenewal(true);

    try {
      const response = await api.post('/subscription/toggle-renewal', {
        autoRenewal: newState
      });

      if (response.data.status === 'success') {
        setAutoRenewal(newState);
        setUser(response.data.user);
        showToast(
          newState 
            ? 'Auto-renewal enabled! Your subscription will renew automatically.'
            : 'Auto-renewal disabled. Your subscription will end on ' + new Date(response.data.currentPeriodEnd).toLocaleDateString(),
          'success'
        );
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to toggle auto-renewal';
      showToast(errorMessage, 'error');
    } finally {
      setTogglingRenewal(false);
    }
  };

  // ✅ FIXED: Cancel subscription (removed frontend validation)
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      '⚠️ Cancel Subscription?\n\n' +
      'Your subscription will be canceled immediately and you will receive a prorated refund for the unused time.\n\n' +
      'You will lose access to:\n' +
      '• All uploaded content\n' +
      '• Team collaboration features\n' +
      '• Analytics and tracking\n' +
      '• QR code generation\n\n' +
      'This action cannot be undone. Are you sure?'
    );

    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'Type "CANCEL" to confirm subscription cancellation and refund:'
    );

    if (doubleConfirm !== 'CANCEL') {
      showToast('Cancellation cancelled', 'warning');
      return;
    }

    setCancelingSubscription(true);

    try {
      const response = await api.post('/subscription/cancel');

      if (response.data.status === 'success') {
        showToast(
          `Subscription canceled! ${response.data.refund ? 'Refund of $' + (response.data.refund.amount / 100).toFixed(2) + ' has been processed.' : ''}`,
          'success'
        );
        
        setUser(response.data.user);
        
        // ✅ Refresh browser to trigger blocking modal
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500); // 1.5 seconds to show success message
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to cancel subscription';
      showToast(errorMessage, 'error');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
    );

    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'Type "DELETE" to confirm account deletion:'
    );

    if (doubleConfirm !== 'DELETE') {
      showToast('Account deletion cancelled', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await api.delete('/user/account');
      if (response.data.status === 'success') {
        showToast('Account deleted successfully', 'success');
        setTimeout(() => {
          logout();
          window.location.href = '/signin';
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      showToast('Failed to delete account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (role) => {
    const plans = {
      INDIVIDUAL: 'Individual Plan',
      ORG_SMALL: 'Small Organization',
      ORG_MEDIUM: 'Medium Organization',
      ORG_ENTERPRISE: 'Enterprise',
    };
    return plans[role] || 'Unknown Plan';
  };

  const formatStorage = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  // Menu items configuration
  const menuItems = [
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      description: 'Manage your personal information',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      id: 'subscription',
      icon: CreditCard,
      label: 'Subscription',
      description: 'View your plan and billing',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'feedback',
      icon: MessageSquare,
      label: 'Feedback',
      description: 'Share your thoughts',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'live-chat',
      icon: MessagesSquare,
      label: 'Live Chat',
      description: 'Get instant support',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      id: 'guide',
      icon: BookOpen,
      label: 'User Guide',
      description: 'Learn how to use the platform',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      action: () => navigate('/dashboard/guide'),
    },
  ];

  if (!userIsTeamMember) {
    menuItems.push({
      id: 'security',
      icon: Shield,
      label: 'Security',
      description: 'Password and account settings',
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
    });
  }

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === 'profile') {
      return (
        <div className="space-y-6">
          {/* Profile Information Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="text-white" size={20} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Profile Information</h3>
            </div>
            
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                Profile Picture
                <Tooltip content="Upload a photo to personalize your account" />
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {user?.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                      <span className="text-3xl text-white font-bold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl font-semibold hover:shadow-2xl transform hover:scale-105 transition-all inline-flex items-center gap-2">
                    <Upload size={18} />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG, or GIF (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Full Name
                    <Tooltip content="Your name as it will appear to other users" />
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Email Address
                    <Tooltip content="Your login email" />
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profileData.email}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed pr-24"
                      disabled
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailChange(!showEmailChange)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm bg-primary text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Email Change Form */}
          {showEmailChange && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-xl animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Mail className="text-white" size={20} />
                </div>
                <h4 className="text-xl font-bold text-blue-900">Change Email Address</h4>
              </div>
              <div className="flex items-start gap-2 text-sm text-blue-800 mb-6 bg-white/50 p-3 rounded-lg">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p>You will need to sign in with your new email after changing it.</p>
              </div>
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={changingEmail}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={changingEmail}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                  >
                    {changingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Changing...
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Change Email
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailChange(false);
                      setNewEmail('');
                    }}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    disabled={changingEmail}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'subscription') {
      // ✅ Check if subscription will end (auto-renewal OFF or already canceled)
      const subscriptionEnding = !autoRenewal || effectiveUser?.subscriptionStatus === 'canceling';
      
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <CreditCard className="text-white" size={20} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Subscription Details</h3>
          </div>
          
          {!userIsTeamMember && effectiveRole !== 'ORG_ENTERPRISE' && (
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 border-2 border-purple-200 mb-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <TrendingUp className="text-purple-600" size={24} />
                    Want More Features?
                  </h3>
                  <p className="text-gray-600">
                    Upgrade your plan to unlock more storage, users, and features with prorated billing!
                  </p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all whitespace-nowrap"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}

          {/* ✅ WARNING: Subscription Ending */}
          {subscriptionEnding && effectiveUser?.currentPeriodEnd && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-2xl p-6 mb-6 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-bold text-yellow-900 mb-2">Subscription Ending</h4>
                  <p className="text-yellow-800 mb-3">
                    Your subscription will end on <strong>{new Date(effectiveUser.currentPeriodEnd).toLocaleDateString()}</strong>. 
                    You will lose access to all features after this date.
                  </p>
                  <button
                    onClick={handleToggleAutoRenewal}
                    disabled={togglingRenewal}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-all flex items-center gap-2"
                  >
                    <ToggleRight size={18} />
                    {togglingRenewal ? 'Processing...' : 'Reactivate Subscription'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
                <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                  Current Plan
                  <Tooltip content="Your active subscription tier" iconSize={14} />
                </p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {getPlanName(effectiveRole)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <span className={`px-4 py-2 ${subscriptionEnding ? 'bg-yellow-500' : 'bg-green-500'} text-white rounded-full font-semibold inline-flex items-center gap-2 shadow-lg`}>
                  <Check size={18} />
                  {subscriptionEnding ? 'Ending Soon' : 'Active'}
                </span>
              </div>
            </div>

            {/* ✅ AUTO-RENEWAL TOGGLE */}
            {!userIsTeamMember && effectiveRole !== 'INDIVIDUAL' && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                      Auto-Renewal
                      <Tooltip content="Automatically renew your subscription at the end of each billing period" />
                    </h4>
                    <p className="text-sm text-gray-600">
                      {autoRenewal 
                        ? 'Your subscription will automatically renew' 
                        : 'Your subscription will end on ' + (effectiveUser?.currentPeriodEnd ? new Date(effectiveUser.currentPeriodEnd).toLocaleDateString() : 'period end')
                      }
                    </p>
                  </div>
                  <button
                    onClick={handleToggleAutoRenewal}
                    disabled={togglingRenewal}
                    className={`
                      relative w-16 h-8 rounded-full transition-all duration-300 flex items-center
                      ${autoRenewal ? 'bg-green-500' : 'bg-gray-300'}
                      ${togglingRenewal ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}
                    `}
                  >
                    <div className={`
                      absolute w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300
                      ${autoRenewal ? 'right-1' : 'left-1'}
                    `}>
                      {togglingRenewal && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {autoRenewal ? (
                      <ToggleRight className="absolute right-1 text-white" size={16} />
                    ) : (
                      <ToggleLeft className="absolute left-1 text-gray-500" size={16} />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="border-t-2 border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                Storage Usage
                <Tooltip content="How much of your plan's storage you're currently using" iconSize={14} />
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {formatStorage(Number(effectiveUser?.storageUsed || 0))} / {formatStorage(Number(effectiveUser?.storageLimit || 2147483648))}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {effectiveUser?.storageLimit ? Math.round((Number(effectiveUser.storageUsed) / Number(effectiveUser.storageLimit)) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-4 rounded-full transition-all duration-500 shadow-lg"
                      style={{
                        width: effectiveUser?.storageLimit
                          ? Math.min((Number(effectiveUser.storageUsed) / Number(effectiveUser.storageLimit)) * 100, 100) + '%'
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <h4 className="font-bold text-gray-800 mb-4 text-lg">Plan Features</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700 bg-gray-50 p-3 rounded-xl">
                  <Check className="text-green-500 flex-shrink-0" size={20} />
                  <span className="font-medium">Unlimited QR Codes</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700 bg-gray-50 p-3 rounded-xl">
                  <Check className="text-green-500 flex-shrink-0" size={20} />
                  <span className="font-medium">{formatStorage(Number(effectiveUser?.storageLimit || 2147483648))} Storage</span>
                  <Tooltip 
                    content="Total storage space available in your plan" 
                    iconSize={12}
                  />
                </li>
                <li className="flex items-center gap-3 text-gray-700 bg-gray-50 p-3 rounded-xl">
                  <Check className="text-green-500 flex-shrink-0" size={20} />
                  <span className="font-medium">Analytics & Tracking</span>
                </li>
                {(effectiveRole === 'ORG_SMALL' || effectiveRole === 'ORG_MEDIUM' || effectiveRole === 'ORG_ENTERPRISE') && (
                  <li className="flex items-center gap-3 text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <Check className="text-green-500 flex-shrink-0" size={20} />
                    <span className="font-medium">Team Collaboration</span>
                  </li>
                )}
              </ul>
            </div>

            {/* ✅ CANCEL SUBSCRIPTION BUTTON */}
            {!userIsTeamMember && (
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelingSubscription}
                  className="w-full px-6 py-3 border-2 border-red-500 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center gap-2 justify-center disabled:opacity-50"
                >
                  {cancelingSubscription ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      Canceling...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Cancel Subscription
                    </>
                  )}
                </button>
                
                {/* ✅ READ REFUND POLICY BUTTON */}
                <button
                  onClick={() => setShowRefundPolicy(true)}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 text-purple-700 rounded-xl font-medium hover:from-purple-100 hover:to-violet-100 transition-all flex items-center gap-2 justify-center"
                >
                  <BookOpen size={16} />
                  Read Refund Policy
                </button>
              </div>
            )}

            {userIsTeamMember && (
              <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <UserCheck size={20} />
                  Team Member Account
                </h4>
                <p className="text-blue-800 text-sm mb-2">
                  You are viewing <strong>{user.organization.name}</strong> organization account.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Your Role</p>
                    <p className="text-blue-900 font-semibold">{user.teamRole}</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Organization Contact</p>
                    <p className="text-blue-900 font-semibold">{user.organization.email}</p>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-4 bg-white/50 p-3 rounded-lg">
                  Contact your organization administrator to modify subscription settings or access additional features.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'feedback') {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageSquare size={48} className="text-green-600" />
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
              Feedback Feature
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto text-lg">
              We are working hard to bring you an amazing feedback system. This feature will be available soon!
            </p>
            <div className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg shadow-xl">
              Coming Soon
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'live-chat') {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-orange-100 to-red-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessagesSquare size={48} className="text-orange-600" />
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
              Live Chat Support
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto text-lg">
              Real-time chat support is on its way! Soon you will be able to connect with our support team instantly.
            </p>
            <div className="inline-block px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-lg shadow-xl">
              Coming Soon
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'security') {
      return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <Shield className="text-white" size={20} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Security Settings</h3>
          </div>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                Change Password
                <Tooltip content="Update your password to keep your account secure" />
              </h4>
              <p className="text-gray-600 mb-4">Update your password to keep your account secure</p>
              <button 
                onClick={() => setShowPasswordChange(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Change Password
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-2xl border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                Sign Out
                <Tooltip content="Sign out of your account on this device only" />
              </h4>
              <p className="text-gray-600 mb-4">Sign out of your account on this device</p>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-800 hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-2xl border-2 border-red-300">
              <h4 className="font-bold text-red-600 mb-3 flex items-center gap-2 text-lg">
                <Trash2 size={20} />
                Danger Zone
                <Tooltip content="Permanent account deletion - this action cannot be undone!" />
              </h4>
              <div className="flex items-start gap-2 text-gray-700 mb-4 bg-white/50 p-3 rounded-lg">
                <AlertTriangle size={20} className="flex-shrink-0 text-red-600 mt-0.5" />
                <p className="font-medium">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                <Trash2 size={20} />
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
            Settings
          </h1>
          <p className="text-gray-600 text-lg">Manage your account settings and preferences</p>
        </div>

        {/* Accordion Menu Cards */}
        <div className="space-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isOpen = activeTab === item.id;
            
            return (
              <div key={item.id} className="w-full">
                {/* Menu Button */}
                <button
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      setActiveTab(isOpen ? null : item.id);
                    }
                  }}
                  className={`
                    w-full group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left
                    ${isOpen 
                      ? `bg-gradient-to-br ${item.color} border-transparent shadow-xl` 
                      : `${item.bgColor} border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-[1.02]`
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`
                        w-14 h-14 rounded-xl flex items-center justify-center transition-all
                        ${isOpen 
                          ? 'bg-white/20 backdrop-blur-sm' 
                          : `bg-white ${item.iconColor} group-hover:scale-110`
                        }
                      `}>
                        <Icon 
                          size={28} 
                          className={isOpen ? 'text-white' : ''} 
                        />
                      </div>

                      <div>
                        {/* Label */}
                        <h3 className={`
                          font-bold text-xl mb-1 transition-colors
                          ${isOpen ? 'text-white' : 'text-gray-800'}
                        `}>
                          {item.label}
                        </h3>

                        {/* Description */}
                        <p className={`
                          text-sm transition-colors
                          ${isOpen ? 'text-white/90' : 'text-gray-500'}
                        `}>
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className={`
                      transition-transform duration-300
                      ${isOpen ? 'rotate-180' : 'rotate-0'}
                    `}>
                      <svg 
                        className={`w-6 h-6 ${isOpen ? 'text-white' : 'text-gray-400'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Active Indicator Dot */}
                  {isOpen && (
                    <div className="absolute top-4 right-16">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>

                {/* Dropdown Content */}
                {isOpen && (
                  <div className="mt-3 animate-slideDown">
                    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
                      {/* Close Button Header */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                            <Icon size={18} className={item.iconColor} />
                          </div>
                          <h4 className="text-lg font-bold text-gray-800">{item.label} Settings</h4>
                        </div>
                        <button
                          onClick={() => setActiveTab(null)}
                          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all group"
                        >
                          <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Close</span>
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {renderContent()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>

      <UpgradePlanModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={effectiveRole}
        onUpgradeSuccess={(updatedUser) => {
          setUser(updatedUser);
          showToast('Plan upgraded successfully!', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }}
      />

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Shield className="text-white" size={20} />
                </div>
                <h4 className="text-xl font-bold text-purple-900">Change Password</h4>
              </div>
              <div className="flex items-start gap-2 text-sm text-purple-800 mb-6 bg-white/50 p-3 rounded-lg">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p>Your new password must be at least 8 characters long and different from your current password.</p>
              </div>
              
              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm">{passwordError}</p>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    disabled={changingPassword}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password (min 8 characters)"
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    disabled={changingPassword}
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    disabled={changingPassword}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    {changingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Changing...
                      </>
                    ) : (
                      <>
                        <Shield size={18} />
                        Change Password
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      setPasswordError('');
                    }}
                    className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    disabled={changingPassword}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✅ REFUND POLICY MODAL - FULLY RESPONSIVE */}
      {showRefundPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Modal Container - Fixed height with flex layout */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 sm:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-white/20 p-2 sm:p-3 rounded-full flex-shrink-0">
                    <BookOpen size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-bold truncate">Refund Policy</h2>
                    <p className="text-purple-100 text-xs sm:text-sm mt-0.5 sm:mt-1">7-Day Money-Back Guarantee</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRefundPolicy(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all flex-shrink-0"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              
              {/* 7-Day Guarantee */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-green-500 text-white p-2 sm:p-3 rounded-full flex-shrink-0">
                    <Check size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-green-900 mb-2">
                      7-Day Money-Back Guarantee
                    </h3>
                    <p className="text-sm sm:text-base text-green-800 leading-relaxed">
                      We're confident you'll love our service! If you're not completely satisfied within the first <strong>7 days</strong> of your subscription, simply cancel and receive a <strong>full refund</strong> of your subscription fee.
                    </p>
                  </div>
                </div>
              </div>

              {/* How to Get a Refund */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-600 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <span className="min-w-0">How to Cancel & Get Your Refund</span>
                </h3>
                <div className="space-y-2 sm:space-y-3 ml-9 sm:ml-10">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-purple-100 text-purple-600 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 min-w-0">Go to <strong>Settings → Subscription</strong></p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-purple-100 text-purple-600 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 min-w-0">Click <strong>"Cancel Subscription"</strong> button</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-purple-100 text-purple-600 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 min-w-0">Confirm your cancellation</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-purple-100 text-purple-600 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 min-w-0">Your refund will be processed automatically within <strong>5-10 business days</strong></p>
                  </div>
                </div>
              </div>

              {/* Refund Eligibility */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-600 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <span className="min-w-0">Refund Eligibility</span>
                </h3>
                <div className="space-y-2 sm:space-y-3 ml-9 sm:ml-10">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Check className="text-green-500 flex-shrink-0 mt-0.5 sm:mt-1" size={18} />
                    <p className="text-sm sm:text-base text-gray-700 min-w-0"><strong>Within 7 days:</strong> Full refund, no questions asked</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="text-sm sm:text-base text-gray-700 min-w-0"><strong>After 7 days:</strong> No refund available (subscription canceled immediately)</p>
                  </div>
                </div>
              </div>

              {/* CRITICAL WARNING: Account Deletion */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-red-500 text-white p-2 sm:p-3 rounded-full flex-shrink-0">
                    <AlertTriangle size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-red-900 mb-2 sm:mb-3">
                      ⚠️ IMPORTANT: Do NOT Delete Your Account Directly!
                    </h3>
                    <div className="space-y-2 sm:space-y-3 text-red-800">
                      <p className="text-sm sm:text-base leading-relaxed">
                        <strong>Never delete your account from Settings → Security → Delete Account</strong> if you want to cancel your subscription and get a refund.
                      </p>
                      <div className="bg-white/60 border-2 border-red-200 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                        <p className="text-sm sm:text-base font-semibold text-red-900">❌ If you delete your account directly:</p>
                        <ul className="space-y-1 ml-4 sm:ml-5 list-disc text-xs sm:text-sm">
                          <li><strong>You will NOT receive any refund</strong></li>
                          <li><strong>All your data will be permanently deleted</strong></li>
                          <li><strong>All uploaded content will be lost forever</strong></li>
                          <li><strong>Your QR codes will stop working</strong></li>
                          <li><strong>This action CANNOT be undone</strong></li>
                        </ul>
                      </div>
                      <div className="bg-green-500/10 border-2 border-green-400 rounded-lg p-3 sm:p-4">
                        <p className="text-sm sm:text-base font-semibold text-green-900 mb-1.5 sm:mb-2">✅ Correct Way to Cancel:</p>
                        <p className="text-xs sm:text-sm text-green-800">Always use the <strong>"Cancel Subscription"</strong> button in the Subscription section above. This ensures you get your refund (if eligible) and your data is handled properly.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Time */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-600 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <span className="min-w-0">Refund Processing Time</span>
                </h3>
                <div className="ml-9 sm:ml-10 space-y-2 sm:space-y-3">
                  <p className="text-sm sm:text-base text-gray-700">
                    Refunds are processed automatically when you cancel within the 7-day window.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <p className="text-blue-900 text-xs sm:text-sm">
                      <strong>Timeline:</strong> Refunds typically appear in your account within <strong>5-10 business days</strong>, depending on your bank or payment provider.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-purple-500 text-white p-2 sm:p-3 rounded-full flex-shrink-0">
                    <Mail size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-purple-900 mb-2">
                      Need Help?
                    </h3>
                    <p className="text-sm sm:text-base text-purple-800 leading-relaxed mb-3">
                      If you have any questions about our refund policy or need assistance with cancellation, our support team is here to help!
                    </p>
                    <a
                      href="mailto:support@outboundimpact.org"
                      className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-purple-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-purple-700 transition-all"
                    >
                      <Mail size={16} className="sm:w-5 sm:h-5" />
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="flex-shrink-0 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 rounded-b-2xl border-t-2 border-gray-200">
              <button
                onClick={() => setShowRefundPolicy(false)}
                className="w-full px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-sm sm:text-base font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg"
              