import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, Shield, LogOut, Upload, Trash2, MessageSquare, MessagesSquare, BookOpen } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/common/Toast';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
          <p className="text-secondary">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-wrap gap-4 md:gap-6 mb-8 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={20} className="inline mr-2" />
            <span className="hidden sm:inline">Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-4 px-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'subscription'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard size={20} className="inline mr-2" />
            <span className="hidden sm:inline">Subscription</span>
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`pb-4 px-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={20} className="inline mr-2" />
            <span className="hidden sm:inline">Feedback</span>
          </button>
          <button
            onClick={() => setActiveTab('live-chat')}
            className={`pb-4 px-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'live-chat'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessagesSquare size={20} className="inline mr-2" />
            <span className="hidden sm:inline">Live Chat</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/guide')}
            className="pb-4 px-2 font-semibold text-gray-500 hover:text-primary transition-all whitespace-nowrap group"
          >
            <BookOpen size={20} className="inline mr-2 group-hover:animate-pulse" />
            <span className="hidden sm:inline">User Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-4 px-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield size={20} className="inline mr-2" />
            <span className="hidden sm:inline">Security</span>
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-primary mb-6">Profile Information</h3>
            
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Profile Picture
              </label>
              <div className="flex items-center gap-6">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl border-4 border-gray-200">
                    {user?.name?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-purple-50 transition-all"
                  >
                    <Upload size={18} />
                    {uploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                  </label>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (MAX. 5MB)</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-primary mb-6">Subscription Details</h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Current Plan</p>
                  <p className="text-xl md:text-2xl font-bold text-primary">{getPlanName(user?.role)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Status</p>
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold inline-block">
                    Active
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 mb-2">Storage Usage</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-700">
                        {formatStorage(Number(user?.storageUsed || 0))} / {formatStorage(Number(user?.storageLimit || 2147483648))}
                      </span>
                      <span className="text-xs md:text-sm font-medium text-primary">
                        {user?.storageLimit ? Math.round((Number(user.storageUsed) / Number(user.storageLimit)) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all"
                        style={{
                          width: user?.storageLimit
                            ? Math.min((Number(user.storageUsed) / Number(user.storageLimit)) * 100, 100) + '%'
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-800 mb-4">Plan Features</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <span className="text-green-500">✓</span>
                    Unlimited QR Codes
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <span className="text-green-500">✓</span>
                    {formatStorage(Number(user?.storageLimit || 2147483648))} Storage
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <span className="text-green-500">✓</span>
                    Analytics & Tracking
                  </li>
                  {(user?.role === 'ORG_SMALL' || user?.role === 'ORG_MEDIUM' || user?.role === 'ORG_ENTERPRISE') && (
                    <li className="flex items-center gap-2 text-gray-600">
                      <span className="text-green-500">✓</span>
                      Team Collaboration
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => showToast('Upgrade functionality will be added soon!', 'warning')}
                  className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Upgrade Plan
                </button>
                <button
                  onClick={() => showToast('Contact support to cancel your subscription.', 'warning')}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <div className="text-center py-12">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare size={40} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-3">Feedback Feature</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We're working hard to bring you an amazing feedback system. This feature will be available soon!
              </p>
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold">
                Coming Soon
              </div>
            </div>
          </div>
        )}

        {activeTab === 'live-chat' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <div className="text-center py-12">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessagesSquare size={40} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-3">Live Chat Support</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Real-time chat support is on its way! Soon you'll be able to connect with our support team instantly.
              </p>
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold">
                Coming Soon
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-primary mb-6">Security Settings</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Change Password</h4>
                <p className="text-gray-600 mb-4">Update your password to keep your account secure</p>
                <button 
                  onClick={() => showToast('Password change feature coming soon!', 'warning')}
                  className="px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-purple-50"
                >
                  Change Password
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-800 mb-4">Sign Out</h4>
                <p className="text-gray-600 mb-4">Sign out of your account on this device</p>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 flex items-center gap-2"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-red-600 mb-4">Danger Zone</h4>
                <p className="text-gray-600 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
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
    </DashboardLayout>
  );
};

export default SettingsPage;