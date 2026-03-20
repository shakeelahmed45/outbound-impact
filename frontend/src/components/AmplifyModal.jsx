// AmplifyModal.jsx
// Lets org admins share an OI item to multiple social platforms in one tap.
// Each platform opens sequentially with the OI link pre-filled.
// No API keys, no permissions, no App Review — pure Web Share URLs.

import { useState } from 'react';
import { X, Check, Copy, ExternalLink, Zap, Link } from 'lucide-react';
import { copyToClipboard } from '../utils/shareUtils';

// ── Platform definitions ────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    bg: '#E7F0FD',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    note: 'Shares as a link preview with your image and title',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    bg: '#E8F8EE',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
    note: 'Sends message with your link',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    bg: '#FCE8F0',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="url(#ig-amp-grad)">
        <defs>
          <linearGradient id="ig-amp-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433"/>
            <stop offset="50%" stopColor="#dc2743"/>
            <stop offset="100%" stopColor="#bc1888"/>
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    getUrl: (url, text) => null, // Instagram has no web share URL
    mobileOnly: true,
    note: 'Opens Instagram on mobile — paste your link in your story or post',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    bg: '#E8F0FA',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    note: 'Shares as a professional post with link preview',
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    color: '#000000',
    bg: '#F0F0F0',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    note: 'Posts a tweet with your link',
  },
  {
    id: 'email',
    label: 'Email',
    color: '#6B7280',
    bg: '#F3F4F6',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    ),
    getUrl: (url, text) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(text + '\n\nView here: ' + url)}`,
    note: 'Opens your email app with the link pre-filled',
  },
];

// ── Amplify Modal ───────────────────────────────────────────────
const AmplifyModal = ({ item, onClose }) => {
  const [selected,  setSelected]  = useState({ facebook: true, whatsapp: true });
  const [sharing,   setSharing]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  const publicUrl  = `${window.location.origin}/l/${item.slug}`;
  const trackedUrl = (platform) => `${publicUrl}?source=amplify&platform=${platform}`;
  const shareText  = customMsg.trim() || item.title;
  const isMobile   = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(trackedUrl('copy'));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2500); }
  };

  const handleAmplify = async () => {
    setSharing(true);

    const toShare = PLATFORMS.filter(p => selected[p.id]);

    for (const platform of toShare) {
      // Instagram — mobile: use native Web Share API; desktop: copy link
      if (platform.id === 'instagram') {
        const tUrl = trackedUrl('instagram');
        if (isMobile && navigator.share) {
          try {
            await navigator.share({ title: shareText, text: shareText, url: tUrl });
          } catch (_) {}
        } else {
          await copyToClipboard(tUrl);
        }
        continue;
      }

      const url = platform.getUrl(trackedUrl(platform.id), shareText);
      if (url) {
        window.open(url, '_blank', 'width=600,height=480,noopener,noreferrer');
        // Small delay between windows so browser doesn't block them
        await new Promise(r => setTimeout(r, 600));
      }
    }

    setSharing(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  const visiblePlatforms = PLATFORMS.filter(p => {
    if (p.mobileOnly && !isMobile) return true; // still show, but with different note
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header — sticky so title stays visible while scrolling */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-500 to-violet-600 px-6 py-5 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-white"/>
              <h2 className="text-white font-bold text-lg">Amplify This Post</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X size={20}/>
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1">Share to multiple platforms in one tap</p>
        </div>

        <div className="p-6 pb-8">

          {/* Item preview */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 mb-5 border border-slate-200">
            {item.thumbnailUrl ? (
              <img src={item.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"/>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                <Link size={18} className="text-violet-500"/>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{item.title}</p>
              <p className="text-xs text-slate-400 font-mono truncate">{publicUrl}</p>
            </div>
          </div>

          {/* Custom message */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Caption (optional)
            </label>
            <textarea
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              placeholder={item.title}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to use the item title</p>
          </div>

          {/* Platform checkboxes */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Share to
            </label>
            <div className="space-y-2">
              {visiblePlatforms.map(platform => {
                const isSelected = selected[platform.id];
                return (
                  <button
                    key={platform.id}
                    onClick={() => toggle(platform.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3}/>}
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: platform.bg }}>
                      <platform.icon/>
                    </div>

                    {/* Label + note */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{platform.label}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {platform.id === 'instagram' && !isMobile
                          ? 'Link will be copied — paste into your Instagram post'
                          : platform.note}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 text-sm font-semibold hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-all mb-4"
          >
            {copied ? <><Check size={15} className="text-green-600"/> Link copied!</> : <><Copy size={15}/> Copy link</>}
          </button>

          {/* Amplify button */}
          {done ? (
            <div className="w-full py-3.5 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center gap-2 text-green-700 font-bold">
              <Check size={18}/> Amplified to {selectedCount} platform{selectedCount !== 1 ? 's' : ''}!
            </div>
          ) : (
            <button
              onClick={handleAmplify}
              disabled={sharing || selectedCount === 0}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-violet-600 hover:from-teal-600 hover:to-violet-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sharing ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Opening platforms…
                </>
              ) : (
                <>
                  <Zap size={18}/>
                  {selectedCount === 0 ? 'Select at least one platform' : `Amplify to ${selectedCount} platform${selectedCount !== 1 ? 's' : ''}`}
                </>
              )}
            </button>
          )}

          {selectedCount > 1 && !done && (
            <p className="text-center text-xs text-slate-400 mt-2">
              Each platform opens in its own window
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmplifyModal;