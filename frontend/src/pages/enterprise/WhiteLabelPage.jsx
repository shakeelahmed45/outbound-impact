import { useState, useEffect } from 'react';
import { Palette, Check, Globe, Mail } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import useAuthStore from '../../store/authStore';

const WhiteLabelPage = () => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Load saved settings from localStorage
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('whiteLabelSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return {
      primaryColor: '#800080',
      secondaryColor: '#EE82EE',
      accentColor: '#9333ea',
      customDomain: '',
      emailFromName: '',
      emailReplyTo: '',
      footerText: 'Powered by Outbound Impact'
    };
  };

  const [settings, setSettings] = useState(loadSettings());

  // Apply theme colors on load and when settings change
  useEffect(() => {
    applyTheme();
  }, [settings.primaryColor, settings.secondaryColor, settings.accentColor]);

  const applyTheme = () => {
    // Apply CSS variables for theme
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('whiteLabelSettings', JSON.stringify(settings));
      
      // Apply theme immediately
      applyTheme();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      alert('White-label settings saved successfully! Colors have been applied throughout the dashboard.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (confirm('Are you sure you want to reset all white-label settings to default?')) {
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
      localStorage.removeItem('whiteLabelSettings');
      
      // Reset CSS variables
      document.documentElement.style.setProperty('--primary-color', '#800080');
      document.documentElement.style.setProperty('--secondary-color', '#EE82EE');
      document.documentElement.style.setProperty('--accent-color', '#9333ea');
      
      alert('Settings reset to default!');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            Reset to Default
          </button>
        </div>

        {/* Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-900 font-semibold mb-1">💡 Logo & Profile Settings</p>
          <p className="text-blue-800 text-sm">Company name, logo, and profile picture can be changed in <button onClick={() => window.location.href = '/dashboard/settings'} className="text-primary font-semibold underline">Settings</button>.</p>
        </div>

        {/* Preview Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-900 font-semibold mb-1">✨ Live Preview Enabled</p>
          <p className="text-green-800 text-sm">Color changes will be visible throughout the dashboard in real-time. Save to make them permanent.</p>
        </div>

        {/* Color Scheme */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Brand Color Scheme</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
                />
                <div>
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm w-28"
                  />
                  <p className="text-xs text-gray-500 mt-1">Main brand color</p>
                </div>
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
                />
                <div>
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm w-28"
                  />
                  <p className="text-xs text-gray-500 mt-1">Accent highlights</p>
                </div>
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
                />
                <div>
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm w-28"
                  />
                  <p className="text-xs text-gray-500 mt-1">Buttons & CTAs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-6 rounded-lg" style={{ backgroundColor: settings.primaryColor }}>
            <h3 className="text-white font-bold text-xl mb-2">Live Color Preview</h3>
            <p className="text-white opacity-90 mb-4">This is how your primary color will look across the platform</p>
            <button 
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ backgroundColor: settings.accentColor, color: 'white' }}
            >
              Sample Button
            </button>
          </div>
        </div>

        {/* Custom Domain */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Custom Domain</h2>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Custom Domain
            </label>
            <input
              type="text"
              value={settings.customDomain}
              onChange={(e) => setSettings({ ...settings, customDomain: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="share.yourcompany.com"
            />
            <p className="text-xs text-gray-500 mt-2">
              Configure your DNS to point to our servers. Contact support for setup instructions.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>DNS Configuration:</strong> Add a CNAME record pointing to <code className="bg-blue-100 px-2 py-1 rounded">proxy.outboundimpact.com</code>
            </p>
          </div>
        </div>

        {/* Email Branding */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Email Branding</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={settings.emailFromName}
                onChange={(e) => setSettings({ ...settings, emailFromName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Your Company Name"
              />
              <p className="text-xs text-gray-500 mt-1">This name will appear in email notifications sent to users</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={settings.emailReplyTo}
                onChange={(e) => setSettings({ ...settings, emailReplyTo: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="support@yourcompany.com"
              />
              <p className="text-xs text-gray-500 mt-1">Users will reply to this email address</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Footer Text
              </label>
              <input
                type="text"
                value={settings.footerText}
                onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Powered by Your Company"
              />
              <p className="text-xs text-gray-500 mt-1">This text appears at the bottom of the dashboard</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <Check size={20} />
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WhiteLabelPage;