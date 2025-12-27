import { useState, useEffect } from 'react';
import { Shield, Mail, Check, AlertCircle, Lock, Key, User, Loader2, Clock } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Toast from '../../components/common/Toast';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const SecurityPage = () => {
  const { user } = useAuthStore();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [securitySettings, setSecuritySettings] = useState({
    ipWhitelist: '',
    sessionTimeout: '24',
    loginNotifications: true,
    activityAlerts: true
  });

  const [auditLogs, setAuditLogs] = useState([]);
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    document.title = 'Security & 2FA | Outbound Impact';
    check2FAStatus();
    loadAuditLogs();
  }, []);

  const check2FAStatus = async () => {
    try {
      const response = await api.get('/security/2fa/status');
      if (response.data.status === 'success') {
        setTwoFactorEnabled(response.data.enabled);
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await api.get('/security/audit-logs?limit=20');
      if (response.data.status === 'success') {
        setAuditLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const enable2FA = async () => {
    setLoading(true);
    try {
      const response = await api.post('/security/2fa/enable');
      
      if (response.data.status === 'success') {
        setShowEmailVerification(true);
        showToast(`Verification code sent to ${user?.email}`, 'success');
      }
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      showToast(error.response?.data?.message || 'Failed to send verification email', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (verificationCode.length !== 6) {
      showToast('Please enter a valid 6-digit code', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/security/2fa/verify', { code: verificationCode });
      
      if (response.data.status === 'success') {
        setTwoFactorEnabled(true);
        setShowEmailVerification(false);
        setVerificationCode('');
        showToast('Two-factor authentication enabled successfully!', 'success');
        loadAuditLogs(); // Refresh logs
      }
    } catch (error) {
      console.error('Failed to verify code:', error);
      showToast(error.response?.data?.message || 'Invalid verification code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/security/2fa/disable');
      
      if (response.data.status === 'success') {
        setTwoFactorEnabled(false);
        showToast('Two-factor authentication disabled', 'success');
        loadAuditLogs(); // Refresh logs
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      showToast(error.response?.data?.message || 'Failed to disable 2FA', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    setLoading(true);
    try {
      const response = await api.put('/security/settings', securitySettings);
      
      if (response.data.status === 'success') {
        showToast('Security settings saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast(error.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ ...toast, show: false })} 
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
            <Shield className="text-yellow-600" size={32} />
            Security & Authentication
          </h1>
          <p className="text-secondary">Protect your account with advanced security features</p>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication (2FA)</h2>
          </div>

          {/* Status */}
          <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ 
            backgroundColor: twoFactorEnabled ? '#f0fdf4' : '#fef3c7',
            borderColor: twoFactorEnabled ? '#86efac' : '#fde047',
            borderWidth: '1px'
          }}>
            {twoFactorEnabled ? (
              <>
                <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-1">2FA is Enabled</p>
                  <p className="text-green-800 text-sm">Your account is protected with email-based two-factor authentication.</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900 mb-1">2FA is Disabled</p>
                  <p className="text-yellow-800 text-sm">Enable two-factor authentication to add an extra layer of security to your account.</p>
                </div>
              </>
            )}
          </div>

          {/* How it works */}
          {!twoFactorEnabled && !showEmailVerification && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                <li>Enable 2FA and verify your email address</li>
                <li>Each time you log in, you'll receive a 6-digit code via email</li>
                <li>Enter the code to complete your login</li>
                <li>Your account will be significantly more secure</li>
              </ol>
            </div>
          )}

          {/* Enable/Disable Buttons */}
          {!showEmailVerification && (
            <div>
              {twoFactorEnabled ? (
                <button
                  onClick={disable2FA}
                  disabled={loading}
                  className="px-6 py-3 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Processing...' : 'Disable 2FA'}
                </button>
              ) : (
                <button
                  onClick={enable2FA}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Sending Email...' : 'Enable 2FA'}
                </button>
              )}
            </div>
          )}

          {/* Email Verification Form */}
          {showEmailVerification && (
            <div className="mt-6 p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Mail size={20} className="text-primary" />
                Enter Verification Code
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                We sent a 6-digit code to <strong>{user?.email}</strong>. Please enter it below.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  disabled={loading}
                />
                <button
                  onClick={verify2FA}
                  disabled={loading || verificationCode.length !== 6}
                  className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  onClick={() => {
                    setShowEmailVerification(false);
                    setVerificationCode('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Didn't receive the code? <button onClick={enable2FA} className="text-primary hover:underline">Resend</button>
              </p>
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
          </div>

          <div className="space-y-6">
            {/* IP Whitelist */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP Whitelist (Optional)
              </label>
              <input
                type="text"
                value={securitySettings.ipWhitelist}
                onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                placeholder="e.g., 192.168.1.1, 10.0.0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of IP addresses that can access your account</p>
            </div>

            {/* Session Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (hours)
              </label>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="168">1 week</option>
              </select>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Login Notifications</p>
                <p className="text-sm text-gray-600">Get notified when someone logs into your account</p>
              </div>
              <button
                onClick={() => setSecuritySettings({ ...securitySettings, loginNotifications: !securitySettings.loginNotifications })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.loginNotifications ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Activity Alerts</p>
                <p className="text-sm text-gray-600">Receive alerts for suspicious account activity</p>
              </div>
              <button
                onClick={() => setSecuritySettings({ ...securitySettings, activityAlerts: !securitySettings.activityAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.activityAlerts ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.activityAlerts ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <button
              onClick={saveSecuritySettings}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No activity logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{log.action}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        {log.ipAddress && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {log.ipAddress}
                          </span>
                        )}
                        {log.location && (
                          <span>{log.location}</span>
                        )}
                        {log.device && (
                          <span>{log.device}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {auditLogs.length >= 20 && (
            <div className="mt-6 text-center">
              <button
                onClick={loadAuditLogs}
                className="text-primary hover:underline font-semibold"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SecurityPage;
