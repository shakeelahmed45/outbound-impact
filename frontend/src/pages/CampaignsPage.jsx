import { useState, useEffect } from 'react';
import { Plus, Folder, Trash2, Edit2, FileText, Tag, Eye, TrendingUp, Download, Share2, ExternalLink, Wifi } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import NFCWriter from '../components/NFCWriter';
import ShareModal from '../components/share/ShareModal';
import EditItemModal from '../components/EditItemModal';
import Tooltip from '../components/common/Tooltip';
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
  });
  
  // NFC State
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [nfcCampaign, setNfcCampaign] = useState(null);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSelectedCampaign, setShareSelectedCampaign] = useState(null);

  // ✅ NEW: Edit Item State
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/campaigns', formData);
      if (response.data.status === 'success') {
        setCampaigns([response.data.campaign, ...campaigns]);
        setShowCreateModal(false);
        setFormData({ name: '', description: '', category: '' });
        alert('Campaign created successfully!');
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/campaigns/' + selectedCampaign.id, formData);
      if (response.data.status === 'success') {
        setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? response.data.campaign : c));
        setShowEditModal(false);
        setSelectedCampaign(null);
        setFormData({ name: '', description: '', category: '' });
        alert('Campaign updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
      alert('Failed to update campaign');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign? Items will not be deleted.')) return;

    try {
      await api.delete('/campaigns/' + id);
      setCampaigns(campaigns.filter(c => c.id !== id));
      alert('Campaign deleted successfully!');
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  // ✅ NEW: Edit Item Handlers
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
      alert('Item removed from campaign');
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert('Failed to remove item');
    }
  };

  const openEditModal = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      category: campaign.category || '',
    });
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
      
      alert(`Successfully added ${addedCount} and removed ${removedCount} items!`);
    } catch (error) {
      console.error('Failed to save items:', error);
      alert('Failed to save items');
    } finally {
      setSavingItems(false);
    }
  };

  const getCampaignItems = (campaignId) => {
    return items.filter(item => item.campaignId === campaignId);
  };

  const getCampaignTotalViews = (campaignId) => {
    const campaignItems = getCampaignItems(campaignId);
    return campaignItems.reduce((sum, item) => sum + (analytics[item.id] || 0), 0);
  };

  const openNFCWriter = (campaign) => {
    setNfcCampaign(campaign);
    setShowNFCModal(true);
  };

  const closeNFCWriter = () => {
    setShowNFCModal(false);
    setNfcCampaign(null);
  };

  const openShareModal = (campaign) => {
    setShareSelectedCampaign(campaign);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareSelectedCampaign(null);
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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Campaigns</h1>
            <p className="text-secondary">Organize and manage your content campaigns</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus size={20} />
            Create Campaign
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Folder size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No campaigns yet</h2>
            <p className="text-gray-500 mb-6">Create your first campaign to organize your content</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="bg-gradient-to-br from-primary to-secondary p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Folder className="text-white" size={32} />
                    <h3 className="text-xl font-bold text-white flex-1 truncate">
                      {campaign.name}
                    </h3>
                  </div>
                  {campaign.category && (
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-white" />
                      <span className="text-sm text-white">{campaign.category}</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {campaign.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>
                  )}

                  <div className="flex items-center gap-4 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-500" />
                      <span className="text-gray-700">
                        {getCampaignItems(campaign.id).length} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-500" />
                      <span className="text-blue-600 font-semibold">
                        {getCampaignTotalViews(campaign.id)} views
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => openViewItemsModal(campaign)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-medium text-sm"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => openAddItemsModal(campaign)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-primary rounded-lg hover:bg-purple-100 transition-all font-medium text-sm"
                    >
                      <Plus size={16} />
                      Items
                    </button>
                    <button
                      onClick={() => openShareModal(campaign)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all font-medium text-sm"
                    >
                      <Share2 size={16} />
                      Share
                    </button>
                    <button
                      onClick={() => openNFCWriter(campaign)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all font-medium text-sm"
                    >
                      <Wifi size={16} />
                      NFC
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(campaign)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-primary mb-6">Create New Campaign</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Campaign Name *
                    <Tooltip content="Give your campaign a clear, descriptive name" />
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
                    <Tooltip content="Choose a category to organize your campaigns" />
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
                      setShowCreateModal(false);
                      setFormData({ name: '', description: '', category: '' });
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT Campaign Modal */}
        {showEditModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-primary mb-6">Edit Campaign</h2>
              <form onSubmit={handleEdit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Campaign Name *
                    <Tooltip content="Give your campaign a clear, descriptive name" />
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
                    <Tooltip content="Choose a category to organize your campaigns" />
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
                      setFormData({ name: '', description: '', category: '' });
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW Campaign Items Modal - ✅ WITH EDIT BUTTONS */}
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
                        <h3 className="font-bold text-gray-800 flex-1">{item.title}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded ml-2">{item.type}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-500">
                          <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span className="text-blue-600 font-semibold">
                            {analytics[item.id] || 0} views
                          </span>
                        </div>
                      </div>

                      {/* ✅ NEW: Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(`/l/${item.slug}`, '_blank')}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-primary hover:bg-purple-50 rounded-lg transition text-sm"
                          title="View"
                        >
                          <Eye size={16} />
                          View
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveItemFromCampaign(item.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                          title="Remove"
                        >
                          <Trash2 size={16} />
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

        {/* NFC Writer Modal */}
        {showNFCModal && nfcCampaign && (
          <NFCWriter campaign={nfcCampaign} onClose={closeNFCWriter} />
        )}

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={closeShareModal}
          campaign={shareSelectedCampaign}
        />

        {/* ✅ NEW: Edit Item Modal */}
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