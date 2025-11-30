import { useState, useEffect } from 'react';
import { Plus, Folder, Trash2, Edit2, FileText, Tag, Eye, TrendingUp } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
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
        // Fetch analytics for each item
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
      // Get current campaign items
      const currentCampaignItems = items.filter(item => item.campaignId === selectedCampaign.id);
      
      // Items to add (selected but not currently in campaign)
      const itemsToAdd = selectedItems.filter(
        itemId => !currentCampaignItems.find(item => item.id === itemId)
      );
      
      // Items to remove (currently in campaign but not selected)
      const itemsToRemove = currentCampaignItems.filter(
        item => !selectedItems.includes(item.id)
      );

      console.log('Items to add:', itemsToAdd);
      console.log('Items to remove:', itemsToRemove);

      let addedCount = 0;
      let removedCount = 0;

      // Add items to campaign
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

      // Remove items from campaign
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

      // Refresh data
      setLoading(true);
      await fetchData();
      setLoading(false);

      // Close modal and reset
      setShowAddItemsModal(false);
      setSelectedCampaign(null);
      setSelectedItems([]);

      // Show success message
      let message = 'Campaign updated successfully!';
      if (addedCount > 0 && removedCount > 0) {
        message = `Added ${addedCount} and removed ${removedCount} items!`;
      } else if (addedCount > 0) {
        message = `Added ${addedCount} item(s) to campaign!`;
      } else if (removedCount > 0) {
        message = `Removed ${removedCount} item(s) from campaign!`;
      }
      
      alert(message);
    } catch (error) {
      console.error('Failed to update items:', error);
      alert('Failed to update items: ' + error.message);
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
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Campaigns</h1>
            <p className="text-secondary">Organize your QR codes by category and purpose</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            <span>Create Campaign</span>
          </button>
        </div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <Folder size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Campaigns Yet</h3>
            <p className="text-gray-500 mb-6">Create your first campaign to organize your QR codes</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <Plus size={20} />
              <span>Create Campaign</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const campaignItems = getCampaignItems(campaign.id);
              const totalViews = getCampaignTotalViews(campaign.id);
              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Folder size={24} className="text-primary" />
                        <h3 className="text-xl font-bold text-gray-800">{campaign.name}</h3>
                      </div>
                      {campaign.category && (
                        <div className="flex items-center gap-1 mb-2">
                          <Tag size={14} className="text-secondary" />
                          <span className="text-sm font-medium text-secondary">{campaign.category}</span>
                        </div>
                      )}
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                      )}
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-500">
                          <FileText size={16} />
                          <span>{campaignItems.length} items</span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-600">
                          <TrendingUp size={16} />
                          <span className="font-semibold">{totalViews} views</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => openViewItemsModal(campaign)}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      View
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
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-primary mb-6">Create Campaign</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Summer Concert Tickets"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
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
                  <p className="text-sm text-gray-500 mt-1">Organize your QR codes by purpose</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent h-24 resize-none"
                    placeholder="What is this campaign for?"
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

        {/* Edit Campaign Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-primary mb-6">Edit Campaign</h2>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Campaign Name *
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
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
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                        <span className="text-blue-600 font-semibold">
                          {analytics[item.id] || 0} views
                        </span>
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
      </div>
    </DashboardLayout>
  );
};

export default CampaignsPage;