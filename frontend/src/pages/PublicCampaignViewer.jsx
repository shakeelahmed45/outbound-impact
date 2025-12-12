import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Folder, Play, FileText, Music, Image as ImageIcon, ExternalLink } from 'lucide-react';
import axios from 'axios';

const PublicCampaignViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/campaigns/public/${slug}`
        );
        if (response.data.status === 'success') {
          setCampaign(response.data.campaign);
        }
      } catch (err) {
        setError('Campaign not found');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [slug]);

  const getMediaIcon = (type) => {
    switch (type) {
      case 'VIDEO':
        return <Play className="text-white" size={32} />;
      case 'AUDIO':
        return <Music className="text-white" size={32} />;
      case 'TEXT':
        return <FileText className="text-white" size={32} />;
      default:
        return <ImageIcon className="text-white" size={32} />;
    }
  };

  const getThumbnail = (item) => {
    if (item.type === 'IMAGE') {
      return (
        <img
          src={item.mediaUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      );
    }

    if (item.type === 'VIDEO') {
      return (
        <div className="relative w-full h-full">
          <video
            src={item.mediaUrl}
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            {getMediaIcon(item.type)}
          </div>
        </div>
      );
    }

    // ✅ TEXT TYPE - Black background with custom button
    if (item.type === 'TEXT') {
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4 flex flex-col overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-600 to-purple-700"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <FileText className="text-white" size={20} />
              <span className="text-white text-xs font-semibold">TEXT</span>
            </div>

            {/* ✅ Custom Button (if provided) */}
            {item.buttonText && item.buttonUrl && (
              <div className="mb-3">
                <a
                  href={item.buttonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all"
                >
                  <ExternalLink size={14} />
                  {item.buttonText}
                </a>
              </div>
            )}
            
            {/* Text Content - NO AUTO-LINKING */}
            <div className="flex-1 overflow-hidden">
              <div className="text-white text-sm leading-relaxed line-clamp-6 whitespace-pre-wrap">
                {item.mediaUrl || 'No content available'}
              </div>
            </div>
          </div>
          
          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent z-20"></div>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
        {getMediaIcon(item.type)}
      </div>
    );
  };

  const openItem = (item) => {
    navigate(`/l/${item.slug}?from=${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-4">Campaign Not Found</h1>
          <p className="text-secondary mb-6">The campaign you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Campaign Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Folder className="text-primary" size={32} />
              <h1 className="text-4xl font-bold text-primary">{campaign.name}</h1>
            </div>
            
            {campaign.description && (
              <p className="text-secondary text-lg mb-4">{campaign.description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
              {campaign.category && (
                <span className="px-3 py-1 bg-purple-100 text-primary rounded-full font-medium">
                  {campaign.category}
                </span>
              )}
              <span>{campaign.items.length} {campaign.items.length === 1 ? 'item' : 'items'}</span>
              <span>Created by {campaign.user.name}</span>
            </div>
          </div>
        </div>

        {/* Campaign Items Grid */}
        {campaign.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {campaign.items.map((item) => (
              <div
                key={item.id}
                onClick={() => openItem(item)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform transition hover:scale-105 hover:shadow-2xl"
              >
                {/* Item Preview */}
                <div className="aspect-square w-full overflow-hidden bg-gray-100">
                  {getThumbnail(item)}
                </div>

                {/* Item Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-primary mb-2 truncate">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-secondary line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="px-2 py-1 bg-purple-100 text-primary rounded-full">
                      {item.type}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder className="text-primary" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-4">No Items Yet</h2>
            <p className="text-secondary">This campaign doesn't have any content yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCampaignViewer;