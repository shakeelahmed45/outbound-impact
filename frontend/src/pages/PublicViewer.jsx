import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Paperclip, X, Download } from 'lucide-react';
import axios from 'axios';
import useBrandColors from '../hooks/useBrandColors';

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

  // ✅ Apply brand colors for the item's owner
  useBrandColors(item?.userId);

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
      }, 2000);
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
    }, 2000);
  };

  const handleBack = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const fromCampaign = searchParams.get('from');
    const isPreview = searchParams.get('preview');
    
    if (fromCampaign) {
      const targetUrl = isPreview === 'true' 
        ? `/c/${fromCampaign}?preview=true`
        : `/c/${fromCampaign}`;
      navigate(targetUrl);
      return;
    }

    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }

    navigate('/');
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentModal(true);
  };

  const handleCloseDocumentModal = () => {
    setShowDocumentModal(false);
    setSelectedDocument(null);
  };

  const convertToEmbedUrl = (url) => {
    if (!url) return url;

    // ========== YOUTUBE ==========
    // YouTube Shorts
    if (url.includes('youtube.com/shorts/') || url.includes('youtu.be/shorts/')) {
      const videoId = url.split('/shorts/')[1]?.split('?')[0]?.split('&')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // YouTube short URLs (youtu.be)
    if (url.includes('youtu.be/') && !url.includes('/shorts/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // YouTube watch URLs
    if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const videoId = urlParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Already embed URL
    if (url.includes('youtube.com/embed/')) {
      return url;
    }

    // ========== VIMEO ==========
    if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    // ========== GOOGLE DRIVE ==========
    // Handle: https://drive.google.com/file/d/FILE_ID/view
    if (url.includes('drive.google.com/file/d/')) {
      const fileId = url.split('/d/')[1]?.split('/')[0];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    // Handle: https://drive.google.com/open?id=FILE_ID
    if (url.includes('drive.google.com/open?id=')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const fileId = urlParams.get('id');
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    // ========== GOOGLE DOCS ==========
    if (url.includes('docs.google.com/document/d/') && !url.includes('/preview')) {
      const docId = url.split('/d/')[1]?.split('/')[0];
      if (docId) {
        return `https://docs.google.com/document/d/${docId}/preview`;
      }
    }

    // ========== GOOGLE SHEETS ==========
    if (url.includes('docs.google.com/spreadsheets/d/') && !url.includes('/preview')) {
      const sheetId = url.split('/d/')[1]?.split('/')[0];
      if (sheetId) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/preview`;
      }
    }

    // ========== GOOGLE SLIDES ==========
    if (url.includes('docs.google.com/presentation/d/') && !url.includes('/preview')) {
      const slideId = url.split('/d/')[1]?.split('/')[0];
      if (slideId) {
        return `https://docs.google.com/presentation/d/${slideId}/preview`;
      }
    }

    // ========== SOUNDCLOUD ==========
    // Handle: https://soundcloud.com/artist/track
    if (url.includes('soundcloud.com/') && !url.includes('api.soundcloud.com')) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
    }

    // ========== SPOTIFY ==========
    // Handle: https://open.spotify.com/track/TRACK_ID or /playlist/PLAYLIST_ID or /album/ALBUM_ID
    if (url.includes('open.spotify.com/')) {
      // Extract the type (track, playlist, album, etc.) and ID
      const match = url.match(/open\.spotify\.com\/(track|playlist|album|episode|show)\/([a-zA-Z0-9]+)/);
      if (match) {
        const [, type, id] = match;
        return `https://open.spotify.com/embed/${type}/${id}`;
      }
    }

    // ========== FACEBOOK ==========
    // Handle Facebook videos: https://www.facebook.com/watch/?v=VIDEO_ID
    if (url.includes('facebook.com/watch') || url.includes('fb.watch/')) {
      // Facebook doesn't allow iframe embedding of videos anymore
      // We'll return the URL as-is and let it open in new tab via the button
      return url;
    }

    // Handle Facebook posts/videos: https://www.facebook.com/USERNAME/videos/VIDEO_ID/
    if (url.includes('facebook.com/') && url.includes('/videos/')) {
      const videoId = url.split('/videos/')[1]?.split('/')[0]?.split('?')[0];
      if (videoId) {
        // Use Facebook's embed player
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=734`;
      }
    }

    // ========== DAILYMOTION ==========
    if (url.includes('dailymotion.com/video/')) {
      const videoId = url.split('/video/')[1]?.split('?')[0]?.split('_')[0];
      if (videoId) {
        return `https://www.dailymotion.com/embed/video/${videoId}`;
      }
    }

    // ========== TWITCH ==========
    // Handle Twitch videos and clips
    if (url.includes('twitch.tv/videos/')) {
      const videoId = url.split('/videos/')[1]?.split('?')[0];
      if (videoId) {
        return `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`;
      }
    }

    if (url.includes('twitch.tv/') && url.includes('/clip/')) {
      const clipId = url.split('/clip/')[1]?.split('?')[0];
      if (clipId) {
        return `https://clips.twitch.tv/embed?clip=${clipId}&parent=${window.location.hostname}`;
      }
    }

    // ========== RETURN ORIGINAL ==========
    // For custom iframes and other URLs, return as-is
    return url;
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
            
            {(item.buttonText || item.attachments) && (
              <div className="relative z-[45] mt-8 bg-white bg-opacity-95 p-6 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[25vh] overflow-y-auto">
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip size={20} style={{ color: 'var(--brand-primary)' }} />
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
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--brand-primary), var(--brand-secondary))` }}>
                            <Paperclip size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate" style={{ color: 'var(--brand-primary)' }}>
                              {doc.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <ExternalLink size={18} className="text-gray-400 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.buttonText && item.buttonUrl && (
                  <div className={item.attachments && item.attachments.length > 0 ? "pt-6 border-t border-gray-200" : ""}>
                    <a
                      href={item.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                      style={{ 
                        minHeight: '56px',
                        background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))`
                      }}
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
            
            {(item.buttonText || item.attachments) && (
              <div className="relative z-[45] mt-8 bg-white bg-opacity-95 p-6 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[25vh] overflow-y-auto">
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip size={20} style={{ color: 'var(--brand-primary)' }} />
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
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--brand-primary), var(--brand-secondary))` }}>
                            <Paperclip size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate" style={{ color: 'var(--brand-primary)' }}>
                              {doc.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <ExternalLink size={18} className="text-gray-400 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.buttonText && item.buttonUrl && (
                  <div className={item.attachments && item.attachments.length > 0 ? "pt-6 border-t border-gray-200" : ""}>
                    <a
                      href={item.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                      style={{ 
                        minHeight: '56px',
                        background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))`
                      }}
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
            <div className="p-12 rounded-3xl" style={{ background: `linear-gradient(to bottom right, var(--brand-primary), var(--brand-secondary))` }}>
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
            
            {(item.buttonText || item.attachments) && (
              <div className="relative z-[45] mt-8 bg-white bg-opacity-95 p-6 rounded-2xl shadow-2xl max-h-[25vh] overflow-y-auto">
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip size={20} style={{ color: 'var(--brand-primary)' }} />
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
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--brand-primary), var(--brand-secondary))` }}>
                            <Paperclip size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate" style={{ color: 'var(--brand-primary)' }}>
                              {doc.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <ExternalLink size={18} className="text-gray-400 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.buttonText && item.buttonUrl && (
                  <div className={item.attachments && item.attachments.length > 0 ? "pt-6 border-t border-gray-200" : ""}>
                    <a
                      href={item.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                      style={{ 
                        minHeight: '56px',
                        background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))`
                      }}
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

        {/* TEXT */}
        {item.type === 'TEXT' && (
          <div className="w-full max-w-4xl max-h-screen overflow-y-auto px-4 sm:px-8 py-12">
            <div className="bg-white bg-opacity-95 p-6 sm:p-12 rounded-3xl">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--brand-primary)' }}>{item.title}</h2>
              
              <div className="text-gray-800 text-base sm:text-lg whitespace-pre-wrap leading-relaxed mb-8">
                {item.mediaUrl || 'No content available'}
              </div>
              
              {item.attachments && item.attachments.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Paperclip size={20} style={{ color: 'var(--brand-primary)' }} />
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
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--brand-primary), var(--brand-secondary))` }}>
                          <Paperclip size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate" style={{ color: 'var(--brand-primary)' }}>
                            {doc.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <ExternalLink size={18} className="text-gray-400 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {item.buttonText && item.buttonUrl && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <a
                    href={item.buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                    style={{ 
                      minHeight: '56px',
                      background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))`
                    }}
                  >
                    <ExternalLink size={24} />
                    {item.buttonText}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EMBED */}
        {item.type === 'EMBED' && (
          <div className="w-full max-w-6xl px-4 sm:px-6 md:px-8 py-8 sm:py-12">
            <div className="bg-white bg-opacity-95 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--brand-primary)' }}>
                {item.title}
              </h2>
              {item.description && (
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  {item.description}
                </p>
              )}
              
              <div className="relative w-full bg-gray-100 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6" 
                   style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={convertToEmbedUrl(item.mediaUrl)}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen={true}
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                  title={item.title}
                  loading="lazy"
                />
              </div>

              <div className="flex justify-center pt-2">
                <a
                  href={item.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 text-white rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 text-sm sm:text-base"
                  style={{ background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))` }}
                >
                  <ExternalLink size={18} className="sm:w-5 sm:h-5" />
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        )}

        {/* OTHER FILE TYPES */}
        {item.type !== 'IMAGE' && item.type !== 'VIDEO' && item.type !== 'AUDIO' && item.type !== 'TEXT' && item.type !== 'EMBED' && (
          <div className="bg-white bg-opacity-95 p-12 rounded-3xl text-center max-w-md">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(to bottom right, var(--brand-primary), var(--brand-secondary))` }}>
              <span className="text-5xl">📄</span>
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--brand-primary)' }}>{item.title}</h3>
            {item.description && (
              <p className="text-gray-600 mb-6">{item.description}</p>
            )}
            <a 
              href={item.mediaUrl} 
              download 
              className="inline-block text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition"
              style={{ background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))` }}
            >
              Download File
            </a>
          </div>
        )}
      </div>

      {/* Text Overlay (Bottom) - INCREASED Z-INDEX TO 50 */}
      {(item.title || item.description) && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black to-transparent p-0 pb-8 transition-all duration-500 pointer-events-none ${
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

      {/* Document Viewer Modal */}
      {showDocumentModal && selectedDocument && (
        <div 
          className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={handleCloseDocumentModal}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 text-white p-4 sm:p-6 flex items-center justify-between" style={{ background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))` }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Paperclip size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold truncate">{selectedDocument.name}</h3>
                  <p className="text-sm opacity-80">
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
                  <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(to bottom right, var(--brand-primary), var(--brand-secondary))` }}>
                    <Paperclip size={64} className="text-white" />
                  </div>
                  <h4 className="text-2xl font-bold mb-2" style={{ color: 'var(--brand-primary)' }}>
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
                    className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    style={{ background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))` }}
                  >
                    <Download size={20} />
                    Download File
                  </a>
                </div>
              )}
            </div>

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
                className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                style={{ background: `linear-gradient(to right, var(--brand-primary), var(--brand-secondary))` }}
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
