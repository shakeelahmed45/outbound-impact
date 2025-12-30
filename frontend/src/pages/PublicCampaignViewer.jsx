import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Folder, Play, FileText, Music, Image as ImageIcon, Eye, Mic, ArrowLeft, Share2, Copy, Check, X, Lock, Loader2, Key, Shield } from 'lucide-react';
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

// Mini Share Modal Component for Items
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

        <div className="p-6 space-y-6">
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Share Via
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                onClick={handleTwitterShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <XIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">X</span>
              </button>

              <button
                onClick={handleFacebookShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <FacebookIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">Facebook</span>
              </button>

              <button
                onClick={handleLinkedInShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <LinkedInIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">LinkedIn</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <WhatsAppIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">WhatsApp</span>
              </button>

              <button
                onClick={handleEmailShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <EmailIcon />
                </div>
                <span className="text-xs font-medium text-gray-700">Email</span>
              </button>

              {canUseWebShare() && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Share2 className="text-white" size={24} />
                  </div>
                  <span className="text-xs font-medium text-gray-700">More</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PublicCampaignViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  
  // ✅ NEW: PASSWORD PROTECTION STATE
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [slug]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ NEW: Check if password is stored (check BOTH storages)
      console.log('🔍 Checking for stored password...');
      const storedPassword = getStoredPassword(slug);
      
      if (storedPassword) {
        console.log('🔑 Found stored password, attempting auto-unlock...');
        const success = await verifyPassword(storedPassword, true);
        if (success) {
          console.log('✅ Auto-unlock successful!');
          return;
        }
        console.log('❌ Stored password is invalid, clearing...');
        clearStoredPassword(slug);
      } else {
        console.log('ℹ️ No stored password found');
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/campaigns/public/${slug}`);
      
      if (response.data.status === 'success') {
        const campaignData = response.data.campaign;
        
        // ✅ NEW: Check if campaign requires password
        if (campaignData.requiresPassword || campaignData.passwordProtected) {
          console.log('🔒 Campaign requires password');
          setRequiresPassword(true);
          setCampaign(campaignData);
          setLoading(false);
          return;
        }
        
        setCampaign(campaignData);
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
      setError('Campaign not found or no longer available');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: VERIFY PASSWORD
  const verifyPassword = async (passwordToVerify, isSilent = false) => {
    try {
      if (!isSilent) {
        setVerifying(true);
        setPasswordError('');
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/campaigns/public/${slug}/verify`,
        { password: passwordToVerify }
      );

      if (response.data.status === 'success') {
        console.log('✅ Password verified successfully');
        
        // ✅ Store password only if manually entered (not auto-unlock)
        if (!isSilent) {
          storePassword(slug, passwordToVerify);
        }
        
        setCampaign(response.data.campaign);
        setRequiresPassword(false);
        setPassword('');
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Password verification failed:', error);
      
      if (!isSilent) {
        if (error.response?.status === 401) {
          setPasswordError('Incorrect password. Please try again.');
        } else {
          setPasswordError('Failed to verify password. Please try again.');
        }
      }
      
      return false;
    } finally {
      if (!isSilent) {
        setVerifying(false);
      }
    }
  };

  // ✅ NEW: HANDLE PASSWORD SUBMIT
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setPasswordError('Please enter the password');
      return;
    }

    await verifyPassword(password);
  };

  // ✅ NEW: PASSWORD STORAGE HELPERS
  const getStoredPassword = (campaignSlug) => {
    // ✅ FIX: Check BOTH localStorage and sessionStorage
    // Try localStorage first (for "remember me" passwords)
    let stored = localStorage.getItem(`campaign_password_${campaignSlug}`);
    
    // If not in localStorage, try sessionStorage
    if (!stored) {
      stored = sessionStorage.getItem(`campaign_password_${campaignSlug}`);
    }
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const expiryTime = new Date(data.expiry);
        
        // Check if password hasn't expired
        if (new Date() < expiryTime) {
          console.log('✅ Found valid stored password');
          return data.password;
        } else {
          console.log('⏰ Stored password expired');
          clearStoredPassword(campaignSlug);
        }
      } catch (e) {
        console.error('Failed to parse stored password:', e);
      }
    }
    
    return null;
  };

  const storePassword = (campaignSlug, pwd) => {
    const storage = rememberPassword ? localStorage : sessionStorage;
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // 24 hours from now
    
    const storageType = rememberPassword ? 'localStorage (24h)' : 'sessionStorage (session only)';
    console.log(`💾 Storing password in ${storageType}`);
    
    storage.setItem(`campaign_password_${campaignSlug}`, JSON.stringify({
      password: pwd,
      expiry: expiry.toISOString(),
    }));
  };

  const clearStoredPassword = (campaignSlug) => {
    localStorage.removeItem(`campaign_password_${campaignSlug}`);
    sessionStorage.removeItem(`campaign_password_${campaignSlug}`);
  };

  const getMediaIcon = (type) => {
    const iconProps = { size: 48, className: 'text-white' };
    switch (type) {
      case 'VIDEO':
        return <Play {...iconProps} />;
      case 'AUDIO':
        return <Music {...iconProps} />;
      case 'IMAGE':
        return <ImageIcon {...iconProps} />;
      case 'TEXT':
        return <FileText {...iconProps} />;
      case 'EMBED':
        return <Mic {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  const getThumbnail = (item) => {
    if (item.thumbnailUrl) {
      return (
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      );
    }

    if (item.type === 'EMBED') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          
          <div className="relative z-10 flex items-center gap-2 mb-4">
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '0ms' }}></div>
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '150ms' }}></div>
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '24px', animationDelay: '300ms' }}></div>
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '450ms' }}></div>
            <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '600ms' }}></div>
          </div>
          
          <p className="text-white text-sm font-semibold px-2">
            Click to view embedded content
          </p>
          
          <div className="mt-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
              <Eye className="w-4 h-4" />
              <span>Click to view</span>
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

  const handleShareClick = (e, item) => {
    e.stopPropagation();
    setShareItem(item);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareItem(null);
  };

  const openItem = (item) => {
    const previewParam = isPreviewMode ? '&preview=true' : '';
    navigate(`/l/${item.slug}?from=${slug}${previewParam}`);
  };

  const handleBackToCampaigns = () => {
    navigate('/dashboard/campaigns');
  };

  // ✅ NEW: PASSWORD PROMPT UI
  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {campaign?.logoUrl ? (
              <img 
                src={campaign.logoUrl} 
                alt={campaign.name}
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Lock size={40} className="text-white" />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign?.name || 'Protected Campaign'}</h1>
            {campaign?.description && (
              <p className="text-gray-600">{campaign.description}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Password Required</h2>
                <p className="text-sm text-gray-600">This campaign is protected</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>🔒 Private Content:</strong> This content is password protected to keep it private 
                within the community. Please enter the password to continue.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Key size={16} className="text-gray-500" />
                  Enter Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                  placeholder="Enter the password"
                  autoFocus
                  disabled={verifying}
                />
                {passwordError && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                    <span className="font-semibold">❌</span>
                    {passwordError}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  disabled={verifying}
                />
                <span className="text-sm text-gray-700">
                  Remember password for 24 hours
                </span>
              </label>

              <button
                type="submit"
                disabled={verifying || !password}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Lock size={20} />
                    <span>Unlock Campaign</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Don't have the password? Contact the campaign owner to get access.
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Powered by <span className="font-semibold text-purple-600">Outbound Impact</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        {isPreviewMode && (
          <button
            onClick={handleBackToCampaigns}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-primary font-semibold"
          >
            <ArrowLeft size={20} />
            <span>Back to Campaigns</span>
          </button>
        )}
        
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 mb-8">
          <div className="flex-1">
            {campaign.logoUrl && (
              <div className="mb-6">
                <img 
                  src={campaign.logoUrl} 
                  alt={`${campaign.name} logo`}
                  className="h-24 sm:h-32 md:h-40 lg:h-48 w-auto object-contain max-w-full"
                />
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <Folder className="text-primary flex-shrink-0" size={32} />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary break-words">{campaign.name}</h1>
            </div>
            
            {campaign.description && (
              <p className="text-secondary text-base sm:text-lg mb-4">{campaign.description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="flex-shrink-0" />
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
              {campaign.category && (
                <span className="px-3 py-1 bg-purple-100 text-primary rounded-full font-medium">
                  {campaign.category}
                </span>
              )}
              <span>{campaign.items.length} {campaign.items.length === 1 ? 'item' : 'items'}</span>
              <span className="hidden sm:inline">Created by {campaign.user.name}</span>
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