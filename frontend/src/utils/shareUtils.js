// Share utility functions

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

/**
 * Share to Twitter
 */
export const shareToTwitter = (url, text) => {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
};

/**
 * Share to Facebook
 */
export const shareToFacebook = (url) => {
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(facebookUrl, '_blank', 'width=550,height=420');
};

/**
 * Share to LinkedIn
 */
export const shareToLinkedIn = (url, title, summary) => {
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(linkedInUrl, '_blank', 'width=550,height=420');
};

/**
 * Share via Email
 */
export const shareViaEmail = (url, subject, body) => {
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n' + url)}`;
  window.location.href = mailtoUrl;
};

/**
 * Share to WhatsApp
 */
export const shareToWhatsApp = (url, text) => {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
  window.open(whatsappUrl, '_blank');
};

/**
 * Download QR code as image
 */
export const downloadQRCode = (qrCodeUrl, fileName = 'qr-code.png') => {
  const link = document.createElement('a');
  link.href = qrCodeUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Check if Web Share API is available
 */
export const canUseWebShare = () => {
  return navigator.share !== undefined;
};

/**
 * Use native Web Share API (mobile)
 */
export const nativeShare = async (data) => {
  try {
    if (canUseWebShare()) {
      await navigator.share(data);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error sharing:', err);
    return false;
  }
};