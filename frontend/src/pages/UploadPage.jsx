import { useState } from 'react';
import { Upload, Image, Video, Music, FileText, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';
import { uploadToBunnyDirect, getFileFolder } from '../services/bunnyDirectUpload';

const UploadPage = () => {
  const navigate = useNavigate();
  const [uploadType, setUploadType] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const showToast = (message, type = 'success') => {
    // Implement your toast notification here
    alert(message);
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setSelectedFile(file);
    
    // Set upload type and preview based on file type
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

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload file directly to Bunny.net with real progress
      const folder = getFileFolder(selectedFile.type);
      
      showToast('Uploading to CDN...', 'info');
      
      const uploadResult = await uploadToBunnyDirect(
        selectedFile,
        folder,
        (progress) => {
          // Update progress bar with real upload progress
          setUploadProgress(Math.min(progress, 95)); // Leave 5% for backend processing
        }
      );

      if (!uploadResult.success) {
        throw new Error('CDN upload failed');
      }

      showToast('Upload complete! Creating QR code...', 'info');
      setUploadProgress(95);

      // Step 2: Tell backend about the uploaded file (quick, no file data transfer)
      const response = await api.post('/upload/register', {
        title,
        description,
        type: uploadType,
        mediaUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: selectedFile.size,
      });

      setUploadProgress(100);

      if (response.data.status === 'success') {
        showToast('File uploaded and QR code generated successfully!', 'success');
        
        setTimeout(() => {
          setTitle('');
          setDescription('');
          setSelectedFile(null);
          setPreview(null);
          setUploadType(null);
          setUploadProgress(0);
          navigate('/dashboard/items');
        }, 1000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.message || 'Failed to upload file', 'error');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleTextPost = async (e) => {
    e.preventDefault();

    if (!title) {
      showToast('Please enter a title', 'error');
      return;
    }

    if (!content) {
      showToast('Please enter content', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);

      const response = await api.post('/upload/text', {
        title,
        description,
        content,
      });

      setUploadProgress(100);

      if (response.data.status === 'success') {
        showToast('Text post created and QR code generated!', 'success');
        
        setTimeout(() => {
          setTitle('');
          setDescription('');
          setContent('');
          setUploadType(null);
          setUploadProgress(0);
          navigate('/dashboard/items');
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
              <Upload className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drag and drop your file here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <label className="gradient-btn text-white px-6 py-3 rounded-lg cursor-pointer inline-block">
                Browse Files
                <input
                  type="file"
                  className="hidden"
                  onChange={handleChange}
                  accept="image/*,video/*,audio/*"
                />
              </label>
            </div>
          </>
        )}

        {uploadType && uploadType !== 'TEXT' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Upload {uploadType}</h2>
              <button
                onClick={() => {
                  setUploadType(null);
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleFileUpload}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
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

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent h-24 resize-none"
                  placeholder="Add a description"
                />
              </div>

              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    dragActive ? 'border-primary bg-purple-50' : 'border-gray-300'
                  }`}
                >
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-700 mb-4">
                    Drag and drop your {uploadType.toLowerCase()} here
                  </p>
                  <label className="gradient-btn text-white px-6 py-3 rounded-lg cursor-pointer inline-block">
                    Browse Files
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleChange}
                      accept={
                        uploadType === 'IMAGE'
                          ? 'image/*'
                          : uploadType === 'VIDEO'
                          ? 'video/*'
                          : 'audio/*'
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="border-2 border-gray-200 rounded-xl p-4">
                    {preview && (uploadType === 'IMAGE' || uploadType === 'VIDEO') ? (
                      uploadType === 'IMAGE' ? (
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full max-h-64 object-contain rounded-lg mb-4"
                        />
                      ) : (
                        <video
                          src={preview}
                          controls
                          className="w-full max-h-64 rounded-lg mb-4"
                        />
                      )
                    ) : null}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-700">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreview(null);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {uploading && uploadProgress > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Uploading...</span>
                    <span className="text-sm font-semibold text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {uploadProgress < 95
                      ? 'Uploading file to CDN...'
                      : 'Generating QR code...'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full gradient-btn text-white py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload {uploadType}
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {uploadType === 'TEXT' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Create Text Post</h2>
              <button
                onClick={() => setUploadType(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleTextPost}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
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

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent h-48 resize-none"
                  placeholder="Write your content here..."
                  required
                />
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Creating post...</span>
                    <span className="text-sm font-semibold text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full gradient-btn text-white py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    Create Post
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UploadPage;