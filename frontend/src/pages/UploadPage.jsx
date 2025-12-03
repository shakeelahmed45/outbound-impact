import { useState } from 'react';
import { Upload, Image, Video, Music, FileText, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/common/Toast';

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
          showToast('File uploaded successfully! QR code generated.', 'success');
          
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
        showToast('Text post created successfully! QR code generated.', 'success');
        
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
              <div>
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content *
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
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Creating...
                    </>
                  ) : (
                    'Create Text Post'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {(uploadType === 'IMAGE' || uploadType === 'VIDEO' || uploadType === 'AUDIO' || uploadType === 'OTHER') && (
          <form onSubmit={handleFileUpload} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-primary">Upload File</h3>
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

            {!selectedFile && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all mb-6 ${
                  dragActive ? 'border-primary bg-purple-50' : 'border-gray-300'
                }`}
              >
                <Upload className="mx-auto mb-4 text-primary" size={48} />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  Drop your file here
                </p>
                <p className="text-gray-500 mb-6">or click to browse</p>
                <input
                  type="file"
                  onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="file-upload-modal"
                  accept={
                    uploadType === 'IMAGE' ? 'image/*' :
                    uploadType === 'VIDEO' ? 'video/*' :
                    uploadType === 'AUDIO' ? 'audio/*' : '*'
                  }
                />
                <label
                  htmlFor="file-upload-modal"
                  className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold cursor-pointer inline-block"
                >
                  Browse Files
                </label>
              </div>
            )}

            {selectedFile && (
              <>
                {preview && uploadType === 'IMAGE' && (
                  <div className="mb-6">
                    <img src={preview} alt="Preview" className="w-full max-h-96 object-contain rounded-lg" />
                  </div>
                )}

                {preview && uploadType === 'VIDEO' && (
                  <div className="mb-6">
                    <video controls className="w-full max-h-96 rounded-lg">
                      <source src={preview} />
                    </video>
                  </div>
                )}

                {selectedFile && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Selected file:</p>
                    <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
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

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Add a description"
                    />
                  </div>

                  {uploading && uploadProgress > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Uploading file...</span>
                        <span className="text-sm font-bold text-primary">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Please wait while we upload your file to the cloud...</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreview(null);
                      }}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                      disabled={uploading}
                    >
                      Change File
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Uploading...
                        </>
                      ) : (
                        'Upload File'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        )}

        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UploadPage;
