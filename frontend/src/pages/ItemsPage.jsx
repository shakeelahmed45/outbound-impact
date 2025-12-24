import { useEffect, useState } from 'react';
import { Trash2, ExternalLink, Copy, FolderOpen, Eye, Image, Upload, X, FileText, Video, Music, File } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const ItemsPage = () => {
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Thumbnail upload states
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    document.title = 'Messages | Outbound Impact';
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

  // Get default thumbnail based on type
  const getDefaultThumbnail = (type) => {
    switch (type) {
      case 'IMAGE':
        return null; // Will use actual image
      case 'VIDEO':
        return 'video';
      case 'AUDIO':
        return 'audio';
      case 'TEXT':
        return 'text';
      default:
        return 'file';
    }
  };

  // Render thumbnail
  const renderThumbnail = (item) => {
    if (item.thumbnailUrl) {
      return (
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      );
    }

    // Default icons for non-image types
    const iconClass = "w-12 h-12 text-gray-400";
    switch (item.type) {
      case 'IMAGE':
        return item.mediaUrl ? (
          <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Image className={iconClass} />
        );
      case 'VIDEO':
        return <Video className={iconClass} />;
      case 'AUDIO':
        return <Music className={iconClass} />;
      case 'TEXT':
        return <FileText className={iconClass} />;
      default:
        return <File className={iconClass} />;
    }
  };

  // Open thumbnail upload modal
  const openThumbnailModal = (item) => {
    setSelectedItem(item);
    setThumbnailPreview(item.thumbnailUrl);
    setShowThumbnailModal(true);
  };

  // Close thumbnail modal
  const closeThumbnailModal = () => {
    setShowThumbnailModal(false);
    setSelectedItem(null);
    setThumbnailPreview(null);
    setThumbnailFile(null);
  };

  // Handle thumbnail file selection
  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload thumbnail
  const uploadThumbnail = async () => {
    if (!thumbnailFile || !selectedItem) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        
        const response = await api.post(`/items/${selectedItem.id}/thumbnail`, {
          thumbnailData: base64Data,
          fileName: thumbnailFile.name,
        });

        if (response.data.status === 'success') {
          setItems(items.map(item => 
            item.id === selectedItem.id 
              ? { ...item, thumbnailUrl: response.data.item.thumbnailUrl }
              : item
          ));
          alert('Thumbnail updated successfully!');
          closeThumbnailModal();
        }
      };
      reader.readAsDataURL(thumbnailFile);
    } catch (error) {
      console.error('Failed to upload thumbnail:', error);
      alert('Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  // Remove thumbnail
  const removeThumbnail = async () => {
    if (!selectedItem) return;

    if (!confirm('Remove custom thumbnail?')) return;

    setUploading(true);
    try {
      const response = await api.delete(`/items/${selectedItem.id}/thumbnail`);
      
      if (response.data.status === 'success') {
        setItems(items.map(item => 
          item.id === selectedItem.id 
            ? { ...item, thumbnailUrl: response.data.item.thumbnailUrl }
            : item
        ));
        alert('Thumbnail removed!');
        closeThumbnailModal();
      }
    } catch (error) {
      console.error('Failed to remove thumbnail:', error);
      alert('Failed to remove thumbnail');
    } finally {
      setUploading(false);
    }
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">My Items</h1>
        <p className="text-secondary">Manage your uploaded content and thumbnails</p>
      </div>

      {/* Thumbnail Upload Modal */}
      {showThumbnailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-primary">Edit Thumbnail</h2>
              <button onClick={closeThumbnailModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">{selectedItem.title}</p>
            
            {/* Current/Preview Thumbnail */}
            <div className="mb-4">
              <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    <Image size={48} />
                    <span className="text-sm mt-2">No thumbnail</span>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Input */}
            <div className="mb-4">
              <label className="block w-full">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-primary transition">
                  <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                  <span className="text-sm text-gray-600">Click to upload thumbnail</span>
                  <span className="text-xs text-gray-400 block mt-1">Max 5MB, Images only</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {selectedItem.thumbnailUrl && (
                <button
                  onClick={removeThumbnail}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              <button
                onClick={uploadThumbnail}
                disabled={!thumbnailFile || uploading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Save Thumbnail'}
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Image size={40} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-primary mb-3">No Items Yet</h3>
          <p className="text-secondary mb-6">
            Upload your first item to get started!
          </p>
          <button
            onClick={() => (window.location.href = '/dashboard/upload')}
            className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold"
          >
            Upload Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all"
            >
              {/* Thumbnail */}
              <div 
                className="relative h-48 bg-gray-100 flex items-center justify-center cursor-pointer group"
                onClick={() => openThumbnailModal(item)}
              >
                {renderThumbnail(item)}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition">
                    <div className="bg-white rounded-full p-3">
                      <Upload size={24} className="text-primary" />
                    </div>
                  </div>
                </div>

                {/* Type badge */}
                <span className="absolute top-3 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {item.type}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                  <span className="bg-gray-100 px-2 py-1 rounded">{formatBytes(parseInt(item.fileSize))}</span>
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded flex items-center gap-1">
                    <Eye size={12} />
                    {item.views || 0} views
                  </span>
                </div>

                {/* Campaign Assignment */}
                <div className="mb-4">
                  <select
                    value={item.campaignId || ''}
                    onChange={(e) => assignToCampaign(item.id, e.target.value || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">No Campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => copyPublicLink(item.publicUrl)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-sm hover:opacity-90 transition"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  
                  <button
                    onClick={() => window.open(item.publicUrl, '_blank')}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                  >
                    <ExternalLink size={14} />
                  </button>
                  
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
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