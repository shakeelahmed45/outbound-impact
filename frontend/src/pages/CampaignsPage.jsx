import { useState, useEffect } from 'react';
import { Plus, Folder, Trash2, Edit2, FileText, Tag, Eye, TrendingUp, Download, Share2, ExternalLink, Wifi, Upload as UploadIcon, X, Image as ImageIcon, Lock, Unlock, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import NFCWriter from '../components/NFCWriter';
import ShareModal from '../components/share/ShareModal';
import EditItemModal from '../components/EditItemModal';
import Tooltip from '../components/common/Tooltip';
import Toast from '../components/common/Toast';
import api from '../services/api';
import useAuthStore, { canEdit, canDelete } from '../store/authStore';

const STREAM_CATEGORIES = [
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
    passwordProtected: false, // ✅ NEW
    password: '', // ✅ NEW
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [nfcCampaign, setNfcCampaign] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSelectedCampaign, setShareSelectedCampaign] = useState(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  // Individual plan: 2-stream limit
  const { user } = useAuthStore();
  const effectiveUser = user?.isTeamMember ? user.organization : user;
  const isIndividual = effectiveUser?.role === 'INDIVIDUAL';
  const INDIVIDUAL_STREAM_LIMIT = 2;
  const individualLimitReached = isIndividual && campaigns.length >= INDIVIDUAL_STREAM_LIMIT;

  useEffect(() => {
    document.title = 'Streams | Outbound Impact';
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
        const analyticsData = {};
        itemsRes.data.items.forEach(item => {
          analyticsData[item.id] = item.views || 0;
        });
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    setUploadingLogo(true);
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });

      const uploadData = {
        title: `Stream Logo - ${Date.now()}`,
        description: 'Stream logo image',
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
        return response.data.item?.mediaUrl || response.data.item?.thumbnailUrl || null;
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

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setFormData({ ...formData, logoUrl: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // ✅ NEW: Validate password if protection is enabled
    if (formData.passwordProtected && !formData.password) {
      showToast('Please enter a password for protected stream', 'error');
      return;
    }

    if (formData.passwordProtected && formData.password.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }
    
    try {
      let logoUrl = formData.logoUrl;
      
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          showToast('Failed to upload logo. Please try again.', 'error');
          return;
        }
      }
      
      const response = await api.post('/campaigns', {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        logoUrl,
        passwordProtected: formData.passwordProtected, // ✅ NEW
        password: formData.passwordProtected ? formData.password : null, // ✅ NEW
      });
      
      if (response.data.status === 'success') {
        setCampaigns([response.data.campaign, ...campaigns]);
        setShowCreateModal(false);
        setFormData({ name: '', description: '', category: '', logoUrl: '', passwordProtected: false, password: '' });
        clearLogo();
        showToast('Stream created successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to create stream:', error);
      showToast('Failed to create stream', 'error');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    // ✅ NEW: Validate password if protection is enabled
    if (formData.passwordProtected && !formData.password && !selectedCampaign.passwordProtected) {
      showToast('Please enter a password for protected stream', 'error');
      return;
    }

    if (formData.passwordProtected && formData.password && formData.password.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }
    
    try {
      let logoUrl = formData.logoUrl;
      
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          showToast('Failed to upload logo. Please try again.', 'error');
          return;
        }
      }
      
      const response = await api.put('/campaigns/' + selectedCampaign.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        logoUrl,
        passwordProtected: formData.passwordProtected, // ✅ NEW
        password: formData.password || null, // ✅ NEW: Only send if changed
      });
      
      if (response.data.status === 'success') {
        setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? response.data.campaign : c));
        setShowEditModal(false);
        setSelectedCampaign(null);
        setFormData({ name: '', description: '', category: '', logoUrl: '', passwordProtected: false, password: '' });
        clearLogo();
        showToast('Stream updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to update stream:', error);
      showToast('Failed to update stream', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this stream? Items will not be deleted.')) return;

    try {
      await api.delete('/campaigns/' + id);
      setCampaigns(campaigns.filter(c => c.id !== id));
      showToast('Stream deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete stream:', error);
      showToast('Failed to delete stream', 'error');
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
    if (!confirm('Remove this item from the stream?')) return;

    try {
      await api.post('/campaigns/assign', {
        itemId,
        campaignId: null,
      });
      
      setItems(items.map(item => 
        item.id === itemId ? { ...item, campaignId: null } : item
      ));
      
      fetchData();
      showToast('Item removed from stream', 'success');
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
      passwordProtected: campaign.passwordProtected || false, // ✅ NEW
      password: '', // ✅ NEW: Don't show existing password
    });
    
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

      let message = 'Stream items updated!';
      if (addedCount > 0 && removedCount > 0) {
        message = `Added ${addedCount} item(s) and removed ${removedCount} item(s)`;
      } else if (addedCount > 0) {
        message = `Added ${addedCount} item(s) to stream`;
      } else if (removedCount > 0) {
        message = `Removed ${removedCount} item(s) from stream`;
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

  const getCampaignQrScans = (campaignId) => {
    const campaignItems = getCampaignItems(campaignId);
    return campaignItems.reduce((total, item) => {
      return total + (item.viewsQr || 0);
    }, 0);
  };

  const getCampaignNfcTaps = (campaignId) => {
    const campaignItems = getCampaignItems(campaignId);
    return campaignItems.reduce((total, item) => {
      return total + (item.viewsNfc || 0);
    }, 0);
  };

  const getCampaignDirectViews = (campaignId) => {
    const campaignItems = getCampaignItems(campaignId);
    return campaignItems.reduce((total, item) => {
      return total + (item.viewsDirect || 0);
    }, 0);
  };

  const downloadCampaignQR = async (campaign) => {
    try {
      // ✅ Always regenerate QR with tracking before download
      const regenRes = await api.post(`/campaigns/${campaign.id}/regenerate-qr`);
      const qrUrl = regenRes.data.qrCodeUrl || campaign.qrCodeUrl;
      
      if (!qrUrl) return;
      
      // Update local state with new QR URL
      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id ? { ...c, qrCodeUrl: qrUrl } : c
      ));

      const response = await fetch(qrUrl);
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
      // Fallback: download existing QR
      if (campaign.qrCodeUrl) window.open(campaign.qrCodeUrl, '_blank');
    }
  };

  const openShareModal = (campaign) => {
    setShareSelectedCampaign(campaign);
    setShowShareModal(true);
  };

  const regenerateQR = async (campaign) => {
    if (!confirm('Regenerate QR code with tracking? This replaces the old QR code image.')) return;
    try {
      const response = await api.post(`/campaigns/${campaign.id}/regenerate-qr`);
      if (response.data.status === 'success') {
        setCampaigns(campaigns.map(c => 
          c.id === campaign.id ? { ...c, qrCodeUrl: response.data.qrCodeUrl } : c
        ));
        showToast('QR code regenerated with tracking!', 'success');
      }
    } catch (error) {
      console.error('Failed to regenerate QR:', error);
      showToast('Failed to regenerate QR code', 'error');
    }
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareSelectedCampaign(null);
  };

  const openPublicCampaign = (campaign) => {
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
            <h1 className="text-3xl font-bold text-primary mb-2">Streams</h1>
            <p className="text-secondary">Organize your content into streams with QR codes</p>
          </div>
          {/* ✅ Create — hidden for VIEWER, limit-checked for Individual */}
          {canEdit() && (
          <button
            onClick={() => {
              if (individualLimitReached) {
                showToast('Stream limit reached on Personal plan. Upgrade to create more!', 'error');
                return;
              }
              setShowCreateModal(true);
            }}
            className={`text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 ${
              individualLimitReached ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gradient-to-r from-primary to-secondary'
            }`}
          >
            <Plus size={20} />
            {individualLimitReached ? 'Upgrade to Add More' : 'Create Stream'}
          </button>
          )}
        </div>

        {/* Individual plan limit info */}
        {isIndividual && (
          <div className="mb-6 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-5 py-3">
            <p className="text-sm text-purple-700">
              <strong>{campaigns.length}/{INDIVIDUAL_STREAM_LIMIT}</strong> streams used on Personal plan
              {individualLimitReached && <span className="ml-2 text-orange-600 font-medium">• Limit reached</span>}
            </p>
            {individualLimitReached && (
              <button onClick={() => window.location.href = '/dashboard/settings'} className="text-sm font-medium text-purple-600 hover:text-purple-700">
                Upgrade →
              </button>
            )}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Folder size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No streams yet. Create your first stream!</p>
            {canEdit() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Stream
            </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const itemsCount = getCampaignItems(campaign.id).length;
              const contentViews = getCampaignTotalViews(campaign.id);
              const streamViews = campaign.views || 0;
              const qrScans = campaign.viewsQr || 0;
              const nfcTaps = campaign.viewsNfc || 0;

              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:border-primary transition-all"
                >
                  {/* ✅ NEW: PASSWORD PROTECTION BADGE */}
                  {campaign.passwordProtected && (
                    <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-full">
                      <Lock size={14} className="text-yellow-700" />
                      <span className="text-xs font-bold text-yellow-800">Password Protected</span>
                      <Tooltip content="This stream requires a password to view" />
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
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

                  {/* ═══════════════════════════════════
                      ANALYTICS STATS GRID - 5 metrics
                     ═══════════════════════════════════ */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-blue-50 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1 text-blue-600 mb-1">
                        <FileText size={13} />
                        <span className="text-xs font-medium">Items</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{itemsCount}</p>
                    </div>
                    <div className="bg-indigo-50 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1 text-indigo-600 mb-1">
                        <Eye size={13} />
                        <span className="text-xs font-medium">Stream Views</span>
                        <Tooltip content="Times the stream page was viewed" iconSize={10} />
                      </div>
                      <p className="text-lg font-bold text-indigo-700">{streamViews.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1 text-green-600 mb-1">
                        <TrendingUp size={13} />
                        <span className="text-xs font-medium">Content Views</span>
                        <Tooltip content="Total views of individual items" iconSize={10} />
                      </div>
                      <p className="text-lg font-bold text-green-700">{contentViews.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-purple-50 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1 text-purple-600 mb-1">
                        <Download size={13} />
                        <span className="text-xs font-medium">QR Scans</span>
                        <Tooltip content="Views from QR code scans" iconSize={10} />
                      </div>
                      <p className="text-lg font-bold text-purple-700">{qrScans.toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1 text-orange-600 mb-1">
                        <Wifi size={13} />
                        <span className="text-xs font-medium">NFC Taps</span>
                        <Tooltip content="Views from NFC tag taps" iconSize={10} />
                      </div>
                      <p className="text-lg font-bold text-orange-700">{nfcTaps.toLocaleString()}</p>
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

                        <button
                          onClick={() => regenerateQR(campaign)}
                          className="flex items-center gap-2 px-3 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition"
                          title="Regenerate QR code with scan tracking"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                      
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Stream URL:</p>
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
                    {/* ✅ Edit — hidden for VIEWER */}
                    {canEdit() && (
                    <button
                      onClick={() => openEditModal(campaign)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    )}
                    {/* ✅ Delete — hidden for VIEWER + EDITOR */}
                    {canDelete() && (
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* ✅ CREATE CAMPAIGN MODAL WITH PASSWORD PROTECTION */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[75vh] flex flex-col overflow-hidden">
              {/* Header - Fixed at Top */}
              <div className="flex-shrink-0 p-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-primary">Create Stream</h2>
              </div>
              
              {/* Form Content - Scrollable */}
              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Stream Logo (Optional)
                    <Tooltip content="Upload a logo to display on your stream page" />
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
                    Stream Name *
                    <Tooltip content="Give your stream a clear, descriptive name that helps you identify it easily" />
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
                    <Tooltip content="Choose a category to organize your streams and make them easier to find" />
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {STREAM_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Description
                    <Tooltip content="Add optional details about this stream to help team members understand its purpose" />
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent h-24 resize-none"
                    placeholder="Optional description..."
                  />
                </div>

                {/* ✅ NEW: PASSWORD PROTECTION SECTION */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Lock size={20} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-yellow-900 mb-1">
                          🔒 Password Protection (Optional)
                        </h4>
                        <p className="text-xs text-gray-600">
                          Require a password to view this stream's content. Perfect for keeping content private to your community.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer mb-4">
                      <input
                        type="checkbox"
                        checked={formData.passwordProtected}
                        onChange={(e) => setFormData({ ...formData, passwordProtected: e.target.checked, password: e.target.checked ? formData.password : '' })}
                        className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-semibold text-gray-800">
                        Enable password protection
                      </span>
                    </label>

                    {formData.passwordProtected && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Stream Password *
                          </label>
                          <input
                            type="text"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="Enter password (min 4 characters)"
                            required={formData.passwordProtected}
                            minLength={4}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Share this password with people you want to give access to
                          </p>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>💡 Tip:</strong> Choose a simple password that's easy to share (like "family2024" or "members"). 
                            You can share it verbally, via email, or announce it to your group.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              {/* End of scrollable form content */}
              </form>
              
              {/* Sticky Footer - Buttons Always Visible */}
              <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-gray-50">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', description: '', category: '', logoUrl: '', passwordProtected: false, password: '' });
                      clearLogo();
                    }}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all text-sm"
                    disabled={uploadingLogo}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={uploadingLogo}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 text-sm"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ EXTREME COMPACT RESPONSIVE EDIT CAMPAIGN MODAL - Works on ALL devices */}
        {showEditModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-1">
            {/* EXTREME COMPACT MODAL - iPhone 4 compatible */}
            <div 
              className="bg-white rounded-lg shadow-2xl w-full flex flex-col" 
              style={{ 
                maxWidth: '340px',
                maxHeight: 'calc(100vh - 8px)',
                height: 'auto'
              }}
            >
              
              {/* ULTRA-MINIMAL HEADER */}
              <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-2 py-1.5 rounded-t-lg">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Folder size={14} />
                    <h2 className="text-xs font-bold truncate">Edit Stream</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCampaign(null);
                      setFormData({ name: '', description: '', category: '', logoUrl: '', passwordProtected: false, password: '' });
                      clearLogo();
                    }}
                    className="text-white/80 hover:text-white p-0.5 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* SCROLLABLE CONTENT - EXTREME COMPACT */}
              <div className="flex-1 overflow-y-auto px-2 py-1.5">
                <form onSubmit={handleEdit} id="edit-campaign-form">
                  <div className="space-y-1.5">
                    
                    {/* Logo - Inline compact */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-0.5">Logo</label>
                      <div className="flex gap-1.5">
                        {logoPreview ? (
                          <div className="relative w-12 h-12 border border-gray-300 rounded flex-shrink-0">
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                            <button
                              type="button"
                              onClick={clearLogo}
                              className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <label className="w-12 h-12 border border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer flex-shrink-0">
                            <ImageIcon size={16} className="text-gray-400" />
                            <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                          </label>
                        )}
                        <span className="text-xs text-gray-500 flex items-center">Optional</span>
                      </div>
                    </div>

                    {/* Name - Compact */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-0.5">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        required
                      />
                    </div>

                    {/* Category - Compact */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-0.5">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select</option>
                        {STREAM_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    {/* Description - Single row */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-0.5">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 resize-none"
                        rows={1}
                      />
                    </div>

                    {/* PASSWORD - ULTRA MINIMAL */}
                    <div className="border-t border-gray-200 pt-1.5">
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-5 h-5 bg-yellow-500 rounded flex items-center justify-center flex-shrink-0">
                            {formData.passwordProtected ? <Lock size={10} className="text-white" /> : <Unlock size={10} className="text-white" />}
                          </div>
                          <span className="text-xs font-bold text-yellow-900">🔒 Password</span>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer mb-1">
                          <input
                            type="checkbox"
                            checked={formData.passwordProtected}
                            onChange={(e) => setFormData({ ...formData, passwordProtected: e.target.checked, password: e.target.checked ? formData.password : '' })}
                            className="w-3 h-3"
                          />
                          <span className="text-xs font-semibold">Enable protection</span>
                        </label>

                        {formData.passwordProtected && (
                          <input
                            type="text"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                            placeholder={selectedCampaign.passwordProtected ? "Leave blank to keep" : "Min 4 chars"}
                            required={formData.passwordProtected && !selectedCampaign.passwordProtected}
                            minLength={formData.password ? 4 : 0}
                          />
                        )}
                      </div>
                    </div>

                  </div>
                </form>
              </div>

              {/* FIXED FOOTER - MINIMAL */}
              <div className="flex-shrink-0 bg-gray-50 px-2 py-1.5 rounded-b-lg border-t border-gray-200">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCampaign(null);
                      setFormData({ name: '', description: '', category: '', logoUrl: '', passwordProtected: false, password: '' });
                      clearLogo();
                    }}
                    className="flex-1 px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-semibold"
                    disabled={uploadingLogo}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="edit-campaign-form"
                    disabled={uploadingLogo}
                    className="flex-1 px-2 py-1.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded text-xs font-semibold disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* VIEW ITEMS MODAL */}
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
                  <p className="text-gray-500 mb-4">No items in this stream yet</p>
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
                        {/* ✅ Edit — hidden for VIEWER */}
                        {canEdit() && (
                        <button
                          onClick={() => handleEditItem(item)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium transition"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        )}
                        {/* ✅ Remove — hidden for VIEWER + EDITOR */}
                        {canDelete() && (
                        <button
                          onClick={() => handleRemoveItemFromCampaign(item.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                        )}
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

        {/* MANAGE ITEMS MODAL */}
        {showAddItemsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-primary mb-2">Manage Stream Items</h2>
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

        {/* ═══════════════════════════════════
            BOTTOM — Upgrade for Individual, Summary for others
           ═══════════════════════════════════ */}
        {isIndividual ? (
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-xl mb-1">Ready to grow?</h3>
                <p className="text-blue-100 text-sm">Upgrade to Small Business for unlimited streams, stream analytics, team messaging, and more!</p>
              </div>
              <button onClick={() => window.location.href = '/dashboard/settings'} className="px-6 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-slate-100 transition-colors flex-shrink-0">Upgrade Now</button>
            </div>
          </div>
        ) : campaigns.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <Folder size={20} className="mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold text-primary">{campaigns.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Streams</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <Download size={20} className="mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-purple-600">
                  {campaigns.reduce((total, c) => {
                    return total + (c.viewsQr || 0);
                  }, 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total QR Scans</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <Eye size={20} className="mx-auto text-indigo-600 mb-2" />
                <p className="text-2xl font-bold text-indigo-600">
                  {campaigns.reduce((total, c) => total + (c.views || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total Stream Views</p>
              </div>
            </div>
          </div>
        )}

        {/* NFC WRITER MODAL */}
        {nfcCampaign && (
          <NFCWriter 
            campaign={nfcCampaign} 
            onClose={closeNFCWriter}
            isOpen={showNFCModal}
          />
        )}

        {/* SHARE MODAL */}
        <ShareModal
          isOpen={showShareModal}
          onClose={closeShareModal}
          campaign={shareSelectedCampaign}
        />

        {/* EDIT ITEM MODAL */}
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
