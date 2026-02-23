import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Upload, Trash2, Mail, AlertTriangle, LogOut, CheckCircle, XCircle } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();

  // ✅ VIEWER + EDITOR cannot delete account or change email
  const canManageAccount = !user?.isTeamMember || user?.teamRole === 'ADMIN';

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Simple inline toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Email change
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/user/profile', profileData);
      if (response.data) {
        setUser({ ...user, ...response.data });
        showToast('Profile updated successfully!');
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
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB.', 'error');
      return;
    }
    setUploadingPhoto(true);
    try {
      // Convert to base64 - backend expects { photoData, fileName }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const response = await api.post('/user/upload-photo', {
            photoData: reader.result,
            fileName: file.name,
          });
          if (response.data?.user?.profilePicture) {
            setUser({ ...user, profilePicture: response.data.user.profilePicture });
            showToast('Profile picture updated!');
          }
        } catch (error) {
          showToast('Failed to upload photo', 'error');
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.onerror = () => {
        showToast('Failed to read file', 'error');
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast('Failed to read file', 'error');
      setUploadingPhoto(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    setChangingEmail(true);
    try {
      await api.put('/user/change-email', { newEmail });
      showToast('Email changed! Please sign in with your new email.');
      setTimeout(() => { logout(); navigate('/signin'); }, 2000);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to change email', 'error');
    } finally {
      setChangingEmail(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e?.preventDefault();
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
      if (response.data) {
        showToast('Password changed successfully!');
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError('Failed to change password');
      }
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'WARNING: This will permanently delete your account and ALL data including uploads, QR codes, and campaigns.\n\nIf you want a refund, cancel your subscription first via Billing & Account.'
    );
    if (!confirmed) return;
    const typed = window.prompt('Type DELETE to permanently delete your account:');
    if (typed !== 'DELETE') {
      showToast('Account deletion cancelled', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.delete('/user/account');
      showToast('Account deleted');
      setTimeout(() => { logout(); navigate('/signin'); }, 1500);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/signin';
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Inline Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 border-2 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-slide-in ${
            toast.type === 'error' ? 'bg-red-50 border-red-200' : toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start gap-3">
              {toast.type === 'error' ? <XCircle size={20} className="text-red-500" /> : <CheckCircle size={20} className="text-green-500" />}
              <p className="flex-1 text-gray-800 font-medium text-sm">{toast.message}</p>
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your personal information and security</p>
        </div>

        {/* ═══════════════════════════════════
            PROFILE INFORMATION
           ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center">
              <User className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Profile Information</h3>
          </div>

          {/* Profile Picture */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">Profile Picture</label>
            <div className="flex items-center gap-6">
              <div className="relative">
                {(user?.profilePicture || user?.photoUrl) ? (
                  <img src={user.profilePicture || user.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-purple-600 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-full gradient-btn flex items-center justify-center shadow-lg">
                    <span className="text-2xl text-white font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer gradient-btn text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-xl transition-all inline-flex items-center gap-2 text-sm">
                  <Upload size={16} /> Upload Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG, or GIF (max 5MB)</p>
              </div>
            </div>
          </div>

          {/* Name & Email Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={profileData.email}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed pr-24 text-sm"
                    disabled
                  />
                  {canManageAccount && (
                  <button
                    type="button"
                    onClick={() => setShowEmailChange(!showEmailChange)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs gradient-btn text-white px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Change
                  </button>
                  )}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="gradient-btn text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 text-sm"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Email Change Expansion */}
        {showEmailChange && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
            <h4 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Mail size={20} /> Change Email Address
            </h4>
            <div className="flex items-start gap-2 text-sm text-blue-800 mb-4 bg-white/50 p-3 rounded-lg">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p>You will need to sign in with your new email after changing it.</p>
            </div>
            <form onSubmit={handleEmailChange} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                disabled={changingEmail}
                required
              />
              <button type="submit" disabled={changingEmail} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 text-sm">
                {changingEmail ? 'Changing...' : 'Change'}
              </button>
              <button type="button" onClick={() => { setShowEmailChange(false); setNewEmail(''); }} className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════
            CHANGE PASSWORD
           ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Change Password</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Update your password to keep your account secure.</p>

          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="px-6 py-3 gradient-btn text-white rounded-xl font-semibold hover:shadow-xl transition-all text-sm"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{passwordError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none text-sm"
                  disabled={changingPassword}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password (min 8 characters)"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none text-sm"
                  disabled={changingPassword}
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none text-sm"
                  disabled={changingPassword}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                  className="px-6 py-3 gradient-btn text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {changingPassword ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Changing...</>
                  ) : (
                    <><Shield size={16} /> Update Password</>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════
            DANGER ZONE
           ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl border-2 border-red-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <Trash2 className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>
          </div>

          <div className="space-y-4">
            {/* Sign Out */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h4 className="font-semibold text-gray-800 mb-2">Sign Out</h4>
              <p className="text-gray-600 text-sm mb-3">Sign out of your account on this device.</p>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all flex items-center gap-2 text-sm"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>

            {/* Delete Account — ✅ Hidden for VIEWER + EDITOR */}
            {canManageAccount && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} /> Delete Account Permanently
              </h4>
              <p className="text-gray-700 text-sm mb-1">
                This will permanently delete your account and all associated data including uploads, QR codes, and campaigns.
              </p>
              <p className="text-red-600 text-xs font-semibold mb-3">
                If you want a refund, cancel your subscription first via Billing & Account. Deleting your account directly forfeits any refund.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                <Trash2 size={16} />
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
