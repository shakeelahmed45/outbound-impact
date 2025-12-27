import { useState } from 'react';
import { Loader2, Check, RefreshCw } from 'lucide-react';

const PlatformCard = ({ name, icon: Icon, color, platform, connection, onConnect, onDisconnect, onSync }) => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState({});

  const handleConnect = async () => {
    setLoading(true);
    await onConnect(creds);
    setLoading(false);
    setShowForm(false);
    setCreds({});
  };

  if (connection.connected) {
    return (
      <div className="border border-green-200 rounded-lg p-4 mb-4 bg-green-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="text-green-600" size={24} />
            <span className="font-bold text-gray-900">{name}</span>
            <Check className="text-green-600" size={20} />
          </div>
          <button
            onClick={onDisconnect}
            className="text-sm text-red-600 hover:text-red-700 font-semibold"
          >
            Disconnect
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded p-3 text-center">
            <p className="text-2xl font-bold text-primary">{connection.stats.products}</p>
            <p className="text-xs text-gray-600">Products Imported</p>
          </div>
          <div className="bg-white rounded p-3 text-center">
            <p className="text-2xl font-bold text-green-600">✓</p>
            <p className="text-xs text-gray-600">Auto-Sync Active</p>
          </div>
        </div>
        
        <button
          onClick={onSync}
          disabled={loading}
          className="w-full mt-3 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Sync Now
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={24} style={{ color: `var(--${color})` }} />
          <span className="font-bold text-gray-900">{name}</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          {showForm ? 'Cancel' : 'Connect'}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>✨ No programming needed!</strong> Just enter your credentials and we'll import all products automatically.
          </div>

          {platform === 'shopify' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Shopify Store URL
                </label>
                <input
                  type="text"
                  placeholder="mystore.myshopify.com"
                  onChange={(e) => setCreds({...creds, shopifyStore: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxx"
                  onChange={(e) => setCreds({...creds, accessToken: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
                <a href="https://help.shopify.com/en/manual/apps/app-types/custom-apps" target="_blank" className="text-xs text-primary hover:underline mt-1 inline-block">
                  How to get access token?
                </a>
              </div>
            </>
          )}
          
          {platform === 'woocommerce' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Site URL
                </label>
                <input
                  type="text"
                  placeholder="https://yoursite.com"
                  onChange={(e) => setCreds({...creds, siteUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Consumer Key
                </label>
                <input
                  type="text"
                  placeholder="ck_xxxxxxxxxxxxx"
                  onChange={(e) => setCreds({...creds, consumerKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Consumer Secret
                </label>
                <input
                  type="password"
                  placeholder="cs_xxxxxxxxxxxxx"
                  onChange={(e) => setCreds({...creds, consumerSecret: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
                <a href="https://woocommerce.github.io/woocommerce-rest-api-docs/#rest-api-keys" target="_blank" className="text-xs text-primary hover:underline mt-1 inline-block">
                  How to generate API keys?
                </a>
              </div>
            </>
          )}
          
          {platform === 'bigcommerce' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Store Hash
                </label>
                <input
                  type="text"
                  placeholder="abc123def (from store URL)"
                  onChange={(e) => setCreds({...creds, storeHash: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  placeholder="API access token"
                  onChange={(e) => setCreds({...creds, accessToken: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
                <a href="https://support.bigcommerce.com/s/article/Store-API-Accounts" target="_blank" className="text-xs text-primary hover:underline mt-1 inline-block">
                  How to create API account?
                </a>
              </div>
            </>
          )}
          
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 rounded-lg font-bold disabled:opacity-50 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Connecting & Importing...
              </>
            ) : (
              'Connect & Import Products'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlatformCard;
