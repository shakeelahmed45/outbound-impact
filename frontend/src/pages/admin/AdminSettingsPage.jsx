import { useState, useEffect } from 'react';
import { Settings, Users, Bell, Zap, Shield, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import { clearSettingsCache } from '../../hooks/usePlatformSettings';

// ═══════════════════════════════════════════════════════════
// CONTROLLED TOGGLE COMPONENT
// ═══════════════════════════════════════════════════════════
const Toggle = ({ checked, onChange, color = 'purple' }) => {
  const colorMap = {
    purple: 'bg-purple-600',
    blue: 'bg-blue-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
    slate: 'bg-slate-600',
    green: 'bg-green-600'
  };
  const activeColor = colorMap[color] || colorMap.purple;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${checked ? activeColor : 'bg-slate-300'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
};

// ═══════════════════════════════════════════════════════════
// SETTING ROW COMPONENT (responsive)
// ═══════════════════════════════════════════════════════════
const SettingRow = ({ title, desc, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg gap-3">
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════════
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {message}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════════
const AdminSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // which section is saving
  const [toast, setToast] = useState(null);
  const [s, setS] = useState({
    platformName: 'Outbound Impact',
    supportEmail: 'support@outboundimpact.org',
    currency: 'AUD',
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: true,
    defaultUserRole: 'INDIVIDUAL',
    notifyNewCustomer: true,
    notifyRevenueMilestone: true,
    notifySystemAlerts: true,
    notifyWeeklyReports: false,
    webhookUrl: '',
    twoFactorRequired: false,
    loginAttemptLimit: true,
    sessionTimeoutMinutes: 30,
    autoBackups: true
  });

  // ─── Load settings from backend ───
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        if (res.data.status === 'success' && res.data.settings) {
          setS(prev => ({ ...prev, ...res.data.settings }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ─── Helper: update a single field ───
  const update = (key, value) => setS(prev => ({ ...prev, [key]: value }));

  // ─── Save all settings to backend ───
  const saveSection = async (sectionName) => {
    setSaving(sectionName);
    try {
      const res = await api.put('/admin/settings', s);
      if (res.data.status === 'success') {
        setToast({ message: `${sectionName} saved successfully!`, type: 'success' });
        // ✅ Clear frontend settings cache so all pages pick up new currency + exchange rate immediately
        clearSettingsCache();
        // Update local state with server response
        if (res.data.settings) {
          setS(prev => ({ ...prev, ...res.data.settings }));
        }
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setToast({ message: `Failed to save ${sectionName}. Please try again.`, type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  // ─── Download backup (CSV export) ───
  const handleDownloadBackup = async () => {
    try {
      const res = await api.get('/admin/users/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outbound_impact_backup_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: 'Backup downloaded successfully!', type: 'success' });
    } catch (err) {
      console.error('Backup download error:', err);
      setToast({ message: 'Failed to download backup.', type: 'error' });
    }
  };

  // ─── Save button component ───
  const SaveButton = ({ section, color = 'purple' }) => {
    const colorClasses = {
      purple: 'bg-purple-600 hover:bg-purple-700',
      blue: 'bg-blue-600 hover:bg-blue-700',
      yellow: 'bg-yellow-600 hover:bg-yellow-700',
      green: 'bg-green-600 hover:bg-green-700',
      red: 'bg-red-600 hover:bg-red-700',
      slate: 'bg-slate-600 hover:bg-slate-700'
    };
    return (
      <button
        onClick={() => saveSection(section)}
        disabled={saving === section}
        className={`mt-6 px-6 py-3 ${colorClasses[color]} text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2`}
      >
        {saving === section && <Loader2 size={18} className="animate-spin" />}
        {saving === section ? 'Saving...' : `Save ${section}`}
      </button>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        <div className="mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Platform Settings</h2>
          <p className="text-slate-600">Manage system-wide configurations and preferences</p>
        </div>

        {/* ═══ Platform Configuration ═══ */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Settings size={24} className="text-purple-600" /> Platform Configuration
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Platform Name</label>
              <input
                type="text"
                value={s.platformName}
                onChange={(e) => update('platformName', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Support Email</label>
              <input
                type="email"
                value={s.supportEmail}
                onChange={(e) => update('supportEmail', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Default Currency</label>
              <select
                value={s.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
              >
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="PKR">PKR - Pakistani Rupee</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="NZD">NZD - New Zealand Dollar</option>
              </select>
            </div>
            <SettingRow title="Maintenance Mode" desc="Temporarily disable customer access — admins are not affected">
              <Toggle checked={s.maintenanceMode} onChange={(v) => update('maintenanceMode', v)} />
            </SettingRow>
            {s.maintenanceMode && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠️ <strong>Maintenance mode is ON.</strong> All non-admin users are blocked from accessing the platform API. Save to apply changes.
              </div>
            )}
          </div>
          <SaveButton section="Platform Settings" color="purple" />
        </div>

        {/* ═══ User Management ═══ */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users size={24} className="text-blue-600" /> User Management
          </h3>
          <div className="space-y-6">
            <SettingRow title="Allow New Registrations" desc="Users can create new accounts via Stripe checkout">
              <Toggle checked={s.allowRegistrations} onChange={(v) => update('allowRegistrations', v)} color="blue" />
            </SettingRow>
            <SettingRow title="Require Email Verification" desc="New users must verify their email before access">
              <Toggle checked={s.requireEmailVerification} onChange={(v) => update('requireEmailVerification', v)} color="blue" />
            </SettingRow>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Default User Role</label>
              <select
                value={s.defaultUserRole}
                onChange={(e) => update('defaultUserRole', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORG_SMALL">Small Organization</option>
                <option value="ORG_MEDIUM">Medium Organization</option>
                <option value="ORG_ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>
          <SaveButton section="User Settings" color="blue" />
        </div>

        {/* ═══ Notification Settings ═══ */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Bell size={24} className="text-yellow-600" /> Notification Settings
          </h3>
          <div className="space-y-4">
            <SettingRow title="New Customer Alerts" desc="Email when new customers sign up">
              <Toggle checked={s.notifyNewCustomer} onChange={(v) => update('notifyNewCustomer', v)} color="yellow" />
            </SettingRow>
            <SettingRow title="Revenue Milestones" desc="Alert on revenue goals achieved">
              <Toggle checked={s.notifyRevenueMilestone} onChange={(v) => update('notifyRevenueMilestone', v)} color="yellow" />
            </SettingRow>
            <SettingRow title="System Alerts" desc="Critical system notifications">
              <Toggle checked={s.notifySystemAlerts} onChange={(v) => update('notifySystemAlerts', v)} color="yellow" />
            </SettingRow>
            <SettingRow title="Weekly Reports" desc="Automated weekly summary emails">
              <Toggle checked={s.notifyWeeklyReports} onChange={(v) => update('notifyWeeklyReports', v)} color="yellow" />
            </SettingRow>
          </div>
          <SaveButton section="Notification Settings" color="yellow" />
        </div>

        {/* ═══ API & Integrations ═══ */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Zap size={24} className="text-green-600" /> API & Integrations
          </h3>
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900 mb-2">API Key</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value="oi_live_••••••••••••••••••••••••" readOnly className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm" />
                <button
                  onClick={() => { if (confirm('Regenerate API key? This invalidates your current key.')) setToast({ message: 'New API key generated!', type: 'success' }); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 whitespace-nowrap"
                >
                  Regenerate
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-semibold text-slate-900 mb-2">Webhook URL</p>
              <input
                type="url"
                value={s.webhookUrl}
                onChange={(e) => update('webhookUrl', e.target.value)}
                placeholder="https://your-domain.com/webhook"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:outline-none text-sm"
              />
            </div>
          </div>
          <SaveButton section="Integration Settings" color="green" />
        </div>

        {/* ═══ Security Settings ═══ */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield size={24} className="text-red-600" /> Security Settings
          </h3>
          <div className="space-y-4">
            <SettingRow title="Two-Factor Authentication" desc="Require 2FA for admin accounts">
              <Toggle checked={s.twoFactorRequired} onChange={(v) => update('twoFactorRequired', v)} color="red" />
            </SettingRow>
            <SettingRow title="Login Attempt Limits" desc="Lock accounts after failed attempts">
              <Toggle checked={s.loginAttemptLimit} onChange={(v) => update('loginAttemptLimit', v)} color="red" />
            </SettingRow>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Session Timeout (minutes)</label>
              <input
                type="number"
                value={s.sessionTimeoutMinutes}
                onChange={(e) => update('sessionTimeoutMinutes', parseInt(e.target.value) || 30)}
                min="5"
                max="1440"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>
          <SaveButton section="Security Settings" color="red" />
        </div>

        {/* ═══ Backup & Data Management ═══ */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 sm:p-6 mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Download size={24} className="text-slate-600" /> Backup & Data Management
          </h3>
          <div className="space-y-4 mb-6">
            <SettingRow title="Automatic Daily Backups" desc="Managed by Railway PostgreSQL">
              <Toggle checked={s.autoBackups} onChange={(v) => update('autoBackups', v)} color="slate" />
            </SettingRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download Full Backup
              </button>
              <button
                onClick={() => { if (confirm('Restore from backup? This overwrites current data.')) alert('Select a backup file to restore.'); }}
                className="px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Restore from Backup
              </button>
            </div>
          </div>
          <SaveButton section="Backup Settings" color="slate" />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
