import { useState, useEffect } from 'react';
import { Key, Copy, Check, RefreshCw, Code, BookOpen, Terminal, AlertCircle, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Toast from '../../components/common/Toast';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const ApiAccessPage = () => {
  const { user } = useAuthStore();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(null);
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };
  
  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  useEffect(() => {
    document.title = 'API Access | Outbound Impact';
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api-keys');
      
      if (response.data.status === 'success') {
        setApiKeys(response.data.apiKeys);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      showToast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateNewKey = async () => {
    if (!keyName.trim()) {
      showToast('Please enter a name for the API key', 'error');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post('/api-keys/generate', { name: keyName });
      
      if (response.data.status === 'success') {
        setApiKeys([response.data.apiKey, ...apiKeys]);
        setKeyName('');
        setShowNewKeyForm(false);
        showToast('API key generated! Copy it now - you won\'t see it again.', 'success');
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
      showToast(error.response?.data?.message || 'Failed to generate API key', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    showToast('API key copied to clipboard!', 'success');
    setTimeout(() => setCopied(''), 2000);
  };

  const revokeKey = async (keyId, keyName) => {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    setRevoking(keyId);
    try {
      const response = await api.delete(`/api-keys/${keyId}`);
      
      if (response.data.status === 'success') {
        setApiKeys(apiKeys.filter(k => k.id !== keyId));
        showToast('API key revoked successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      showToast(error.response?.data?.message || 'Failed to revoke API key', 'error');
    } finally {
      setRevoking(null);
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
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
            <Key className="text-yellow-600" size={32} />
            API Access
          </h1>
          <p className="text-secondary">Integrate Outbound Impact with your applications using our REST API</p>
        </div>

        {/* Alert */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-yellow-800 font-semibold mb-1">Keep your API keys secure!</p>
            <p className="text-yellow-700 text-sm">Never share your API keys publicly or commit them to version control. Treat them like passwords.</p>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your API Keys</h2>
            <button
              onClick={() => setShowNewKeyForm(!showNewKeyForm)}
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
              disabled={generating}
            >
              + Generate New Key
            </button>
          </div>

          {/* New Key Form */}
          {showNewKeyForm && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Create New API Key</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production API, Development, Mobile App"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={generating}
                  onKeyPress={(e) => e.key === 'Enter' && generateNewKey()}
                />
                <button
                  onClick={generateNewKey}
                  className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowNewKeyForm(false);
                    setKeyName('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  disabled={generating}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* API Keys List */}
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 mb-4">No API keys yet</p>
              <button
                onClick={() => setShowNewKeyForm(true)}
                className="text-primary font-semibold hover:underline"
              >
                Generate your first API key
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                        {key.lastUsed && (
                          <span>Last used: {new Date(key.lastUsed).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => revokeKey(key.id, key.name)}
                      className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center gap-1 disabled:opacity-50"
                      disabled={revoking === key.id}
                    >
                      {revoking === key.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Revoking...
                        </>
                      ) : (
                        'Revoke'
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-700">{key.key}</code>
                    <button
                      onClick={() => copyToClipboard(key.key, key.id)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-all"
                      title="Copy to clipboard"
                    >
                      {copied === key.id ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Documentation */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">API Documentation</h2>
          </div>

          {/* Base URL */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Base URL</h3>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <code className="text-sm font-mono text-gray-700">https://api.outboundimpact.net/v1</code>
            </div>
          </div>

          {/* Authentication */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Authentication</h3>
            <p className="text-sm text-gray-600 mb-3">Include your API key in the request header:</p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">
{`Authorization: Bearer YOUR_API_KEY`}
              </pre>
            </div>
          </div>

          {/* Example Request */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Example: Upload Media</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">
{`POST /api/v1/items
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_KEY

{
  "title": "Product Demo",
  "description": "Demo video",
  "file": <binary>,
  "type": "VIDEO"
}`}
              </pre>
            </div>
          </div>

          {/* Example Response */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Example Response</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">
{`{
  "status": "success",
  "data": {
    "id": "clx123abc",
    "title": "Product Demo",
    "slug": "prod-demo-xyz",
    "qrCode": "https://cdn.outbound.com/qr/...",
    "publicUrl": "https://outbound.im/prod-demo-xyz"
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Code className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Code Examples</h2>
          </div>

          {/* JavaScript Example */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">JavaScript / Node.js</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">
{`const axios = require('axios');

const uploadMedia = async () => {
  const formData = new FormData();
  formData.append('title', 'Product Demo');
  formData.append('file', fileBlob);
  
  const response = await axios.post(
    'https://api.outboundimpact.net/v1/items',
    formData,
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  
  console.log(response.data);
};`}
              </pre>
            </div>
          </div>

          {/* Python Example */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Python</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">
{`import requests

def upload_media():
    url = "https://api.outboundimpact.net/v1/items"
    headers = {
        "Authorization": "Bearer YOUR_API_KEY"
    }
    files = {
        "file": open("video.mp4", "rb")
    }
    data = {
        "title": "Product Demo",
        "type": "VIDEO"
    }
    
    response = requests.post(url, headers=headers, 
                           files=files, data=data)
    print(response.json())`}
              </pre>
            </div>
          </div>

          {/* cURL Example */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">cURL</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono">
{`curl -X POST https://api.outboundimpact.net/v1/items \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "title=Product Demo" \\
  -F "type=VIDEO" \\
  -F "file=@video.mp4"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Rate Limits</h3>
          <p className="text-blue-800 text-sm mb-3">Enterprise Plan: 10,000 requests per hour</p>
          <p className="text-blue-700 text-sm">Need higher limits? Contact your account manager.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApiAccessPage;
