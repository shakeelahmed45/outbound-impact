import { useEffect, useState } from 'react';
import { Download, Trash2, ExternalLink, QrCode as QrCodeIcon, Copy, FolderOpen } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const ItemsPage = () => {
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">My Items</h1>
            <p className="text-secondary">Manage your uploaded content and QR codes</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <QrCodeIcon size={60} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-primary mb-3">No Items Yet</h3>
            <p className="text-secondary mb-6">
              Upload your first item to get started with QR codes and sharing!
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
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                        <span className="px-3 py-1 bg-purple-100 text-primary rounded-full font-medium">
                          {item.type}
                        </span>
                        <span>{formatBytes(Number(item.fileSize))}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex flex-col md:flex-row gap-3 mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Assign to Campaign:</p>
                          <select
                            value={item.campaignId || ''}
                            onChange={(e) => assignToCampaign(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="">No Campaign</option>
                            {campaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">Public Link:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-primary font-mono bg-white px-2 md:px-3 py-2 rounded border border-gray-200 overflow-hidden text-ellipsis whitespace-nowrap">
                              {item.publicUrl}
                            </code>
                            <button
                              onClick={() => copyPublicLink(item.publicUrl)}
                              className="px-2 md:px-3 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0"
                            >
                              <Copy size={14} />
                              <span className="hidden sm:inline">Copy</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                      {item.qrCodeUrl && (
                        <button
                          onClick={() => downloadQRCode(item)}
                          className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm md:text-base"
                        >
                          <Download size={16} className="md:w-[18px] md:h-[18px]" />
                          Download QR
                        </button>
                      )}
                      <button
                        onClick={() => window.open(item.publicUrl, '_blank')}
                        className="flex-1 border-2 border-primary text-primary px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-purple-50 transition-all text-sm md:text-base"
                      >
                        <ExternalLink size={16} className="md:w-[18px] md:h-[18px]" />
                        View Public
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-3 md:px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                      >
                        <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                        <span className="sm:hidden">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ItemsPage;