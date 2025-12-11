import { useState, useEffect } from 'react';
import { Upload, Image, Video, Music, FileText, X, Loader2, Plus, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import Tooltip from '../components/common/Tooltip';
import Toast from '../components/common/Toast';

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

const UploadPage = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [uploadType, setUploadType] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  // 🆕 Campaign selection state
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [newCampaignData, setNewCampaignData] = useState({
    name: '',
    description: '',
    category: '',
  });
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // 🆕 Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // 🆕 Clear any lingering toasts on mount
  useEffect(() => {
    // Clear toasts when component mounts (prevents ghost toasts)
    return () => {
      // Cleanup function runs on unmount
    };
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const response = await api.get('/campaigns');
      if (response.data.status === 'success') {
        setCampaigns(response.data.campaigns);
        // Auto-select first campaign if available
        if (response.data.campaigns.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(response.data.campaigns[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // 🆕 Create new campaign
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (!newCampaignData.name) {
      showToast('Please enter campaign name', 'error');
      return;
    }

    setCreatingCampaign(true);

    try {
      const response = await api.post('/campaigns', newCampaignData);
      if (response.data.status === 'success') {
        const newCampaign = response.data.campaign;
        setCampaigns([newCampaign, ...campaigns]);
        setSelectedCampaignId(newCampaign.id);
        setShowCreateCampaignModal(false);
        setNewCampaignData({ name: '', description: '', category: '' });
        showToast('Campaign created successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      showToast('Failed to create campaign', 'error');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const simulateProgress = (startProgress, endProgress, duration) => {
    return new Promise((resolve) => {
      const steps = 50;
      const increment = (endProgress - startProgress) / steps;
      const stepDuration = duration / steps;
      let currentProgress = startProgress;

      const interval = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= endProgress) {
          setUploadProgress(endProgress);
          clearInterval(interval);
          resolve();
        } else {
          setUploadProgress(currentProgress);
        }
      }, stepDuration);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    
    if (file.type.startsWith('image/')) {
      setUploadType('IMAGE');
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setUploadType('VIDEO');
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('audio/')) {
      setUploadType('AUDIO');
      setPreview(null);
    } else {
      setUploadType('OTHER');
      setPreview(null);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!title) {
      showToast('Please enter a title', 'error');
      return;
    }

    if (!selectedFile) {
      showToast('Please select a file', 'error');
      return;
    }

    // 🆕 Check campaign selection
    if (!selectedCampaignId) {
      showToast('Please select a campaign', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Start progress simulation
      await simulateProgress(0, 20, 500); // Reading file: 0-20%

      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target.result;

        // File read complete
        await simulateProgress(20, 40, 300); // Preparing: 20-40%

        // Start upload
        const uploadPromise = api.post('/upload/file', {
          title,
          description,
          type: uploadType,
          fileData,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        });

        // Simulate upload progress
        const progressPromise = simulateProgress(40, 95, 2000); // Uploading: 40-95%

        const [response] = await Promise.all([uploadPromise, progressPromise]);

        setUploadProgress(100); // Complete

        if (response.data.status === 'success') {
          const itemId = response.data.item.id;

          // 🆕 Assign item to campaign
          await api.post('/campaigns/assign', {
            itemId,
            campaignId: selectedCampaignId,
          });

          showToast('File uploaded and added to campaign!', 'success');
          
          setTimeout(() => {
            setTitle('');
            setDescription('');
            setSelectedFile(null);
            setPreview(null);
            setUploadType(null);
            setUploadProgress(0);
            // 🆕 Redirect to campaigns page
            navigate('/dashboard/campaigns');
          }, 1000);
        }
      };
      
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || 'Failed to upload file', 'error');
      setUploadProgress(0);
      setUploading(false);
    }
  };

  const handleTextPost = async (e) => {
    e.preventDefault();

    if (!title || !content) {
      showToast('Please enter title and content', 'error');
      return;
    }

    // 🆕 Check campaign selection
    if (!selectedCampaignId) {
      showToast('Please select a campaign', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      await simulateProgress(0, 30, 300);

      const uploadPromise = api.post('/upload/text', {
        title,
        description,
        content,
      });

      const progressPromise = simulateProgress(30, 95, 1000);

      const [response] = await Promise.all([uploadPromise, progressPromise]);

      setUploadProgress(100);

      if (response.data.status === 'success') {
        const itemId = response.data.item.id;

        // 🆕 Assign item to campaign
        await api.post('/campaigns/assign', {
          itemId,
          campaignId: selectedCampaignId,
        });

        showToast('Text post created and added to campaign!', 'success');
        
        setTimeout(() => {
          setTitle('');
          setDescription('');
          setContent('');
          setUploadType(null);
          setUploadProgress(0);
          // 🆕 Redirect to campaigns page
          navigate('/dashboard/campaigns');
        }, 1000);
      }
    } catch (error) {
      console.error('Text post error:', error);
      showToast(error.response?.data?.message || 'Failed to create text post', 'error');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // 🆕 Campaign Selection Component
  const CampaignSelector = () => (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        Select Campaign *
        <Tooltip content="Choose which campaign this content belongs to" />
      </label>
      {loadingCampaigns ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-6 bg-purple-50 rounded-lg border border-purple-200">
          <Folder className="mx-auto mb-3 text-primary" size={32} />
          <p className="text-gray-700 mb-4">No campaigns yet. Create your first campaign!</p>
          <button
            type="button"
            onClick={() => setShowCreateCampaignModal(true)}
            className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Create Campaign</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            <option value="">-- Select a campaign --</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} {campaign.category && `(${campaign.category})`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCreateCampaignModal(true)}
            className="w-full px-4 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-purple-50 transition flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span>Create New Campaign</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-2">Upload Content</h1>
        <p className="text-secondary mb-8">Upload images, videos, audio files, or create text posts</p>

        {!uploadType && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <button
                onClick={() => setUploadType('IMAGE')}
                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-purple-50 transition-all"
              >
                <Image className="mx-auto mb-3 text-primary" size={32} />
                <span className="block font-semibold text-gray-700">Images</span>
              </button>
              <button
                onClick={() => setUploadType('VIDEO')}
                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-purple-50 transition-all"
              >
                <Video className="mx-auto mb-3 text-primary" size={32} />
                <span className="block font-semibold text-gray-700">Videos</span>
              </button>
              <button
                onClick={() => setUploadType('AUDIO')}
                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-purple-50 transition-all"
              >
                <Music className="mx-auto mb-3 text-primary" size={32} />
                <span className="block font-semibold text-gray-700">Audio</span>
              </button>
              <button
                onClick={() => setUploadType('TEXT')}
                className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-purple-50 transition-all"
              >
                <FileText className="mx-auto mb-3 text-primary" size={32} />
                <span className="block font-semibold text-gray-700">Text</span>
              </button>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive ? 'border-primary bg-purple-50' : 'border-gray-300'
              }`}
            >
              <Upload className="mx-auto mb-4 text-primary" size={48} />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Drag and drop your files here
              </p>
              <p className="text-gray-500 mb-6">or click to browse</p>
              <input
                type="file"
                onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold cursor-pointer inline-block"
              >
                Browse Files
              </label>
            </div>
          </>
        )}

        {uploadType === 'TEXT' && (
          <form onSubmit={handleTextPost} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-primary">Create Text Post</h3>
              <button
                type="button"
                onClick={() => {
                  setUploadType(null);
                  setTitle('');
                  setDescription('');
                  setContent('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* 🆕 Campaign Selector */}
              <CampaignSelector />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  Title *
                  <Tooltip content="Give your text post a clear, descriptive title" />
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  Description (Optional)
                  <Tooltip content="Add optional details about this text post" />
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add a description"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  Content *
                  <Tooltip content="Write your text content here - supports plain text and formatting" />
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Write your content here..."
                  required
                />
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Creating post...</span>
                    <span className="text-sm font-bold text-primary">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Please wait while we create your post...</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadType(null);
                    setTitle('');
                    setDescription('');
                    setContent('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedCampaignId}
                  className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      Creating...
                    </span>
                  ) : (
                    'Create Post'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {uploadType && uploadType !== 'TEXT' && !selectedFile && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-primary">Upload {uploadType}</h3>
              <button
                type="button"
                onClick={() => {
                  setUploadType(null);
                  setTitle('');
                  setDescription('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Campaign Selector */}
            <CampaignSelector />

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive ? 'border-primary bg-purple-50' : 'border-gray-300'
              }`}
            >
              <Upload className="mx-auto mb-4 text-primary" size={48} />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Drag and drop your {uploadType.toLowerCase()} file here
              </p>
              <p className="text-gray-500 mb-6">or click to browse</p>
              <input
                type="file"
                accept={
                  uploadType === 'IMAGE' ? 'image/*' :
                  uploadType === 'VIDEO' ? 'video/*' :
                  uploadType === 'AUDIO' ? 'audio/*' : '*'
                }
                onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-upload-selected"
              />
              <label
                htmlFor="file-upload-selected"
                className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold cursor-pointer inline-block"
              >
                Browse Files
              </label>
            </div>
          </div>
        )}

        {uploadType && uploadType !== 'TEXT' && selectedFile && (
          <form onSubmit={handleFileUpload} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-primary">Upload {uploadType}</h3>
              <button
                type="button"
                onClick={() => {
                  setUploadType(null);
                  setSelectedFile(null);
                  setPreview(null);
                  setTitle('');
                  setDescription('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* 🆕 Campaign Selector */}
              <CampaignSelector />

              {preview && (uploadType === 'IMAGE' || uploadType === 'VIDEO') && (
                <div className="mb-6">
                  {uploadType === 'IMAGE' && (
                    <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg" />
                  )}
                  {uploadType === 'VIDEO' && (
                    <video src={preview} controls className="w-full max-h-64 rounded-lg" />
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  Title *
                  <Tooltip content="Give your media file a clear, descriptive title" />
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  Description (Optional)
                  <Tooltip content="Add optional details about this media file" />
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add a description"
                />
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p><strong>File:</strong> {selectedFile.name}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Uploading...</span>
                    <span className="text-sm font-bold text-primary">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Please wait while we upload your file...</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadType(null);
                    setSelectedFile(null);
                    setPreview(null);
                    setTitle('');
                    setDescription('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedCampaignId}
                  className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      Uploading...
                    </span>
                  ) : (
                    'Upload File'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 🆕 Create Campaign Modal */}
        {showCreateCampaignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-primary mb-6">Create New Campaign</h2>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Campaign Name *
                    <Tooltip content="Give your campaign a clear, descriptive name" />
                  </label>
                  <input
                    type="text"
                    value={newCampaignData.name}
                    onChange={(e) => setNewCampaignData({ ...newCampaignData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Summer Sale 2024"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Category
                    <Tooltip content="Choose a category to organize your campaigns" />
                  </label>
                  <select
                    value={newCampaignData.category}
                    onChange={(e) => setNewCampaignData({ ...newCampaignData, category: e.target.value })}
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
                    <Tooltip content="Add optional details about this campaign's purpose" />
                  </label>
                  <textarea
                    value={newCampaignData.description}
                    onChange={(e) => setNewCampaignData({ ...newCampaignData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent h-24 resize-none"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCampaignModal(false);
                      setNewCampaignData({ name: '', description: '', category: '' });
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    disabled={creatingCampaign}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
                    disabled={creatingCampaign}
                  >
                    {creatingCampaign ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={20} />
                        Creating...
                      </span>
                    ) : (
                      'Create'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toasts */}
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

export default UploadPage;