import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Paperclip, X, Download } from 'lucide-react';
import axios from 'axios';

const PublicViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const hasTracked = useRef(false);
  const overlayTimeout = useRef(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await axios.get(import.meta.env.VITE_API_URL + '/items/public/' + slug);
        if (response.data.status === 'success') {
          setItem(response.data.item);
          
          if (!hasTracked.current) {
            hasTracked.current = true;
            axios.post(import.meta.env.VITE_API_URL + '/analytics/track', { slug }).catch(err => {
              console.log('Failed to track view:', err);
            });
          }
        }
      } catch (err) {
        setError('Item not found');
      } finally {
        setLoading(false);
      }
    };
    
    fetchItem();
  }, [slug]);

  useEffect(() => {
    if (item && showOverlay) {
      overlayTimeout.current = setTimeout(() => {
        setShowOverlay(false);
      }, 3000);
    }

    return () => {
      if (overlayTimeout.current) {
        clearTimeout(overlayTimeout.current);
      }
    };
  }, [item, showOverlay]);

  const handleMouseMove = () => {
    setShowOverlay(true);
    if (overlayTimeout.current) {
      clearTimeout(overlayTimeout.current);
    }
    overlayTimeout.current = setTimeout(() => {
      setShowOverlay(false);
    }, 3000);
  };

  const handleBack = () => {
    const fromCampaign = new URLSearchParams(window.location.search).get('from');
    
    if (fromCampaign) {
      window.location.href = '/c/' + fromCampaign;
      return;
    }

    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }

    window.location.href = '/';
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentModal(true);
  };

  const handleCloseDocumentModal = () => {
    setShowDocumentModal(false);
    setSelectedDocument(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Content Not Found</h1>
          <p className="text-gray-400 mb-6">The content you are looking for does not exist.</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onClick={() => setShowOverlay(true)}
    >
      {/* Back Button */}
      <button
        onClick={handleBack}
        className={`fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-black bg-opacity-70 text-white rounded-lg font-semibold backdrop-blur-sm hover:bg-opacity-90 transition-all ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      {/* Media Content */}
      <div className="relative w-full h-screen flex items-center justify-center">
        {/* IMAGE */}
        {item.type === 'IMAGE' && (
          <div className="w-full h-screen flex flex-col items-center justify-center px-4">
            <img 
              src={item.mediaUrl} 
              alt={item.title} 
              className="max-w-full max-h-[70vh] object-contain"
            />
            
            {/* ✅ NEW: Button and Attachments for IMAGE */}
            {(item.buttonText || item.attachments) && (
              <div className="mt-8 bg-white bg-opacity-95 p-6 rounded-2xl shadow-2xl max-w-4xl w-full">
                {/* Documents Section */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip size={20} className="text-purple-600" />
                      Attached Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {item.attachments.map((doc, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentClick(doc);
                          }}
                          className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group text-left"
                        >
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                            <Paperclip size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-purple-600">
                              {doc.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <ExternalLink size={18} className="text-gray-400 group-hover:text-purple-600 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Custom Link Button */}
                {item.buttonText && item.buttonUrl && (
                  <div className={item.attachments && item.attachments.length > 0 ? "pt-6 border-t border-gray-200" : ""}>
                    <a
                      href={item.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                      style={{ minHeight: '56px' }}
                    >
                      <ExternalLink size={24} />
                      {item.buttonText}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIDEO */}
        {item.type === 'VIDEO' && (
          <div className="w-full h-screen flex flex-col items-center justify-center px-4">
            <video 
              controls 
              autoPlay
              className="max-w-full max-h-[70vh]"
            >
              <source src={item.mediaUrl} />
            </video>
            
            {/* ✅ NEW: Button and Attachments for VIDEO */}
            {(item.buttonText || item.attachments) && (
              <div className="mt-8 bg-white bg-opacity-95 p-6 rounded-2xl shadow-2xl max-w-4xl w-full">
                {/* Documents Section */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip size={20} className="text-purple-600" />
                      Attached Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {item.attachments.map((doc, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentClick(doc);
                          }}
                          className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group text-left"
                        >
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                            <Paperclip size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-purple-600">
                              {doc.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <ExternalLink size={18} className="text-gray-400 group-hover:text-purple-600 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Custom Link Button */}
                {item.buttonText && item.buttonUrl && (
                  <div className={item.attachments && item.attachments.length > 0 ? "pt-6 border-t border-gray-200" : ""}>
                    <a
                      href={item.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                      style={{ minHeight: '56px' }}
                    >
                      <ExternalLink size={24} />
                      {item.buttonText}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AUDIO */}
        {item.type === 'AUDIO' && (
          <div className="w-full max-w-2xl px-8">
            <div className="bg-gradient-to-br from-purple-900 to-violet-900 p-12 rounded-3xl">
              <div className="text-center mb-8">
                <div className="w-32 h-32 bg-white bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-7xl">🎵</span>
                </div>
                <h3 className="text-3xl font-bold text-white">{item.title}</h3>
              </div>
              <audio controls className="w-full">
                <source src={item.mediaUrl} />
              </audio>
            </div>
            
            {/* ✅ NEW: Button and Attachments for AUDIO */}
            {(item.buttonText || item.attachments) && (
              <div className="mt-8 bg-white bg-opacity-95 p-6 rounded-2xl shadow-2xl">
                {/* Documents Section */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip size={20} className="text-purple-600" />
                      Attached Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {item.attachments.map((doc, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentClick(doc);
                          }}
                          className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group text-left"
                        >
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                            <Paperclip size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-purple-600">
                              {doc.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <ExternalLink size={18} className="text-gray-400 group-hover:text-purple-600 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Custom Link Button */}
                {item.buttonText && item.buttonUrl && (
                  <div className={item.attachments && item.attachments.length > 0 ? "pt-6 border-t border-gray-200" : ""}>
                    <a
                      href={item.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                      style={{ minHeight: '56px' }}
                    >
                      <ExternalLink size={24} />
                      {item.buttonText}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TEXT - FIXED FOR MOBILE */}
        {item.type === 'TEXT' && (
          <div className="w-full max-w-4xl max-h-screen overflow-y-auto px-4 sm:px-8 py-12">
            <div className="bg-white bg-opacity-95 p-6 sm:p-12 rounded-3xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">{item.title}</h2>
              
              {/* Text Content */}
              <div className="text-gray-800 text-base sm:text-lg whitespace-pre-wrap leading-relaxed mb-8">
                {item.mediaUrl || 'No content available'}
              </div>
              
              {/* Documents Section - NEW */}
              {item.attachments && item.attachments.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Paperclip size={20} className="text-purple-600" />
                    Attached Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {item.attachments.map((doc, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDocumentClick(doc);
                        }}
                        className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group text-left"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                          <Paperclip size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate group-hover:text-purple-600">
                            {doc.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <ExternalLink size={18} className="text-gray-400 group-hover:text-purple-600 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Custom Link Button - FIXED FOR MOBILE */}
              {item.buttonText && item.buttonUrl && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <a
                    href={item.buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                    style={{ minHeight: '56px' }}
                  >
                    <ExternalLink size={24} />
                    {item.buttonText}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OTHER FILE TYPES */}
        {item.type !== 'IMAGE' && item.type !== 'VIDEO' && item.type !== 'AUDIO' && item.type !== 'TEXT' && (
          <div className="bg-white bg-opacity-95 p-12 rounded-3xl text-center max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📄</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
            {item.description && (
              <p className="text-gray-600 mb-6">{item.description}</p>
            )}
            <a 
              href={item.mediaUrl} 
              download 
              className="inline-block bg-gradient-to-r from-purple-600 to-violet-600 text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Download File
            </a>
          </div>
        )}
      </div>

      {/* Text Overlay (Bottom) - Title & Description */}
      {(item.title || item.description) && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black to-transparent p-0 pb-8 transition-all duration-500 ${
            showOverlay ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            {item.title && (
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {item.title}
              </h1>
            )}
            {item.description && (
              <p className="text-lg text-gray-300 max-w-3xl">
                {item.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer Modal - NEW */}
      {showDocumentModal && selectedDocument && (
        <div 
          className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={handleCloseDocumentModal}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Paperclip size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold truncate">{selectedDocument.name}</h3>
                  <p className="text-sm text-purple-100">
                    {(selectedDocument.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDocumentModal}
                className="flex-shrink-0 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all ml-4"
              >
                <X size={24} />
              </button>
            </div>

            {/* Document Preview */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {selectedDocument.type?.includes('image') ? (
                <img 
                  src={selectedDocument.url} 
                  alt={selectedDocument.name}
                  className="w-full h-auto"
                />
              ) : selectedDocument.type?.includes('pdf') ? (
                <iframe
                  src={selectedDocument.url}
                  className="w-full"
                  style={{ height: 'calc(90vh - 140px)' }}
                  title={selectedDocument.name}
                />
              ) : (
                <div className="p-12 text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Paperclip size={64} className="text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedDocument.name}
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Preview not available for this file type
                  </p>
                  <a
                    href={selectedDocument.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <Download size={20} />
                    Download File
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between gap-4">
              <button
                onClick={handleCloseDocumentModal}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Close
              </button>
              <a
                href={selectedDocument.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                <Download size={20} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicViewer;
