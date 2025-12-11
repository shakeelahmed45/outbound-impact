import { useState, useEffect } from 'react';
import { 
  X, Copy, Mail, Share2, Download, Check,
  Facebook, Twitter, Linkedin, MessageCircle
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
            <X size={24} />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Twitter */}
              <button
                onClick={handleTwitterShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Twitter size={24} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Twitter</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebookShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Facebook size={24} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Facebook</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={handleLinkedInShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Linkedin size={24} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">LinkedIn</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle size={24} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">WhatsApp</span>
              </button>

              {/* Email */}
              <button
                onClick={handleEmailShare}
                className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail size={24} className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Email</span>
              </button>

              {/* Native Share (Mobile) */}
              {canUseWebShare() && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
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

          {/* Pro Tips */}
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-xl">
            <p className="text-xs font-semibold text-primary mb-2">💡 Pro Tips:</p>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Share on social media to reach a wider audience</li>
              <li>• Download QR code for print materials</li>
              <li>• Copy link for easy sharing via messaging apps</li>
            </ul>
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

export default ShareModal;