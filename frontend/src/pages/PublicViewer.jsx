import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Share2, Calendar } from 'lucide-react';
import axios from 'axios';

const PublicViewer = () => {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const fetchItem = async () => {
  try {
    const response = await axios.get(import.meta.env.VITE_API_URL + '/items/public/' + slug);
    if (response.data.status === 'success') {
      setItem(response.data.item);
      
      // Track view only once
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

  const downloadQRCode = () => {
    if (!item) return;
    if (!item.qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = item.qrCodeUrl;
    link.download = 'qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareItem = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-4">Content Not Found</h1>
          <p className="text-secondary mb-6">The content you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-primary mb-3">{item.title}</h1>
              {item.description && (
                <p className="text-secondary text-lg mb-4">{item.description}</p>
              )}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <span>Shared by {item.user.name}</span>
              </div>
            </div>
            {item.qrCodeUrl && (
              <img src={item.qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded-xl shadow-md" />
            )}
          </div>

          <div className="flex gap-4">
            {item.qrCodeUrl && (
              <button
                onClick={downloadQRCode}
                type="button"
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Download size={20} />
                <span>Download QR</span>
              </button>
            )}
            <button
              onClick={shareItem}
              type="button"
              className="flex-1 border-2 border-primary text-primary px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Share2 size={20} />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {item.type === 'IMAGE' && (
            <img src={item.mediaUrl} alt={item.title} className="w-full max-h-[500px] object-contain rounded-2xl shadow-lg" />
          )}

          {item.type === 'VIDEO' && (
            <video controls className="w-full max-h-[500px] rounded-2xl shadow-lg">
              <source src={item.mediaUrl} />
            </video>
          )}

          {item.type === 'AUDIO' && (
            <div className="bg-gradient-to-br from-primary to-secondary p-12 rounded-2xl shadow-lg">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-6xl">🎵</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
              </div>
              <audio controls className="w-full">
                <source src={item.mediaUrl} />
              </audio>
            </div>
          )}

          {item.type === 'TEXT' && (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap">{item.mediaUrl}</p>
            </div>
          )}

          {item.type !== 'IMAGE' && item.type !== 'VIDEO' && item.type !== 'AUDIO' && item.type !== 'TEXT' && (
            <div className="bg-white p-12 rounded-2xl shadow-lg text-center border border-gray-200">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                <Download size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Download File</h3>
              <a href={item.mediaUrl} download className="gradient-btn text-white px-8 py-3 rounded-lg font-semibold inline-flex items-center gap-2">
                <Download size={20} />
                <span>Download</span>
              </a>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-secondary mb-4">Powered by <span className="font-bold text-primary">Outbound Impact</span></p>
        </div>
      </div>
    </div>
  );
};

export default PublicViewer;