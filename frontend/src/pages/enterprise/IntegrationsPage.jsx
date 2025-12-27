import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Check, AlertCircle, Webhook, Link as LinkIcon, X, Loader2, Play, Store, ShoppingCart, Package, Download } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Toast from '../../components/common/Toast';
import PlatformCard from '../../components/PlatformCard';
import api from '../../services/api';

const IntegrationsPage = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [connectionData, setConnectionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: []
  });

  const [connectedIntegrations, setConnectedIntegrations] = useState([]);

  // Platform integrations state
  const [platformConnections, setPlatformConnections] = useState({
    shopify: { connected: false, stats: { products: 0 } },
    woocommerce: { connected: false, stats: { products: 0 } },
    bigcommerce: { connected: false, stats: { products: 0 } }
  });
  const [downloading, setDownloading] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const availableEvents = [
    { id: 'item.created', name: 'Item Created', description: 'Triggered when a new item is uploaded' },
    { id: 'item.viewed', name: 'Item Viewed', description: 'Triggered when someone views an item' },
    { id: 'qr.scanned', name: 'QR Code Scanned', description: 'Triggered when a QR code is scanned' },
    { id: 'campaign.created', name: 'Campaign Created', description: 'Triggered when a campaign is created' },
    { id: 'team.member.added', name: 'Team Member Added', description: 'Triggered when a team member joins' }
  ];

  const integrations = [
    {
      id: 'zapier',
      name: 'Zapier',
      logo: '⚡',
      description: 'Connect with 5,000+ apps',
      status: 'Available',
      color: 'orange',
      fields: [
        { name: 'webhookUrl', label: 'Zapier Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/...' }
      ]
    },
    {
      id: 'slack',
      name: 'Slack',
      logo: '💬',
      description: 'Get notifications in Slack',
      status: 'Available',
      color: 'purple',
      fields: [
        { name: 'webhookUrl', label: 'Slack Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/...' },
        { name: 'channel', label: 'Channel Name', type: 'text', placeholder: '#general' }
      ]
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      logo: '📁',
      description: 'Auto-save media to Drive',
      status: 'Available',
      color: 'blue',
      fields: [
        { name: 'email', label: 'Google Account Email', type: 'email', placeholder: 'you@gmail.com' },
        { name: 'folderId', label: 'Folder ID (Optional)', type: 'text', placeholder: 'Leave empty for root' }
      ]
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      logo: '📦',
      description: 'Sync with Dropbox',
      status: 'Available',
      color: 'blue',
      fields: [
        { name: 'accessToken', label: 'Dropbox Access Token', type: 'password', placeholder: 'Your access token' },
        { name: 'folderPath', label: 'Folder Path', type: 'text', placeholder: '/Outbound Impact' }
      ]
    }
  ];

  useEffect(() => {
    document.title = 'Integrations | Outbound Impact';
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [webhooksRes, integrationsRes] = await Promise.all([
        api.get('/integrations/webhooks'),
        api.get('/integrations/integrations')
      ]);
      
      if (webhooksRes.data.status === 'success') {
        setWebhooks(webhooksRes.data.webhooks);
      }
      
      if (integrationsRes.data.status === 'success') {
        setConnectedIntegrations(integrationsRes.data.integrations);
      }

      // Load platform statuses
      await loadPlatformStatuses();
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Failed to load integrations data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformStatuses = async () => {
    try {
      // Load Shopify
      const shopifyStatus = await api.get('/platforms/shopify/status');
      if (shopifyStatus.data.connected) {
        setPlatformConnections(prev => ({
          ...prev,
          shopify: {
            connected: true,
            storeName: shopifyStatus.data.storeName,
            stats: shopifyStatus.data.stats
          }
        }));
      }

      // Load WooCommerce
      const wooStatus = await api.get('/platforms/woocommerce/status');
      if (wooStatus.data.connected) {
        setPlatformConnections(prev => ({
          ...prev,
          woocommerce: {
            connected: true,
            siteName: wooStatus.data.storeName,
            stats: wooStatus.data.stats
          }
        }));
      }

      // Load BigCommerce
      const bigStatus = await api.get('/platforms/bigcommerce/status');
      if (bigStatus.data.connected) {
        setPlatformConnections(prev => ({
          ...prev,
          bigcommerce: {
            connected: true,
            storeName: bigStatus.data.storeName,
            stats: bigStatus.data.stats
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load platform statuses:', error);
    }
  };

  const downloadAllQRCodes = async () => {
    try {
      setDownloading(true);
      showToast('Preparing QR codes for download...', 'success');
      
      const response = await api.get('/platforms/bulk-download-qr');
      
      if (response.data.status === 'success') {
        const qrCodes = response.data.qrCodes;
        
        for (const qr of qrCodes) {
          const link = document.createElement('a');
          link.href = qr.dataUrl;
          link.download = qr.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        showToast(`Successfully downloaded ${qrCodes.length} QR codes!`, 'success');
      }
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Failed to download QR codes', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const addWebhook = async () => {
    if (!newWebhook.name.trim()) {
      showToast('Please enter a webhook name', 'error');
      return;
    }

    if (!newWebhook.url.trim()) {
      showToast('Please enter a webhook URL', 'error');
      return;
    }

    if (newWebhook.events.length === 0) {
      showToast('Please select at least one event', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/integrations/webhooks', newWebhook);
      
      if (response.data.status === 'success') {
        setWebhooks([response.data.webhook, ...webhooks]);
        setNewWebhook({ name: '', url: '', events: [] });
        setShowAddWebhook(false);
        showToast('Webhook created successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to create webhook:', error);
      showToast(error.response?.data?.message || 'Failed to create webhook', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteWebhook = async (id, name) => {
    if (!confirm(`Are you sure you want to delete webhook "${name}"?`)) {
      return;
    }

    try {
      const response = await api.delete(`/integrations/webhooks/${id}`);
      
      if (response.data.status === 'success') {
        setWebhooks(webhooks.filter(w => w.id !== id));
        showToast('Webhook deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      showToast('Failed to delete webhook', 'error');
    }
  };

  const toggleWebhook = async (id) => {
    try {
      const response = await api.put(`/integrations/webhooks/${id}/toggle`);
      
      if (response.data.status === 'success') {
        setWebhooks(webhooks.map(w => 
          w.id === id ? response.data.webhook : w
        ));
        showToast(`Webhook ${response.data.webhook.active ? 'activated' : 'deactivated'}`, 'success');
      }
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
      showToast('Failed to toggle webhook', 'error');
    }
  };

  const testWebhook = async (id, name) => {
    setTesting(id);
    try {
      const response = await api.post(`/integrations/webhooks/${id}/test`);
      
      if (response.data.status === 'success') {
        showToast(`Test webhook sent to ${name}!`, 'success');
      }
    } catch (error) {
      console.error('Failed to test webhook:', error);
      showToast(error.response?.data?.message || 'Failed to send test webhook', 'error');
    } finally {
      setTesting(null);
    }
  };

  const toggleEvent = (eventId) => {
    setNewWebhook({
      ...newWebhook,
      events: newWebhook.events.includes(eventId)
        ? newWebhook.events.filter(e => e !== eventId)
        : [...newWebhook.events, eventId]
    });
  };

  const startConnection = (integration) => {
    setSelectedIntegration(integration);
    setConnectionData({});
    setShowConnectionModal(true);
  };

  const handleConnectionDataChange = (field, value) => {
    setConnectionData({
      ...connectionData,
      [field]: value
    });
  };

  const connectIntegration = async () => {
    if (!selectedIntegration) return;

    const missingFields = selectedIntegration.fields.filter(field => 
      !connectionData[field.name] || !connectionData[field.name].trim()
    );

    if (missingFields.length > 0) {
      showToast(`Please fill in: ${missingFields.map(f => f.label).join(', ')}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/integrations/integrations', {
        type: selectedIntegration.id,
        name: selectedIntegration.name,
        config: connectionData
      });
      
      if (response.data.status === 'success') {
        setConnectedIntegrations([...connectedIntegrations, response.data.integration]);
        setShowConnectionModal(false);
        setSelectedIntegration(null);
        setConnectionData({});
        showToast(`${selectedIntegration.name} connected successfully!`, 'success');
      }
    } catch (error) {
      console.error('Failed to connect integration:', error);
      showToast(error.response?.data?.message || 'Failed to connect integration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disconnectIntegration = async (id) => {
    const integration = connectedIntegrations.find(i => i.id === id);
    if (!integration) return;

    if (!confirm(`Disconnect ${integration.name}?`)) {
      return;
    }

    try {
      const response = await api.delete(`/integrations/integrations/${id}`);
      
      if (response.data.status === 'success') {
        setConnectedIntegrations(connectedIntegrations.filter(i => i.id !== id));
        showToast(`${integration.name} disconnected successfully!`, 'success');
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      showToast('Failed to disconnect integration', 'error');
    }
  };

  const toggleIntegration = async (id) => {
    try {
      const response = await api.put(`/integrations/integrations/${id}/toggle`);
      
      if (response.data.status === 'success') {
        setConnectedIntegrations(connectedIntegrations.map(i => 
          i.id === id ? response.data.integration : i
        ));
        showToast(`Integration ${response.data.integration.active ? 'activated' : 'deactivated'}`, 'success');
      }
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      showToast('Failed to toggle integration', 'error');
    }
  };

  const isIntegrationConnected = (integrationId) => {
    return connectedIntegrations.some(i => i.type === integrationId);
  };

  const getIntegrationLogo = (type) => {
    const integration = integrations.find(i => i.id === type);
    return integration ? integration.logo : '🔌';
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

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
            <Zap className="text-yellow-600" size={32} />
            Integrations & Webhooks
          </h1>
          <p className="text-secondary">Connect Outbound Impact with your favorite tools and services</p>
        </div>

        {/* ============================================ */}
        {/* E-COMMERCE PLATFORM INTEGRATIONS SECTION */}
        {/* ============================================ */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary mb-2">
              🛍️ E-Commerce Platform Auto-Import
            </h2>
            <p className="text-gray-600">
              Connect your online store and automatically import all products with QR codes. No programming needed!
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-800">
              <strong>✨ How it works:</strong> Enter your store credentials → Click connect → 
              All products automatically imported → QR codes generated for each → Download all at once!
            </p>
          </div>

          {/* Shopify Card */}
          <PlatformCard
            name="Shopify"
            icon={Store}
            color="green"
            platform="shopify"
            connection={platformConnections.shopify}
            onConnect={async (creds) => {
              try {
                const connectResponse = await api.post('/platforms/shopify/connect', creds);
                showToast('Shopify connected! Importing products...', 'success');
                
                const importResponse = await api.post('/platforms/shopify/import');
                showToast(importResponse.data.message, 'success');
                
                await loadPlatformStatuses();
              } catch (error) {
                showToast(error.response?.data?.message || 'Connection failed', 'error');
              }
            }}
            onDisconnect={async () => {
              if (!confirm('Disconnect Shopify store? Your imported products will remain in your account.')) return;
              try {
                await api.delete('/platforms/shopify/disconnect');
                showToast('Shopify disconnected', 'success');
                await loadPlatformStatuses();
              } catch (error) {
                showToast('Failed to disconnect', 'error');
              }
            }}
            onSync={async () => {
              try {
                const response = await api.post('/platforms/shopify/import');
                showToast(response.data.message, 'success');
                await loadPlatformStatuses();
              } catch (error) {
                showToast('Sync failed', 'error');
              }
            }}
          />

          {/* WooCommerce Card */}
          <PlatformCard
            name="WooCommerce"
            icon={ShoppingCart}
            color="purple"
            platform="woocommerce"
            connection={platformConnections.woocommerce}
            onConnect={async (creds) => {
              try {
                const connectResponse = await api.post('/platforms/woocommerce/connect', creds);
                showToast('WooCommerce connected! Importing products...', 'success');
                
                const importResponse = await api.post('/platforms/woocommerce/import');
                showToast(importResponse.data.message, 'success');
                
                await loadPlatformStatuses();
              } catch (error) {
                showToast(error.response?.data?.message || 'Connection failed', 'error');
              }
            }}
            onDisconnect={async () => {
              if (!confirm('Disconnect WooCommerce store? Your imported products will remain in your account.')) return;
              try {
                await api.delete('/platforms/woocommerce/disconnect');
                showToast('WooCommerce disconnected', 'success');
                await loadPlatformStatuses();
              } catch (error) {
                showToast('Failed to disconnect', 'error');
              }
            }}
            onSync={async () => {
              try {
                const response = await api.post('/platforms/woocommerce/import');
                showToast(response.data.message, 'success');
                await loadPlatformStatuses();
              } catch (error) {
                showToast('Sync failed', 'error');
              }
            }}
          />

          {/* BigCommerce Card */}
          <PlatformCard
            name="BigCommerce"
            icon={Package}
            color="blue"
            platform="bigcommerce"
            connection={platformConnections.bigcommerce}
            onConnect={async (creds) => {
              try {
                const connectResponse = await api.post('/platforms/bigcommerce/connect', creds);
                showToast('BigCommerce connected! Importing products...', 'success');
                
                const importResponse = await api.post('/platforms/bigcommerce/import');
                showToast(importResponse.data.message, 'success');
                
                await loadPlatformStatuses();
              } catch (error) {
                showToast(error.response?.data?.message || 'Connection failed', 'error');
              }
            }}
            onDisconnect={async () => {
              if (!confirm('Disconnect BigCommerce store? Your imported products will remain in your account.')) return;
              try {
                await api.delete('/platforms/bigcommerce/disconnect');
                showToast('BigCommerce disconnected', 'success');
                await loadPlatformStatuses();
              } catch (error) {
                showToast('Failed to disconnect', 'error');
              }
            }}
            onSync={async () => {
              try {
                const response = await api.post('/platforms/bigcommerce/import');
                showToast(response.data.message, 'success');
                await loadPlatformStatuses();
              } catch (error) {
                showToast('Sync failed', 'error');
              }
            }}
          />

          {/* Bulk Download Button */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <h3 className="font-bold text-gray-900 mb-2">📥 Bulk QR Code Download</h3>
            <p className="text-sm text-gray-600 mb-3">
              Download all QR codes at once with product names as filenames!
            </p>
            <button
              onClick={downloadAllQRCodes}
              disabled={downloading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={24} />
                  Download ALL QR Codes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Webhooks Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Webhook className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Webhooks</h2>
            </div>
            <button
              onClick={() => setShowAddWebhook(!showAddWebhook)}
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Add Webhook
            </button>
          </div>

          {/* Add Webhook Form */}
          {showAddWebhook && (
            <div className="mb-6 p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Create New Webhook</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Name
                  </label>
                  <input
                    type="text"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    placeholder="e.g., Production Webhook, Analytics Tracker"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    placeholder="https://yourapp.com/webhooks/outbound"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Events to Trigger
                  </label>
                  <div className="space-y-2">
                    {availableEvents.map((event) => (
                      <label key={event.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="mt-1 h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{event.name}</p>
                          <p className="text-sm text-gray-600">{event.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={addWebhook}
                    disabled={saving}
                    className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? 'Creating...' : 'Create Webhook'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddWebhook(false);
                      setNewWebhook({ name: '', url: '', events: [] });
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhooks List */}
          {webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 mb-4">No webhooks configured yet</p>
              <button
                onClick={() => setShowAddWebhook(true)}
                className="text-primary font-semibold hover:underline"
              >
                Add your first webhook
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          webhook.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {webhook.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <code className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">{webhook.url}</code>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {webhook.events.map((event) => (
                          <span key={event} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => testWebhook(webhook.id, webhook.name)}
                        disabled={testing === webhook.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Test webhook"
                      >
                        {testing === webhook.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Play size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => toggleWebhook(webhook.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={webhook.active ? 'Deactivate' : 'Activate'}
                      >
                        {webhook.active ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => deleteWebhook(webhook.id, webhook.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete webhook"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(webhook.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connected Integrations */}
        {connectedIntegrations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Connected Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedIntegrations.map((integration) => (
                <div key={integration.id} className="bg-white border-2 border-green-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getIntegrationLogo(integration.type)}</div>
                      <div>
                        <h3 className="font-bold text-gray-900">{integration.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-600">
                            Connected {new Date(integration.createdAt).toLocaleDateString()}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            integration.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {integration.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleIntegration(integration.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={integration.active ? 'Deactivate' : 'Activate'}
                      >
                        {integration.active ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => disconnectIntegration(integration.id)}
                        className="text-red-600 hover:text-red-700 font-semibold text-sm px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Available Integrations</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integration) => {
              const isConnected = isIntegrationConnected(integration.id);
              
              return (
                <div key={integration.id} className="border border-gray-200 rounded-lg p-5 hover:border-primary transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{integration.logo}</div>
                      <div>
                        <h3 className="font-bold text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      isConnected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isConnected ? 'Connected' : integration.status}
                    </span>
                    {!isConnected && (
                      <button
                        onClick={() => startConnection(integration)}
                        className="text-primary hover:text-secondary font-semibold text-sm flex items-center gap-1"
                      >
                        Connect <LinkIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connection Modal */}
        {showConnectionModal && selectedIntegration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{selectedIntegration.logo}</div>
                  <h2 className="text-xl font-bold text-gray-900">Connect {selectedIntegration.name}</h2>
                </div>
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={saving}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {selectedIntegration.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={connectionData[field.name] || ''}
                      onChange={(e) => handleConnectionDataChange(field.name, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={field.placeholder}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={connectIntegration}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  onClick={() => {
                    setShowConnectionModal(false);
                    setConnectionData({});
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How Webhooks Work:</h3>
          <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
            <li>Webhooks send real-time notifications when events occur</li>
            <li>Configure which events trigger your webhook</li>
            <li>Webhooks include a signature header for verification</li>
            <li>Test webhooks before activating them</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IntegrationsPage;