import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Folder, Play, FileText, Music, Image as ImageIcon, Eye, Mic, ArrowLeft, Share2, Copy, Check, X } from 'lucide-react';
import axios from 'axios';
import {
  copyToClipboard,
  shareToTwitter,
  shareToFacebook,
  shareToLinkedIn,
  shareViaEmail,
  shareToWhatsApp,
  nativeShare,
  canUseWebShare
} from '../utils/shareUtils';

// Social Media Icons (same as ShareModal)
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

// ✅ Mini Share Modal Component for Items
const ItemShareModal = ({ isOpen, onClose, item, campaignName }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const itemUrl = `${window.location.origin}/l/${item.slug}`;
  const shareTitle = item.title;
  const shareText = `Check out: ${item.title} from ${campaignName}`;
  const emailSubject = `Check out: ${item.title}`;
  const emailBody = `I wanted to share this with you:\n\n${item.title}\n${item.description || ''}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(itemUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleTwitterShare = () => shareToTwitter(itemUrl, shareText);
  const handleFacebookShare = () => shareToFacebook(itemUrl);
  const handleLinkedInShare = () => shareToLinkedIn(itemUrl, shareTitle, item.description);
  const handleEmailShare = () => shareViaEmail(itemUrl, emailSubject, emailBody);
  const handleWhatsAppShare = () => shareToWhatsApp(itemUrl, shareText);
  
  const handleNativeShare = async () => {
    const success = await nativeShare({
      title: shareTitle,
      text: shareText,
      url: itemUrl,
    });
    if (!success) handleCopyLink();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
          
          <div className="pr-10">
            <h2 className="text-2xl font-bold mb-2">Share Content</h2>
            <p className="text-white/90 text-sm line-clamp-2">{item.title}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Copy Link Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Content Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={itemUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={20} />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Share Via
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* X (Twitter) */}
              <button
                onClick={handleTwitterShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <XIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">X</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebookShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <FacebookIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">Facebook</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={handleLinkedInShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <LinkedInIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">LinkedIn</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <WhatsAppIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">WhatsApp</span>
              </button>

              {/* Email */}
              <button
                onClick={handleEmailShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <EmailIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">Email</span>
              </button>

              {/* Native Share (Mobile) */}
              {canUseWebShare() && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Share2 size={24} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">More</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [shareItem, setShareItem] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
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

  // ✅ NEW: Handle share button click
  const handleShareClick = (e, item) => {
    e.stopPropagation(); // Prevent card click
    setShareItem(item);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareItem(null);
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case 'VIDEO':
        return <Play className="text-white" size={32} />;
      case 'AUDIO':
        return <Music className="text-white" size={32} />;
      case 'TEXT':
        return <FileText className="text-white" size={32} />;
      case 'EMBED':
        return <Play className="text-white" size={32} />;
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

    // ✅ TEXT card with pink/purple gradient and white text
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
            
            {/* ✅ "Click to read more" indicator with pulsing animation */}
            {hasLongContent && (
              <div className="mt-auto pt-3 border-t border-white/30">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Eye icon with animated pulsing waves */}
                  <div className="relative flex-shrink-0">
                    {/* Animated pulsing waves */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/10 animate-ping"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center animation-delay-150">
                      <div className="w-8 h-8 rounded-full bg-white/20 animate-ping"></div>
                    </div>
                    
                    {/* Eye icon */}
                    <div className="relative z-10 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  
                  {/* Text only - no wave bars */}
                  <span className="text-white text-xs sm:text-sm font-bold">Click to read full text</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-purple-900/50 to-transparent pointer-events-none"></div>
        </div>
      );
    }

    // ✅ AUDIO card with custom design
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

    // ✅ EMBED card with video/link design
    if (item.type === 'EMBED') {
      // Detect embed type from buttonText (which stores the platform type)
      const platformType = item.buttonText || 'External';
      const platformIcon = platformType.includes('YouTube') || platformType.includes('Vimeo') ? '🎬' : 
                          platformType.includes('SoundCloud') || platformType.includes('Spotify') ? '🎵' :
                          platformType.includes('Google') ? '📄' : '🔗';
      
      return (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-4 flex flex-col items-center justify-center overflow-hidden relative">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 via-blue-500/30 to-purple-600/30 animate-pulse pointer-events-none"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center h-full justify-center space-y-4">
            {/* Platform badge */}
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <p className="text-white text-xs font-bold tracking-wide">
                {platformIcon} {platformType.toUpperCase()}
              </p>
            </div>
            
            {/* Play icon with animated waves (same as audio) */}
            <div className="relative my-2">
              {/* Animated pulsing waves */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/10 animate-ping"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center animation-delay-150">
                <div className="w-16 h-16 rounded-full bg-white/20 animate-ping"></div>
              </div>
              
              {/* Play icon */}
              <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Play className="text-indigo-600" size={32} />
              </div>
            </div>
            
            {/* Visual wave bars (same as audio) */}
            <div className="flex items-center gap-1 justify-center">
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '0ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '150ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '24px', animationDelay: '300ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '450ms' }}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '600ms' }}></div>
            </div>
            
            {/* Description */}
            <p className="text-white text-sm font-semibold px-2">
              Click to view embedded content
            </p>
            
            {/* Call to action */}
            <div className="mt-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <div className="flex items-center gap-2 text-white text-xs font-bold">
                <Eye className="w-4 h-4" />
                <span>Click to view</span>
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
    // Preserve preview parameter when navigating to item
    const previewParam = isPreviewMode ? '&preview=true' : '';
    navigate(`/l/${item.slug}?from=${slug}${previewParam}`);
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
        {/* ✅ Back button for preview mode */}
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
            {/* ✅ Display campaign logo BEFORE title */}
            {campaign.logoUrl && (
              <div className="mb-6">
                <img 
                  src={campaign.logoUrl} 
                  alt={`${campaign.name} logo`}
                  className="h-25 w-auto object-contain"
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
                className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition hover:scale-105 hover:shadow-2xl relative"
              >
                {/* ✅ NEW: Share Button Overlay - Always Visible */}
                <button
                  onClick={(e) => handleShareClick(e, item)}
                  className="absolute top-3 right-3 z-50 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all pointer-events-auto"
                  title="Share this content"
                >
                  <Share2 size={20} className="text-primary" />
                </button>

                <div 
                  onClick={() => openItem(item)}
                  className="cursor-pointer"
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

      {/* ✅ NEW: Share Modal for Items */}
      <ItemShareModal
        isOpen={showShareModal}
        onClose={closeShareModal}
        item={shareItem}
        campaignName={campaign?.name}
      />
    </div>
  );
};

export default PublicCampaignViewer;
