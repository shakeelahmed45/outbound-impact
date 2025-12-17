import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Folder, Play, FileText, Music, Image as ImageIcon, Eye, Mic, ArrowLeft } from 'lucide-react';
import axios from 'axios';

// ✅ Utility function to make URLs clickable
const linkifyText = (text) => {
  if (!text) return '';
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-blue-200 underline font-medium break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const PublicCampaignViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ NEW: Check if this is a preview from Campaigns page
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewMode = searchParams.get('preview') === 'true';

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
  
  // ✅ NEW: Handle back navigation for preview mode
  const handleBackToCampaigns = () => {
    navigate('/dashboard/campaigns');
  };

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

    // ✅ UPDATED: TEXT card with pink/purple gradient and white text
    if (item.type === 'TEXT') {
      const textContent = item.mediaUrl || 'No content available';
      const hasLongContent = textContent.length > 200;
      
      return (
        <div className="w-full h-full bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 p-4 flex flex-col overflow-hidden relative">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 via-pink-500/20 to-violet-600/20 animate-pulse pointer-events-none"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="text-white" size={20} />
              <span className="text-white text-xs font-bold tracking-wide">TEXT MESSAGE</span>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <div className="text-white text-sm leading-relaxed line-clamp-6 font-medium">
                {textContent}
              </div>
            </div>
            
            {/* ✅ "Click to read more" indicator */}
            {hasLongContent && (
              <div className="mt-auto pt-3 border-t border-white/30">
                <div className="flex items-center gap-2 text-white text-xs font-semibold">
                  <Eye className="w-4 h-4" />
                  <span>Click to read full text</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-purple-900/50 to-transparent pointer-events-none"></div>
        </div>
      );
    }

    // ✅ NEW: AUDIO card with custom design
    if (item.type === 'AUDIO') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 p-4 flex flex-col items-center justify-center overflow-hidden relative">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/30 via-pink-500/30 to-violet-600/30 animate-pulse pointer-events-none"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center h-full justify-center space-y-4">
            {/* Header message */}
            <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
              <p className="text-white text-xs font-bold tracking-wide">
                🎉 GREAT NEWS!
              </p>
            </div>
            
            <p className="text-white text-sm font-semibold px-2">
              Here is a new audio message for you
            </p>
            
            {/* Mic icon with animated waves */}
            <div className="relative my-4">
              {/* Animated sound waves */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/10 animate-ping"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center animation-delay-150">
                <div className="w-16 h-16 rounded-full bg-white/20 animate-ping"></div>
              </div>
              
              {/* Mic icon */}
              <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Mic className="text-purple-600" size={32} />
              </div>
            </div>
            
            {/* Visual sound waves */}
            <div className="flex items-center gap-1 justify-center">
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '0ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '150ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '24px', animationDelay: '300ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '450ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '600ms' }}></div>
            </div>
            
            {/* Call to action */}
            <div className="mt-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <div className="flex items-center gap-2 text-white text-xs font-bold">
                <Play className="w-4 h-4" />
                <span>Click here to hear</span>
              </div>
            </div>
          </div>
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
        {/* ✅ NEW: Back button for preview mode */}
        {isPreviewMode && (
          <button
            onClick={handleBackToCampaigns}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-primary font-semibold"
          >
            <ArrowLeft size={20} />
            <span>Back to Campaigns</span>
          </button>
        )}
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex-1">
            {/* ✅ NEW: Display campaign logo BEFORE title */}
            {campaign.logoUrl && (
              <div className="mb-6">
                <img 
                  src={campaign.logoUrl} 
                  alt={`${campaign.name} logo`}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
            
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

        {campaign.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {campaign.items.map((item) => (
              <div
                key={item.id}
                onClick={() => openItem(item)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform transition hover:scale-105 hover:shadow-2xl"
              >
                <div className="aspect-square w-full overflow-hidden bg-gray-100">
                  {getThumbnail(item)}
                </div>

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
