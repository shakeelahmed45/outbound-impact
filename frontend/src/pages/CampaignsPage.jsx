import { useState, useEffect } from 'react';
import { Plus, Folder, Trash2, Edit2, FileText, Tag, Eye, TrendingUp, Download, Share2, ExternalLink, Wifi, Upload as UploadIcon, X, Image as ImageIcon } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import NFCWriter from '../components/NFCWriter';
import ShareModal from '../components/share/ShareModal';
import EditItemModal from '../components/EditItemModal';
import Tooltip from '../components/common/Tooltip';
import Toast from '../components/common/Toast';
import api from '../services/api';

const CAMPAIGN_CATEGORIES = [
  'Tickets',
  'Restaurant Menus',
  'Products',
  'Events',
  'Marketing',
  'Education',
  'Healthcare',
  'Real Estate',
  'Travel',
  'Entertainment',
  'Business Cards',
  'Other',
];

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [items, setItems] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingItems, setSavingItems] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewItemsModal, setShowViewItemsModal] = useState(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    logoUrl: '',
  });
  
  // ✅ NEW: Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // NFC State
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [nfcCampaign, setNfcCampaign] = useState(null);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSelectedCampaign, setShareSelectedCampaign] = useState(null);

  // Edit Item State
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  useEffect(() => {
    document.title = 'Campaigns | Outbound Impact';
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, itemsRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/items'),
      ]);
      
      if (campaignsRes.data.status === 'success') {
        setCampaigns(campaignsRes.data.campaigns);
      }
      
      if (itemsRes.data.status === 'success') {
        setItems(itemsRes.data.items);
        await fetchAnalyticsForItems(itemsRes.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsForItems = async (itemsList) => {
    try {
      const analyticsData = {};
      for (const item of itemsList) {
        try {
          const response = await api.get(`/analytics/item/${item.id}`);
          if (response.data.status === 'success') {
            analyticsData[item.id] = response.data.analytics.totalViews || 0;
          }
        } catch (error) {
          analyticsData[item.id] = 0;
        }
      }
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  // ✅ NEW: Handle logo file selection
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Logo file size must be less than 5MB');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ NEW: Upload logo to server
  // ✅ FIXED: Upload logo to server (base64 format for your backend)
  const uploadLogo = async () => {
    if (!logoFile) return null;

    setUploadingLogo(true);
    try {
      // Convert file to base64 (your backend expects this format)
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });

      // Prepare data in the format your backend expects
      const uploadData = {
        title: `Campaign Logo - ${Date.now()}`,
        description: 'Campaign logo image',
        type: 'IMAGE',
        fileData: base64Data,
        fileName: logoFile.name,
        fileSize: logoFile.size,
      };

      const response = await api.post('/upload/file', uploadData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.status === 'success') {
        // Your backend returns the mediaUrl in item.thumbnailUrl
        return response.data.item?.thumbnailUrl || response.data.mediaUrl;
      }
      return null;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      showToast('Failed to upload logo: ' + (error.response?.data?.message || error.message), 'error');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };


  // ✅ NEW: Clear logo
  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setFormData({ ...formData, logoUrl: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      let logoUrl = formData.logoUrl;
      
      // Upload logo if selected
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          showToast('Failed to upload logo. Please try again.', 'error');
          return;
        }
      }
      
      const response = await api.post('/campaigns', {
        ...formData,
        logoUrl,
      });
      
      if (response.data.status === 'success') {
        setCampaigns([response.data.campaign, ...campaigns]);
        setShowCreateModal(false);
        setFormData({ name: '', description: '', category: '', logoUrl: '' });
        clearLogo();
        showToast('Campaign created successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      showToast('Failed to create campaign', 'error');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    try {
      let logoUrl = formData.logoUrl;
      
      // Upload new logo if selected
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          showToast('Failed to upload logo. Please try again.', 'error');
          return;
        }
      }
      
      const response = await api.put('/campaigns/' + selectedCampaign.id, {
        ...formData,
        logoUrl,
      });
      
      if (response.data.status === 'success') {
        setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? response.data.campaign : c));
        setShowEditModal(false);
        setSelectedCampaign(null);
        setFormData({ name: '', description: '', category: '', logoUrl: '' });
        clearLogo();
        showToast('Campaign updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
      showToast('Failed to update campaign', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign? Items will not be deleted.')) return;

    try {
      await api.delete('/campaigns/' + id);
      setCampaigns(campaigns.filter(c => c.id !== id));
      showToast('Campaign deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      showToast('Failed to delete campaign', 'error');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowEditItemModal(true);
  };

  const handleEditItemSuccess = (updatedItem) => {
    setItems(items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    fetchData();
  };

  const handleRemoveItemFromCampaign = async (itemId) => {
    if (!confirm('Remove this item from the campaign?')) return;

    try {
      await api.post('/campaigns/assign', {
        itemId,
        campaignId: null,
      });
      
      setItems(items.map(item => 
        item.id === itemId ? { ...item, campaignId: null } : item
      ));
      
      fetchData();
      showToast('Item removed from campaign', 'success');
    } catch (error) {
      console.error('Failed to remove item:', error);
      showToast('Failed to remove item', 'error');
    }
  };

  const openEditModal = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      category: campaign.category || '',
      logoUrl: campaign.logoUrl || '',
    });
    
    // Set logo preview if exists
    if (campaign.logoUrl) {
      setLogoPreview(campaign.logoUrl);
    }
    
    setShowEditModal(true);
  };

  const openViewItemsModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowViewItemsModal(true);
  };

  const openAddItemsModal = (campaign) => {
    setSelectedCampaign(campaign);
    const campaignItems = items.filter(item => item.campaignId === campaign.id);
    setSelectedItems(campaignItems.map(item => item.id));
    setShowAddItemsModal(true);
  };

  const handleToggleItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleSaveItems = async () => {
    if (!selectedCampaign) return;

    setSavingItems(true);

    try {
      const currentCampaignItems = items.filter(item => item.campaignId === selectedCampaign.id);
      
      const itemsToAdd = selectedItems.filter(
        itemId => !currentCampaignItems.find(item => item.id === itemId)
      );
      
      const itemsToRemove = currentCampaignItems.filter(
        item => !selectedItems.includes(item.id)
      );

      let addedCount = 0;
      let removedCount = 0;

      for (const itemId of itemsToAdd) {
        try {
          await api.post('/campaigns/assign', {
            itemId,
            campaignId: selectedCampaign.id,
          });
          addedCount++;
        } catch (error) {
          console.error('Failed to add item:', itemId, error);
        }
      }

      for (const item of itemsToRemove) {
        try {
          await api.post('/campaigns/assign', {
            itemId: item.id,
            campaignId: null,
          });
          removedCount++;
        } catch (error) {
          console.error('Failed to remove item:', item.id, error);
        }
      }

      await fetchData();

      setShowAddItemsModal(false);
      setSelectedCampaign(null);
      setSelectedItems([]);

      let message = 'Campaign items updated!';
      if (addedCount > 0 && removedCount > 0) {
        message = `Added ${addedCount} item(s) and removed ${removedCount} item(s)`;
      } else if (addedCount > 0) {
        message = `Added ${addedCount} item(s) to campaign`;
      } else if (removedCount > 0) {
        message = `Removed ${removedCount} item(s) from campaign`;
      }
      
      showToast(message, 'success');
    } catch (error) {
      console.error('Failed to update items:', error);
      showToast('Failed to update items: ' + error.message, 'error');
    } finally {
      setSavingItems(false);
    }
  };

  const getCampaignItems = (campaignId) => {
    return items.filter(item => item.campaignId === campaignId);
  };

  const getCampaignTotalViews = (campaignId) => {
    const campaignItems = getCampaignItems(campaignId);
    return campaignItems.reduce((total, item) => {
      return total + (analytics[item.id] || 0);
    }, 0);
  };

  const downloadCampaignQR = async (campaign) => {
    if (!campaign.qrCodeUrl) return;
    
    try {
      const response = await fetch(campaign.qrCodeUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${campaign.name}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      window.open(campaign.qrCodeUrl, '_blank');
    }
  };

  const openShareModal = (campaign) => {
    setShareSelectedCampaign(campaign);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareSelectedCampaign(null);
  };

  // ✅ UPDATED: Navigate to campaign with preview mode (not new tab)
  const openPublicCampaign = (campaign) => {
    // Navigate in same window with preview=true parameter
    window.location.href = `/c/${campaign.slug}?preview=true`;
  };

  const openNFCWriter = (campaign) => {
    setNfcCampaign(campaign);
    setShowNFCModal(true);
  };

  const closeNFCWriter = () => {
    setShowNFCModal(false);
    setNfcCampaign(null);
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
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Campaigns</h1>
            <p className="text-secondary">Organize your content into campaigns with QR codes</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Create Campaign
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Folder size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No campaigns yet. Create your first campaign!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const itemsCount = getCampaignItems(campaign.id).length;
              const totalViews = getCampaignTotalViews(campaign.id);

              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:border-primary transition-all"
                >
                  {/* Campaign Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {/* ✅ NEW: Show logo if exists */}
                      {campaign.logoUrl && (
                        <div className="mb-3">
                          <img 
                            src={campaign.logoUrl} 
                            alt={`${campaign.name} logo`}
                            className="h-12 w-auto object-contain"
                          />
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-primary mb-2">{campaign.name}</h3>
                      {campaign.category && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary rounded-full text-sm font-medium">
                          <Tag size={14} />
                          {campaign.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {campaign.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <FileText size={16} />
                        <span className="text-xs font-medium">Items</span>
                        <Tooltip 
                          content="Number of media files in this campaign" 
                          iconSize={14}
                        />
                      </div>
                      <p className="text-xl font-bold text-blue-700">{itemsCount}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <TrendingUp size={16} />
                        <span className="text-xs font-medium">Views</span>
                        <Tooltip 
                          content="Total views across all items in this campaign" 
                          iconSize={14}
                        />
                      </div>
                      <p className="text-xl font-bold text-green-700">{totalViews}</p>
                    </div>
                  </div>

                  {campaign.qrCodeUrl && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">QR Code & NFC</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadCampaignQR(campaign)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                        >
                          <Download size={16} />
                          <span>QR Code</span>
                        </button>
                        
                        <button
                          onClick={() => openNFCWriter(campaign)}
                          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-secondary to-primary text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                        >
                          <Wifi size={16} />
                          <span>NFC</span>
                        </button>
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openShareModal(campaign)}
                          className="flex items-center gap-2 px-3 py-2 border-2 border-primary text-primary rounded-lg text-sm font-medium hover:bg-purple-50 transition"
                        >
                          <Share2 size={16} />
                          <span>Share</span>
                        </button>
                        
                        <button
                          onClick={() => openPublicCampaign(campaign)}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                        >
                          <ExternalLink size={16} />
                          <span>Preview</span>
                        </button>
                      </div>
                      
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Campaign URL:</p>
                        <code className="text-xs text-primary font-mono">
                          {window.location.origin}/c/{campaign.slug}
                        </code>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => openViewItemsModal(campaign)}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      View/Edit
                    </button>
                    <button
                      onClick={() => openAddItemsModal(campaign)}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => openEditModal(campaign)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-primary mb-6">Create Campaign</h2>
              <form onSubmit={handleCreate} className="space-y-6">
                {/* ✅ NEW: Logo Upload Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Campaign Logo (Optional)
                    <Tooltip content="Upload a logo to display on your campaign page" />
                  </label>
                  
                  {logoPreview ? (
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-24 w-auto mx-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition">
                      <ImageIcon className="text-gray-400 mb-2" size={32} />
                      <span className="text-sm text-gray-600 mb-1">Click to upload logo</span>
                      <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Campaign Name *
                    <Tooltip content="Give your campaign a clear, descriptive name that helps you identify it easily" />
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Summer Menu 2024"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Category
                    <Tooltip content="Choose a category to organize your campaigns and make them easier to find" />
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {CAMPAIGN_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Description
                    <Tooltip content="Add optional details about this campaign to help team members understand its purpose" />
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent h-24 resize-none"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', description: '', category: '', logoUrl: '' });
                      clearLogo();
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    disabled={uploadingLogo}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingLogo}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Campaign Modal */}
        {showEditModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-primary mb-6">Edit Campaign</h2>
              <form onSubmit={handleEdit} className="space-y-6">
                {/* ✅ NEW: Logo Upload Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Campaign Logo (Optional)
                    <Tooltip content="Upload a logo to display on your campaign page" />
                  </label>
                  
                  {logoPreview ? (
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-24 w-auto mx-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition">
                      <ImageIcon className="text-gray-400 mb-2" size={32} />
                      <span className="text-sm text-gray-600 mb-1">Click to upload logo</span>
                      <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Campaign Name *
                    <Tooltip content="Give your campaign a clear, descriptive name that helps you identify it easily" />
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Category
                    <Tooltip content="Choose a category to organize your campaigns and make them easier to find" />
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {CAMPAIGN_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Description
                    <Tooltip content="Add optional details about this campaign to help team members understand its purpose" />
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCampaign(null);
                      setFormData({ name: '', description: '', category: '', logoUrl: '' });
                      clearLogo();
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    disabled={uploadingLogo}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingLogo}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW Campaign Items Modal */}
        {showViewItemsModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-primary mb-2">{selectedCampaign.name}</h2>
              <div className="flex items-center gap-4 mb-6">
                {selectedCampaign.category && (
                  <span className="font-semibold text-secondary">{selectedCampaign.category}</span>
                )}
                <span className="text-gray-500">•</span>
                <span className="text-blue-600 font-semibold">
                  {getCampaignTotalViews(selectedCampaign.id)} total views
                </span>
              </div>
              {selectedCampaign.description && (
                <p className="text-gray-600 mb-6">{selectedCampaign.description}</p>
              )}

              {getCampaignItems(selectedCampaign.id).length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">No items in this campaign yet</p>
                  <button
                    onClick={() => {
                      setShowViewItemsModal(false);
                      openAddItemsModal(selectedCampaign);
                    }}
                    className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Add Items
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {getCampaignItems(selectedCampaign.id).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-800">{item.title}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.type}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                        <span className="text-blue-600 font-semibold">
                          {analytics[item.id] || 0} views
                        </span>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => window.open(`/l/${item.slug}`, '_blank')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-primary hover:bg-purple-50 rounded text-xs font-medium transition"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium transition"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveItemFromCampaign(item.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowViewItemsModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewItemsModal(false);
                    openAddItemsModal(selectedCampaign);
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Manage Items
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Items Modal */}
        {showAddItemsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-primary mb-2">Manage Campaign Items</h2>
              <p className="text-gray-600 mb-6">
                Select items to add to <strong>{selectedCampaign?.name}</strong>
                {selectedCampaign?.category && ` (${selectedCampaign.category})`}
              </p>

              {items.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No items available. Create some items first!</p>
              ) : (
                <div className="space-y-2 mb-6">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.type}</p>
                      </div>
                      <div className="text-sm text-blue-600 font-semibold">
                        {analytics[item.id] || 0} views
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddItemsModal(false);
                    setSelectedCampaign(null);
                    setSelectedItems([]);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  disabled={savingItems}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItems}
                  disabled={savingItems}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {savingItems ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving...
                    </span>
                  ) : (
                    `Save Items (${selectedItems.length} selected)`
                  )}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* NFC Writer Modal - Only render when campaign exists */}
        {nfcCampaign && (
          <NFCWriter 
            campaign={nfcCampaign} 
            onClose={closeNFCWriter}
            isOpen={showNFCModal}
          />
        )}

        <ShareModal
          isOpen={showShareModal}
          onClose={closeShareModal}
          campaign={shareSelectedCampaign}
        />

        <EditItemModal
          item={editingItem}
          isOpen={showEditItemModal}
          onClose={() => {
            setShowEditItemModal(false);
            setEditingItem(null);
          }}
          onSuccess={handleEditItemSuccess}
        />
      </div>
    </DashboardLayout>
  );
};

export default CampaignsPage;
