import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, Shield, LogOut, Upload, Trash2, MessageSquare, MessagesSquare, BookOpen, TrendingUp, UserCheck, Mail, Check, AlertTriangle } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Email change states
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

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
    
    console.log('Starting email change process...');
    console.log('New email:', newEmail);
    
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
      console.log('User cancelled email change');
      return;
    }

    setChangingEmail(true);
    console.log('Sending request to /api/user/change-email...');

    try {
      const response = await api.put('/user/change-email', { newEmail });
      
      console.log('Response received:', response.data);
      
      if (response.data.status === 'success') {
        console.log('Email change successful!');
        showToast('Email changed successfully! Signing you out...', 'success');
        setShowEmailChange(false);
        setNewEmail('');
        
        // Sign out after 3 seconds
        setTimeout(() => {
          console.log('Signing out...');
          logout();
          window.location.href = '/signin';
        }, 3000);
      } else {
        console.log('Unexpected response status:', response.data);
        showToast('Failed to change email', 'error');
      }
    } catch (error) {
      console.error('Email change error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Failed to change email';
      showToast(errorMessage, 'error');
    } finally {
      setChangingEmail(false);
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

  // Add Security tab if not a team member
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

        {/* Beautiful Menu Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => item.action ? item.action() : setActiveTab(item.id)}
                className={`
                  group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left
                  ${isActive 
                    ? `bg-gradient-to-br ${item.color} border-transparent shadow-xl scale-105` 
                    : `${item.bgColor} border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-105`
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all
                  ${isActive 
                    ? 'bg-white/20 backdrop-blur-sm' 
                    : `bg-white ${item.iconColor} group-hover:scale-110`
                  }
                `}>
                  <Icon 
                    size={24} 
                    className={isActive ? 'text-white' : ''} 
                  />
                </div>

                {/* Label */}
                <h3 className={`
                  font-bold text-base mb-1 transition-colors
                  ${isActive ? 'text-white' : 'text-gray-800'}
                `}>
                  {item.label}
                </h3>

                {/* Description */}
                <p className={`
                  text-xs transition-colors line-clamp-2
                  ${isActive ? 'text-white/90' : 'text-gray-500'}
                `}>
                  {item.description}
                </p>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Sections */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
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

            {/* Email Change Form - SEPARATE */}
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
        )}

        {activeTab === 'subscription' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 animate-fadeIn">
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
                  <span className="px-4 py-2 bg-green-500 text-white rounded-full font-semibold inline-flex items-center gap-2 shadow-lg">
                    <Check size={18} />
                    Active
                  </span>
                </div>
              </div>

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

              {!userIsTeamMember && (
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={() => showToast('Contact support to cancel your subscription.', 'warning')}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel Subscription
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
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 animate-fadeIn">
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
        )}

        {activeTab === 'live-chat' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 animate-fadeIn">
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
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 animate-fadeIn">
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
                  onClick={() => showToast('Password change feature coming soon!', 'warning')}
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
        )}

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
    </DashboardLayout>
  );
};

export default SettingsPage;