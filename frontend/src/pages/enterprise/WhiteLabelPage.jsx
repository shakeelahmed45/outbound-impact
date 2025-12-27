/* 
 * ===================================================================
 * COPY EVERYTHING FROM THIS LINE DOWN AND PASTE INTO WhiteLabelPage.jsx
 * ===================================================================
 */

import { useState, useEffect } from 'react';
import { Palette, Check, Globe, Mail, Loader2, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Toast from '../../components/common/Toast';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const WhiteLabelPage = () => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [settings, setSettings] = useState({
    primaryColor: '#800080',
    secondaryColor: '#EE82EE',
    accentColor: '#9333ea',
    customDomain: '',
    emailFromName: '',
    emailReplyTo: '',
    footerText: 'Powered by Outbound Impact'
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    document.title = 'White Label Settings | Outbound Impact';
    loadSettings();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [settings.primaryColor, settings.secondaryColor, settings.accentColor]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/white-label/branding');
      
      if (response.data.status === 'success' && response.data.branding) {
        const loadedSettings = response.data.branding;
        setSettings({
          primaryColor: loadedSettings.primaryColor || '#800080',
          secondaryColor: loadedSettings.secondaryColor || '#EE82EE',
          accentColor: loadedSettings.accentColor || '#9333ea',
          customDomain: loadedSettings.customDomain || '',
          emailFromName: loadedSettings.emailFromName || '',
          emailReplyTo: loadedSettings.emailReplyTo || '',
          footerText: loadedSettings.footerText || 'Powered by Outbound Impact'
        });
        applyTheme(loadedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      if (error.response?.status !== 404) {
        showToast('Failed to load white label settings', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (customSettings = settings) => {
    document.documentElement.style.setProperty('--brand-primary', customSettings.primaryColor);
    document.documentElement.style.setProperty('--brand-secondary', customSettings.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', customSettings.accentColor);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/white-label/branding', settings);
      
      if (response.data.status === 'success') {
        applyTheme();
        
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        showToast('White-label settings saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast(error.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!confirm('Are you sure you want to reset all white-label settings to default?')) {
      return;
    }

    setSaving(true);
    try {
      await api.delete('/white-label/branding');
      
      const defaultSettings = {
        primaryColor: '#800080',
        secondaryColor: '#EE82EE',
        accentColor: '#9333ea',
        customDomain: '',
        emailFromName: '',
        emailReplyTo: '',
        footerText: 'Powered by Outbound Impact'
      };
      
      setSettings(defaultSettings);
      applyTheme(defaultSettings);
      showToast('Settings reset to default!', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showToast('Failed to reset settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      </DashboardLayout>
    );
  }

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
              <Palette className="text-yellow-600" size={32} />
              White-Label Settings
            </h1>
            <p className="text-secondary">Customize colors, domain, and email branding for your platform</p>
          </div>
          <button
            onClick={resetToDefault}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Reset to Default
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Brand Colors</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono uppercase"
                  placeholder="#800080"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Main brand color used throughout the platform</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono uppercase"
                  placeholder="#EE82EE"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for gradients and accents</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono uppercase"
                  placeholder="#9333ea"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Highlight and interactive elements</p>
            </div>
          </div>

          <div className="mt-6 p-6 bg-gradient-to-r rounded-lg" style={{ 
            background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
          }}>
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2">Preview</h3>
              <p className="text-white/90 mb-4">This is how your brand colors will look</p>
              <button 
                className="px-6 py-2 rounded-lg font-semibold"
                style={{ backgroundColor: settings.accentColor }}
              >
                Sample Button
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Custom Domain</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domain Name
            </label>
            <input
              type="text"
              value={settings.customDomain}
              onChange={(e) => setSettings({ ...settings, customDomain: e.target.value })}
              placeholder="e.g., share.yourcompany.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use your own domain for shared links. You'll need to configure DNS settings.
            </p>
          </div>

          {settings.customDomain && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">DNS Configuration:</h4>
              <div className="text-sm text-blue-800 space-y-1 font-mono">
                <p>Type: CNAME</p>
                <p>Name: {settings.customDomain}</p>
                <p>Value: outbound.im</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Email Branding</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={settings.emailFromName}
                onChange={(e) => setSettings({ ...settings, emailFromName: e.target.value })}
                placeholder="e.g., Your Company Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Name that appears in the 'From' field of emails</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={settings.emailReplyTo}
                onChange={(e) => setSettings({ ...settings, emailReplyTo: e.target.value })}
                placeholder="e.g., support@yourcompany.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Email address for recipients to reply to</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Footer Text
              </label>
              <textarea
                value={settings.footerText}
                onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Powered by Your Company"
              />
              <p className="text-xs text-gray-500 mt-1">Text shown at the bottom of notification emails</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div>
            {saved && (
              <div className="flex items-center gap-2 text-green-600">
                <Check size={20} />
                <span className="font-semibold">Settings saved successfully!</span>
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Note:</h3>
          <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
            <li>Brand colors are applied across the entire platform</li>
            <li>Custom domain requires DNS configuration on your domain provider</li>
            <li>Email settings affect all outgoing notifications</li>
            <li>Changes take effect immediately after saving</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WhiteLabelPage;
