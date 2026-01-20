import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Image, Video, Music, FileText, Link, Trash2, Edit, Eye, BarChart3, 
  Download, Search, Filter, X, Loader2, Share2, Lock, ExternalLink, Paperclip, Save, Folder, Upload
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/common/Toast';
import Tooltip from '../components/common/Tooltip';

const ItemsPage = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  
  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    content: '',
    sharingEnabled: true,
    buttonText: '',
    buttonUrl: '',
  });
  const [saving, setSaving] = useState(false);

  // ✅ RESTORED: Thumbnail upload state
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    document.title = 'My Items | Outbound Impact';
    fetchItems();
    fetchCampaigns();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/items');
      if (response.data.status === 'success') {
        setItems(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      if (response.data.status === 'success') {
        setCampaigns(response.data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    }
  };

  const getCampaignName = (campaignId) => {
    if (!campaignId) return 'No Stream';
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.name : 'Unknown Stream';
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditFormData({
      title: item.title || '',
      description: item.description || '',
      content: item.type === 'TEXT' ? item.mediaUrl : '',
      sharingEnabled: item.sharingEnabled !== undefined ? item.sharingEnabled : true,
      buttonText: item.buttonText || '',
      buttonUrl: item.buttonUrl || '',
    });
    // ✅ RESTORED: Set existing thumbnail preview
    setThumbnailPreview(item.thumbnailUrl || null);
    setThumbnailFile(null);
    setShowEditModal(true);
  };

  // ✅ RESTORED: Handle thumbnail file selection
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setThumbnailFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // ✅ RESTORED: Remove thumbnail
  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  // Quick toggle sharing without opening edit modal
  const handleQuickToggleSharing = async (item) => {
    try {
      const newSharingValue = !item.sharingEnabled;
      
      const response = await api.put(`/items/${item.id}`, {
        sharingEnabled: newSharingValue,
      });

      if (response.data.status === 'success') {
        setItems(items.map(i => 
          i.id === item.id 
            ? { ...i, sharingEnabled: newSharingValue }
            : i
        ));
        
        const statusText = newSharingValue ? 'shareable' : 'private';
        showToast(`Item is now ${statusText}`, 'success');
      }
    } catch (error) {
      console.error('Failed to toggle sharing:', error);
      showToast('Failed to update sharing setting', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData.title) {
      showToast('Title is required', 'error');
      return;
    }

    if (editFormData.buttonText && !editFormData.buttonUrl) {
      showToast('Please enter button URL', 'error');
      return;
    }
    if (editFormData.buttonUrl && !editFormData.buttonText) {
      showToast('Please enter button text', 'error');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        title: editFormData.title,
        description: editFormData.description || null,
        sharingEnabled: editFormData.sharingEnabled,
      };

      // Add content for TEXT items
      if (editingItem.type === 'TEXT') {
        updateData.content = editFormData.content;
        updateData.buttonText = editFormData.buttonText || null;
        updateData.buttonUrl = editFormData.buttonUrl || null;
      }

      // ✅ FIXED: Handle thumbnail upload with correct endpoint
      if (thumbnailFile) {
        setUploadingThumbnail(true);
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const thumbnailResponse = await api.post(`/items/${editingItem.id}/thumbnail`, {
                thumbnailData: e.target.result,
              });

              if (thumbnailResponse.data.status === 'success') {
                updateData.thumbnailUrl = thumbnailResponse.data.thumbnailUrl;
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(thumbnailFile);
        });
        
        setUploadingThumbnail(false);
      }

      const response = await api.put(`/items/${editingItem.id}`, updateData);

      if (response.data.status === 'success') {
        setItems(items.map(item => 
          item.id === editingItem.id 
            ? { ...item, ...response.data.item }
            : item
        ));
        
        showToast('Item updated successfully!', 'success');
        setShowEditModal(false);
        setEditingItem(null);
        setThumbnailFile(null);
        setThumbnailPreview(null);
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      showToast(error.response?.data?.message || 'Failed to update item', 'error');
    } finally {
      setSaving(false);
      setUploadingThumbnail(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/items/${itemId}`);
      
      if (response.data.status === 'success') {
        setItems(items.filter(item => item.id !== itemId));
        showToast('Item deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('Failed to delete item', 'error');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'IMAGE': return <Image size={20} className="text-blue-500" />;
      case 'VIDEO': return <Video size={20} className="text-red-500" />;
      case 'AUDIO': return <Music size={20} className="text-green-500" />;
      case 'TEXT': return <FileText size={20} className="text-orange-500" />;
      case 'EMBED': return <Link size={20} className="text-pink-500" />;
      default: return <FileText size={20} className="text-gray-500" />;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'ALL' || item.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">My Items</h1>
            <p className="text-secondary mt-1">
              Manage all your uploaded content ({items.length} items)
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                <option value="ALL">All Types</option>
                <option value="IMAGE">Images</option>
                <option value="VIDEO">Videos</option>
                <option value="AUDIO">Audio</option>
                <option value="TEXT">Text</option>
                <option value="EMBED">Embeds</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <FileText className="mx-auto mb-4 text-gray-400" size={64} />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No items found</h3>
            <p className="text-gray-500">
              {searchTerm || filterType !== 'ALL' 
                ? 'Try adjusting your search or filters'
                : 'Upload your first item to get started!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Thumbnail */}
                <div className="h-48 bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center relative">
                  {item.thumbnailUrl ? (
                    <img 
                      src={item.thumbnailUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                      {getTypeIcon(item.type)}
                    </div>
                  )}
                  
                  {/* Sharing Status Badge */}
                  <div className="absolute top-3 left-3">
                    {item.sharingEnabled ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-semibold shadow-lg">
                        <Share2 size={14} />
                        <span>Shareable</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-full text-xs font-semibold shadow-lg">
                        <Lock size={14} />
                        <span>Private</span>
                      </div>
                    )}
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-3 right-3">
                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
                      {getTypeIcon(item.type)}
                      <span>{item.type}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 truncate">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Stream Info */}
                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                    <Folder size={16} className="text-primary" />
                    <span className="font-medium truncate">
                      {getCampaignName(item.campaignId)}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      <span>{item.views || 0} views</span>
                    </div>
                  </div>

                  {/* Quick Sharing Toggle */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.sharingEnabled ? (
                          <>
                            <Share2 size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-gray-700">Public sharing enabled</span>
                          </>
                        ) : (
                          <>
                            <Lock size={16} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Private (no sharing)</span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuickToggleSharing(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          item.sharingEnabled
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {item.sharingEnabled ? 'Make Private' : 'Make Shareable'}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/l/${item.slug}`)}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition flex items-center justify-center gap-1"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => handleEditClick(item)}
                      className="flex-1 px-3 py-2 border-2 border-primary text-primary rounded-lg font-semibold text-sm hover:bg-purple-50 transition flex items-center justify-center gap-1"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-2 border-2 border-red-500 text-red-500 rounded-lg font-semibold text-sm hover:bg-red-50 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ✅ FIXED: Edit Modal - Ultra Compact Design */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[75vh] flex flex-col overflow-hidden">
              {/* Header - Fixed at Top */}
              <div className="flex-shrink-0 bg-gradient-to-r from-primary to-secondary p-4 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Edit Item</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Form - Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ✅ COMPACT: Thumbnail Upload Section */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Image size={20} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-blue-600 mb-1">
                           Custom Thumbnail
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Upload a custom thumbnail image. Max 5MB.
                        </p>
                      </div>
                    </div>

                    {/* Current/Preview Thumbnail */}
                    {thumbnailPreview && (
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Current Thumbnail:
                        </label>
                        <div className="relative inline-block">
                          <img 
                            src={thumbnailPreview} 
                            alt="Thumbnail preview"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-blue-300"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveThumbnail}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Upload Button */}
                    <div>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm">
                        <Upload size={16} />
                        <span>{thumbnailPreview ? 'Change' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, WebP (Max 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="Enter title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                    placeholder="Add a description"
                  />
                </div>

                {/* Content (for TEXT items only) */}
                {editingItem.type === 'TEXT' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Content
                      </label>
                      <textarea
                        value={editFormData.content}
                        onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                        placeholder="Write your content here..."
                      />
                    </div>

                    {/* Button fields for TEXT */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-base font-bold text-gray-900 mb-3">Custom Button</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Button Text
                          </label>
                          <input
                            type="text"
                            value={editFormData.buttonText}
                            onChange={(e) => setEditFormData({ ...editFormData, buttonText: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            placeholder="e.g., Visit Website"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Button URL
                          </label>
                          <input
                            type="url"
                            value={editFormData.buttonUrl}
                            onChange={(e) => setEditFormData({ ...editFormData, buttonUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Sharing Control */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                          {editFormData.sharingEnabled ? (
                            <Share2 size={20} className="text-white" />
                          ) : (
                            <Lock size={20} className="text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-indigo-600 mb-1">
                          Sharing Control
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          Choose who can share this content.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Options */}
                    <div className="space-y-2">
                      <label 
                        className={`flex items-start gap-2 p-2 rounded-xl border-2 cursor-pointer transition-all ${
                          !editFormData.sharingEnabled 
                            ? 'border-indigo-500 bg-white shadow-md' 
                            : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sharing-edit"
                          checked={!editFormData.sharingEnabled}
                          onChange={() => setEditFormData({ ...editFormData, sharingEnabled: false })}
                          className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Lock size={16} className="text-indigo-600" />
                            <span className="font-bold text-gray-900 text-sm">🔒 Keep within our community</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Only people with the link can view. Share button hidden.
                          </p>
                        </div>
                      </label>

                      <label 
                        className={`flex items-start gap-2 p-2 rounded-xl border-2 cursor-pointer transition-all ${
                          editFormData.sharingEnabled 
                            ? 'border-indigo-500 bg-white shadow-md' 
                            : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sharing-edit"
                          checked={editFormData.sharingEnabled}
                          onChange={() => setEditFormData({ ...editFormData, sharingEnabled: true })}
                          className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Share2 size={16} className="text-indigo-600" />
                            <span className="font-bold text-gray-900 text-sm">🔁 Allow others to share</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Viewers can share via social media, email, etc.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ STICKY: Footer - Always Visible */}
              <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-gray-50">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setThumbnailFile(null);
                      setThumbnailPreview(null);
                    }}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition text-sm"
                    disabled={saving || uploadingThumbnail}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || uploadingThumbnail}
                    className="flex-1 gradient-btn text-white px-3 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {saving || uploadingThumbnail ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span className="hidden sm:inline">{uploadingThumbnail ? 'Uploading...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span className="hidden sm:inline">Save Changes</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ItemsPage;
