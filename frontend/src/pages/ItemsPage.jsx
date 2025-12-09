import { useEffect, useState } from 'react';
import { Download, Trash2, ExternalLink, QrCode as QrCodeIcon, Copy, FolderOpen, Nfc, Info } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';
import NFCWriter from '../components/NFCWriter';
import NFCGuide from '../components/NFCGuide';

const ItemsPage = () => {
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // NFC states
  const [showNFCWriter, setShowNFCWriter] = useState(null);
  const [showNFCGuide, setShowNFCGuide] = useState(false);
  const [nfcData, setNfcData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, campaignsRes] = await Promise.all([
        api.get('/items'),
        api.get('/campaigns'),
      ]);
      
      if (itemsRes.data.status === 'success') {
        setItems(itemsRes.data.items);
      }
      
      if (campaignsRes.data.status === 'success') {
        setCampaigns(campaignsRes.data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load NFC data for item
  const loadNFCData = async (itemId) => {
    try {
      const response = await api.get(`/items/${itemId}/nfc`);
      if (response.data.status === 'success') {
        setNfcData(response.data.data);
        setShowNFCWriter(itemId);
      }
    } catch (error) {
      console.error('Failed to load NFC data:', error);
      alert('Failed to load NFC data');
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.delete('/items/' + id);
      setItems(items.filter((item) => item.id !== id));
      alert('Item deleted successfully!');
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  const assignToCampaign = async (itemId, campaignId) => {
    try {
      await api.post('/campaigns/assign', {
        itemId,
        campaignId: campaignId || null,
      });
      
      setItems(items.map(item => 
        item.id === itemId 
          ? { ...item, campaignId } 
          : item
      ));
      
      alert(campaignId ? 'Item assigned to campaign!' : 'Item removed from campaign!');
    } catch (error) {
      console.error('Failed to assign item:', error);
      alert('Failed to assign item');
    }
  };

  const downloadQRCode = (item) => {
    const link = document.createElement('a');
    link.href = item.qrCodeUrl;
    link.download = 'qr-' + item.title + '.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyPublicLink = (url) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header with NFC Guide Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">My Items</h1>
          <p className="text-secondary">Manage your uploaded content, QR codes and NFC tags</p>
        </div>
        
        {/* What is NFC button */}
        <button
          onClick={() => setShowNFCGuide(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all"
        >
          <Info size={20} />
          What is NFC?
        </button>
      </div>

      {/* NFC Guide Modal */}
      {showNFCGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-screen overflow-y-auto">
            <NFCGuide onClose={() => setShowNFCGuide(false)} />
          </div>
        </div>
      )}

      {/* NFC Writer Modal */}
      {showNFCWriter && nfcData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full relative">
            <button
              onClick={() => {
                setShowNFCWriter(null);
                setNfcData(null);
              }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800 z-10"
            >
              ✕
            </button>
            <NFCWriter
              item={items.find(i => i.id === showNFCWriter)}
              nfcUrl={nfcData.nfcUrl}
              onSuccess={() => {
                alert('NFC tag written successfully!');
              }}
              onError={(error) => {
                console.error('NFC write error:', error);
              }}
            />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <QrCodeIcon size={60} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-primary mb-3">No Items Yet</h3>
          <p className="text-secondary mb-6">
            Upload your first item to get started with QR codes and NFC tags!
          </p>
          <button
            onClick={() => (window.location.href = '/dashboard/upload')}
            className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
          >
            Upload Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                {item.qrCodeUrl && (
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                    <img
                      src={item.qrCodeUrl}
                      alt="QR Code"
                      className="w-24 h-24 md:w-32 md:h-32 rounded-xl shadow-md border-2 border-gray-200"
                    />
                  </div>
                )}

                <div className="flex-1 w-full">
                  <div className="mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-secondary mb-3 text-sm md:text-base">{item.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      <span className="bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1 rounded-full font-semibold">
                        {item.type}
                      </span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full">
                        {formatBytes(parseInt(item.fileSize))}
                      </span>
                      
                      {/* Show view breakdown if available */}
                      {(item.viewsQr > 0 || item.viewsNfc > 0) ? (
                        <>
                          <span className="bg-blue-100 px-3 py-1 rounded-full" title="QR Code views">
                            📷 QR: {item.viewsQr || 0}
                          </span>
                          <span className="bg-purple-100 px-3 py-1 rounded-full" title="NFC tap views">
                            📱 NFC: {item.viewsNfc || 0}
                          </span>
                          <span className="bg-gray-100 px-3 py-1 rounded-full" title="Direct link views">
                            🔗 Direct: {item.viewsDirect || 0}
                          </span>
                        </>
                      ) : (
                        <span className="bg-gray-100 px-3 py-1 rounded-full">
                          {item.views || 0} views
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Campaign Assignment */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FolderOpen size={16} />
                      Campaign
                    </label>
                    <select
                      value={item.campaignId || ''}
                      onChange={(e) => assignToCampaign(item.id, e.target.value || null)}
                      className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">No Campaign</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons - NOW WITH NFC! */}
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    <button
                      onClick={() => copyPublicLink(item.publicUrl)}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all text-sm md:text-base"
                    >
                      <Copy size={16} />
                      Copy Link
                    </button>

                    <button
                      onClick={() => window.open(item.publicUrl, '_blank')}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm md:text-base"
                    >
                      <ExternalLink size={16} />
                      View
                    </button>

                    <button
                      onClick={() => downloadQRCode(item)}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm md:text-base"
                    >
                      <Download size={16} />
                      QR Code
                    </button>

                    {/* NFC BUTTON - NEW! */}
                    <button
                      onClick={() => loadNFCData(item.id)}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all text-sm md:text-base"
                    >
                      <Nfc size={16} />
                      Write NFC
                    </button>

                    <button
                      onClick={() => deleteItem(item.id)}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm md:text-base"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ItemsPage;