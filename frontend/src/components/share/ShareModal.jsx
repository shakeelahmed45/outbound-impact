import { useState, useEffect } from 'react';
import { 
  X as CloseIcon, Copy, Mail, Share2, Download, Check
} from 'lucide-react';
import {
  copyToClipboard,
  shareToTwitter,
  shareToFacebook,
  shareToLinkedIn,
  shareViaEmail,
  shareToWhatsApp,
  downloadQRCode,
  nativeShare,
  canUseWebShare
} from '../../utils/shareUtils';

// Real Social Media Brand Icons
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const ShareModal = ({ isOpen, onClose, campaign }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Reset copied state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setShowQR(false);
    }
  }, [isOpen]);

  if (!isOpen || !campaign) return null;

  const campaignUrl = `${window.location.origin}/c/${campaign.slug}`;
  const shareTitle = campaign.name;
  const shareText = `Check out this campaign: ${campaign.name}`;
  const emailSubject = `Check out: ${campaign.name}`;
  const emailBody = `I wanted to share this campaign with you:\n\n${campaign.name}\n${campaign.description || ''}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(campaignUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleTwitterShare = () => {
    shareToTwitter(campaignUrl, shareText);
  };

  const handleFacebookShare = () => {
    shareToFacebook(campaignUrl);
  };

  const handleLinkedInShare = () => {
    shareToLinkedIn(campaignUrl, shareTitle, campaign.description);
  };

  const handleEmailShare = () => {
    shareViaEmail(campaignUrl, emailSubject, emailBody);
  };

  const handleWhatsAppShare = () => {
    shareToWhatsApp(campaignUrl, shareText);
  };

  const handleNativeShare = async () => {
    const success = await nativeShare({
      title: shareTitle,
      text: shareText,
      url: campaignUrl,
    });
    if (!success) {
      // Fallback to copy if native share fails
      handleCopyLink();
    }
  };

  const handleDownloadQR = () => {
    if (campaign.qrCodeUrl) {
      downloadQRCode(campaign.qrCodeUrl, `${campaign.slug}-qr-code.png`);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
            <CloseIcon size={24} />
          </button>
          
          <div className="pr-10">
            <h2 className="text-2xl font-bold mb-2">Share Campaign</h2>
            <p className="text-white/90 text-sm line-clamp-2">{campaign.name}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Copy Link Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Campaign Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={campaignUrl}
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

          {/* QR Code Section */}
          {campaign.qrCodeUrl && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  QR Code
                </label>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="text-sm text-primary hover:text-secondary font-medium transition-colors"
                >
                  {showQR ? 'Hide' : 'Show'} QR Code
                </button>
              </div>

              {showQR && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl space-y-4 animate-slideDown">
                  {/* QR Code Image */}
                  <div className="bg-white p-4 rounded-lg shadow-inner flex items-center justify-center">
                    <img
                      src={campaign.qrCodeUrl}
                      alt="Campaign QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownloadQR}
                    className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    Download QR Code
                  </button>

                  <p className="text-xs text-center text-gray-600">
                    High-quality PNG image ready for printing
                  </p>
                </div>
              )}
            </div>
          )}
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

export default ShareModal;