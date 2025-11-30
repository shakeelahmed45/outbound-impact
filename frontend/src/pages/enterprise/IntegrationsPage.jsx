import { useState } from 'react';
import { Zap, Plus, Trash2, Check, AlertCircle, Webhook, Link as LinkIcon, X } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

const IntegrationsPage = () => {
  const [webhooks, setWebhooks] = useState([
    {
      id: 1,
      name: 'Production Webhook',
      url: 'https://api.yourapp.com/webhooks/outbound',
      events: ['item.created', 'item.viewed'],
      active: true
    }
  ]);

  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [connectionStep, setConnectionStep] = useState(1);
  const [connectionData, setConnectionData] = useState({});
  
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: []
  });

  const [connectedIntegrations, setConnectedIntegrations] = useState([]);

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
        { name: 'apiKey', label: 'Zapier Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/...' }
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

  const startConnection = (integration) => {
    setSelectedIntegration(integration);
    setConnectionStep(1);
    setConnectionData({});
    setShowConnectionModal(true);
  };

  const handleConnectionDataChange = (field, value) => {
    setConnectionData({
      ...connectionData,
      [field]: value
    });
  };

  const completeConnection = () => {
    // Simulate connection
    setConnectedIntegrations([
      ...connectedIntegrations,
      {
        id: selectedIntegration.id,
        name: selectedIntegration.name,
        logo: selectedIntegration.logo,
        connectedAt: new Date().toISOString(),
        data: connectionData
      }
    ]);

    setShowConnectionModal(false);
    setSelectedIntegration(null);
    setConnectionData({});
    
    alert(`Successfully connected to ${selectedIntegration.name}!`);
  };

  const disconnectIntegration = (integrationId) => {
    if (confirm('Are you sure you want to disconnect this integration?')) {
      setConnectedIntegrations(connectedIntegrations.filter(i => i.id !== integrationId));
      alert('Integration disconnected successfully');
    }
  };

  const addWebhook = () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      alert('Please fill in all fields and select at least one event');
      return;
    }

    setWebhooks([
      ...webhooks,
      {
        id: Date.now(),
        ...newWebhook,
        active: true
      }
    ]);

    setNewWebhook({ name: '', url: '', events: [] });
    setShowAddWebhook(false);
    alert('Webhook created successfully!');
  };

  const deleteWebhook = (id) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      setWebhooks(webhooks.filter(w => w.id !== id));
    }
  };

  const toggleWebhook = (id) => {
    setWebhooks(webhooks.map(w => 
      w.id === id ? { ...w, active: !w.active } : w
    ));
  };

  const testWebhook = async (webhook) => {
    alert(`Testing webhook: ${webhook.name}\n\nSending test payload to:\n${webhook.url}\n\nCheck your endpoint to verify the test payload was received!`);
  };

  const toggleEvent = (eventId) => {
    if (newWebhook.events.includes(eventId)) {
      setNewWebhook({
        ...newWebhook,
        events: newWebhook.events.filter(e => e !== eventId)
      });
    } else {
      setNewWebhook({
        ...newWebhook,
        events: [...newWebhook.events, eventId]
      });
    }
  };

  const isIntegrationConnected = (integrationId) => {
    return connectedIntegrations.some(i => i.id === integrationId);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
            <Zap className="text-yellow-600" size={32} />
            Integrations
          </h1>
          <p className="text-secondary">Connect Outbound Impact with your favorite tools and services</p>
        </div>

        {/* Connected Integrations */}
        {connectedIntegrations.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Connected Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedIntegrations.map((integration) => (
                <div key={integration.id} className="bg-white border border-green-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{integration.logo}</div>
                      <div>
                        <h3 className="font-bold text-gray-900">{integration.name}</h3>
                        <p className="text-xs text-gray-600">Connected {new Date(integration.connectedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => disconnectIntegration(integration.id)}
                      className="text-red-600 hover:text-red-700 font-semibold text-sm"
                    >
                      Disconnect
                    </button>
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
                        className="text-primary hover:text-secondary font-semibold text-sm"
                      >
                        Connect →
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
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={completeConnection}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Connect
                </button>
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhooks Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Webhook className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Webhooks</h2>
            </div>
            <button
              onClick={() => setShowAddWebhook(!showAddWebhook)}
              className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Webhook
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-blue-900 font-semibold mb-1">What are webhooks?</p>
              <p className="text-blue-800 text-sm">
                Webhooks send real-time HTTP POST requests to your specified URL when events occur in your account. 
                Perfect for integrating with custom applications or automation workflows.
              </p>
            </div>
          </div>

          {/* Add Webhook Form */}
          {showAddWebhook && (
            <div className="mb-6 p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-4">Create New Webhook</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Webhook Name
                  </label>
                  <input
                    type="text"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Production Webhook"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://api.yourapp.com/webhooks/outbound"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Events to Subscribe
                  </label>
                  <div className="space-y-2">
                    {availableEvents.map((event) => (
                      <label key={event.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="mt-1 w-4 h-4 text-primary"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{event.name}</div>
                          <div className="text-xs text-gray-600">{event.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={addWebhook}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90"
                  >
                    Create Webhook
                  </button>
                  <button
                    onClick={() => setShowAddWebhook(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhooks List */}
          <div className="space-y-4">
            {webhooks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Webhook size={48} className="mx-auto mb-3 opacity-50" />
                <p>No webhooks configured yet</p>
                <p className="text-sm">Click "Add Webhook" to create your first webhook</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div key={webhook.id} className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900">{webhook.name}</h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          webhook.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {webhook.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <LinkIcon size={16} />
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{webhook.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {webhook.events.map((event) => (
                          <span key={event} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleWebhook(webhook.id)}
                      className="text-sm text-primary hover:text-secondary font-semibold"
                    >
                      {webhook.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => testWebhook(webhook)}
                      className="text-sm text-gray-600 hover:text-gray-700 font-semibold"
                    >
                      Test Webhook
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Webhook Payload Example */}
          {webhooks.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Example Webhook Payload</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-xs font-mono">
{`{
  "event": "item.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "item_id": "clx123abc",
    "title": "Product Demo",
    "type": "VIDEO",
    "user_id": "user_abc123",
    "public_url": "https://outbound.im/prod-demo"
  }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IntegrationsPage;