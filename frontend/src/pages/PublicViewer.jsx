import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';

const PublicViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
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
    
    // FIRST: If we came from a campaign, ALWAYS go back there
    if (fromCampaign) {
      window.location.href = '/c/' + fromCampaign;
      return;
    }

    // SECOND: If opened in new tab (from Items page with no campaign) - close the tab
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }

    // Fallback to home page
    window.location.href = '/';
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
        {item.type === 'IMAGE' && (
          <img 
            src={item.mediaUrl} 
            alt={item.title} 
            className="max-w-full max-h-full object-contain"
          />
        )}

        {item.type === 'VIDEO' && (
          <video 
            controls 
            autoPlay
            className="max-w-full max-h-full"
            style={{ maxHeight: '100vh' }}
          >
            <source src={item.mediaUrl} />
          </video>
        )}

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
          </div>
        )}

        {item.type === 'TEXT' && (
          <div className="w-full max-w-4xl max-h-screen overflow-y-auto px-8 py-12">
            <div className="bg-white bg-opacity-95 p-12 rounded-3xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{item.title}</h2>
              <p className="text-gray-800 text-lg whitespace-pre-wrap leading-relaxed">
                {item.mediaUrl}
              </p>
            </div>
          </div>
        )}

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

      {/* Text Overlay (Bottom) */}
      {(item.title || item.description) && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black to-transparent p-8 pb-12 transition-all duration-500 ${
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
    </div>
  );
};

export default PublicViewer;
