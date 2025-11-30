import { useState } from 'react';
import { Shield, Mail, Check, AlertCircle, Lock, Key, User } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import useAuthStore from '../../store/authStore';

const SecurityPage = () => {
  const { user } = useAuthStore();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [securitySettings, setSecuritySettings] = useState({
    ipWhitelist: '',
    sessionTimeout: '24',
    loginNotifications: true,
    activityAlerts: true
  });

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 1,
      action: 'Login',
      ip: '192.168.1.1',
      location: 'New York, US',
      device: 'Chrome on Windows',
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      action: 'API Key Generated',
      ip: '192.168.1.1',
      location: 'New York, US',
      device: 'Chrome on Windows',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 3,
      action: 'Password Changed',
      ip: '192.168.1.1',
      location: 'New York, US',
      device: 'Chrome on Windows',
      timestamp: new Date(Date.now() - 7200000).toISOString()
    }
  ]);

  const enable2FA = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call to send verification email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowEmailVerification(true);
      alert(`Verification code sent to ${user?.email}\n\nPlease check your email and enter the 6-digit code.`);
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      alert('Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTwoFactorEnabled(true);
      setShowEmailVerification(false);
      setVerificationCode('');
      alert('Two-factor authentication enabled successfully!');
    } catch (error) {
      console.error('Failed to verify code:', error);
      alert('Invalid verification code');
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
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTwoFactorEnabled(false);
      alert('Two-factor authentication disabled');
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      alert('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Security settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
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
                  className="px-6 py-3 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Disable 2FA'}
                </button>
              ) : (
                <button
                  onClick={enable2FA}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending Email...' : 'Enable 2FA'}
                </button>
              )}
            </div>
          )}

          {/* Verification Form */}
          {showEmailVerification && (
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-3">Enter Verification Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                We've sent a 6-digit code to <strong>{user?.email}</strong>
              </p>
              
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={verify2FA}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button
                  onClick={() => {
                    setShowEmailVerification(false);
                    setVerificationCode('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

              <button
                onClick={enable2FA}
                className="mt-3 text-sm text-primary hover:text-secondary font-semibold"
              >
                Didn't receive the code? Resend
              </button>
            </div>
          )}
        </div>

        {/* Additional Security Settings */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
          </div>

          <div className="space-y-6">
            {/* IP Whitelist */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                IP Whitelist (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Restrict access to specific IP addresses. Leave empty to allow all IPs.
              </p>
              <textarea
                value={securitySettings.ipWhitelist}
                onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                rows={3}
                placeholder="192.168.1.1&#10;10.0.0.1&#10;172.16.0.1"
              />
            </div>

            {/* Session Timeout */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session Timeout (hours)
              </label>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours (Recommended)</option>
                <option value="168">7 days</option>
              </select>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Security Notifications
              </label>
              
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.loginNotifications}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, loginNotifications: e.target.checked })}
                  className="w-5 h-5 text-primary"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Login Notifications</div>
                  <div className="text-xs text-gray-600">Receive email when someone logs into your account</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.activityAlerts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, activityAlerts: e.target.checked })}
                  className="w-5 h-5 text-primary"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Unusual Activity Alerts</div>
                  <div className="text-xs text-gray-600">Get notified of suspicious activity</div>
                </div>
              </label>
            </div>

            <button
              onClick={saveSecuritySettings}
              disabled={loading}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Key className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <User className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{log.action}</h3>
                      <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="ml-13 text-sm text-gray-600 space-y-1">
                  <div>IP: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{log.ip}</code></div>
                  <div>Location: {log.location}</div>
                  <div>Device: {log.device}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => alert('Exporting full audit log...')}
            className="mt-6 text-primary hover:text-secondary font-semibold text-sm"
          >
            View Full Audit Log →
          </button>
        </div>

        {/* Account Manager Contact */}
        <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Shield size={20} className="text-yellow-600" />
            Need Help with Security?
          </h3>
          <p className="text-gray-700 text-sm mb-3">
            Your dedicated account manager can help configure advanced security features.
          </p>
          <div className="text-sm text-gray-700">
            <strong>Account Manager:</strong> Sarah Johnson<br />
            <strong>Email:</strong> <a href="mailto:sarah@outboundimpact.com" className="text-primary">sarah@outboundimpact.com</a><br />
            <strong>Phone:</strong> +1 (555) 123-4567
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SecurityPage;