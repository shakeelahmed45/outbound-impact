import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Paperclip, X, Download,
  Music, FileText, Link
} from 'lucide-react';
import axios from 'axios';
import useBrandColors from '../hooks/useBrandColors';

const isNonEmbeddablePlatform = (url) => {
  if (!url) return { blocked: false };
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.me'))
    return { platform: 'Facebook', blocked: true };
  if (url.includes('instagram.com'))
    return { platform: 'Instagram', blocked: true };
  if (url.includes('twitter.com') || url.includes('x.com'))
    return { platform: 'Twitter/X', blocked: true };
  return { blocked: false };
};

const convertToEmbedUrl = (url) => {
  if (!url) return url;
  if (url.includes('youtube.com/shorts/') || url.includes('youtu.be/shorts/')) {
    const id = url.split('/shorts/')[1]?.split('?')[0]?.split('&')[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtu.be/') && !url.includes('/shorts/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtube.com/watch')) {
    const id = new URLSearchParams(url.split('?')[1]).get('v');
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtube.com/embed/')) return url;
  if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
    const id = url.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
    if (id) return `https://player.vimeo.com/video/${id}`;
  }
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  if (url.includes('drive.google.com/open?id=')) {
    const id = new URLSearchParams(url.split('?')[1]).get('id');
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  if (url.includes('docs.google.com/document/d/') && !url.includes('/preview')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    if (id) return `https://docs.google.com/document/d/${id}/preview`;
  }
  if (url.includes('docs.google.com/spreadsheets/d/') && !url.includes('/preview')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    if (id) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  }
  if (url.includes('docs.google.com/presentation/d/') && !url.includes('/preview')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    if (id) return `https://docs.google.com/presentation/d/${id}/preview`;
  }
  if (url.includes('soundcloud.com/') && !url.includes('api.soundcloud.com')) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
  }
  if (url.includes('open.spotify.com/')) {
    const match = url.match(/open\.spotify\.com\/(track|playlist|album|episode|show)\/([a-zA-Z0-9]+)/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
  }
  if (url.includes('dailymotion.com/video/')) {
    const id = url.split('/video/')[1]?.split('?')[0]?.split('_')[0];
    if (id) return `https://www.dailymotion.com/embed/video/${id}`;
  }
  if (url.includes('twitch.tv/videos/')) {
    const id = url.split('/videos/')[1]?.split('?')[0];
    if (id) return `https://player.twitch.tv/?video=${id}&parent=${window.location.hostname}`;
  }
  if (url.includes('twitch.tv/') && url.includes('/clip/')) {
    const id = url.split('/clip/')[1]?.split('?')[0];
    if (id) return `https://clips.twitch.tv/embed?clip=${id}&parent=${window.location.hostname}`;
  }
  return url;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

// ── Shared info card (description + attachments + CTA button) ────────────────
const InfoCard = ({ item, onDocumentClick }) => {
  const hasAttachments = item.attachments && item.attachments.length > 0;
  const hasButton = item.buttonText && item.buttonUrl;
  if (!item.description && !hasAttachments && !hasButton) return null;
  return (
    <div className="w-full max-w-3xl mx-auto mt-4 sm:mt-6 px-4 pb-10">
      {item.description && (
        <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-5">{item.description}</p>
      )}
      {hasAttachments && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Paperclip size={13} /> Documents
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {item.attachments.map((doc, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); onDocumentClick(doc); }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
                  <Paperclip size={16} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(doc.size)}</p>
                </div>
                <ExternalLink size={15} className="text-gray-500 group-hover:text-white flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
      {hasButton && (
        <a href={item.buttonUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl text-white font-bold text-sm sm:text-base transition-all hover:opacity-90 active:scale-95 shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
          <ExternalLink size={18} /> {item.buttonText}
        </a>
      )}
    </div>
  );
};

// ── Title strip ───────────────────────────────────────────────────────────────
const TitleStrip = ({ title }) => (
  <div className="w-full max-w-3xl mx-auto px-4 pt-5">
    <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">{title}</h1>
  </div>
);

// ── Document modal ────────────────────────────────────────────────────────────
const DocumentModal = ({ doc, onClose }) => (
  <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
    <div className="relative bg-[#111827] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 sm:p-5 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Paperclip size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold truncate text-sm sm:text-base">{doc.name}</p>
            <p className="text-white/70 text-xs">{formatSize(doc.size)}</p>
          </div>
        </div>
        <button onClick={onClose}
          className="ml-3 w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0">
          <X size={18} className="text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {doc.type?.includes('image') ? (
          <img src={doc.url} alt={doc.name} className="w-full h-auto" />
        ) : doc.type?.includes('pdf') ? (
          <iframe src={doc.url} className="w-full" style={{ height: 'calc(90vh - 140px)' }} title={doc.name} />
        ) : (
          <div className="p-12 text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
              <Paperclip size={40} className="text-white" />
            </div>
            <p className="text-white font-bold text-xl mb-2">{doc.name}</p>
            <p className="text-gray-400 mb-6">Preview not available for this file type</p>
            <a href={doc.url} download target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
              <Download size={18} /> Download File
            </a>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 bg-[#1f2937] border-t border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <button onClick={onClose}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-all">
          Close
        </button>
        <a href={doc.url} download target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
          <Download size={16} /> Download
        </a>
      </div>
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const PublicViewer = () => {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const [item, setItem]                         = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const hasTracked = useRef(false);

  useBrandColors(item?.userId);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(import.meta.env.VITE_API_URL + '/items/public/' + slug);
        if (res.data.status === 'success') {
          setItem(res.data.item);
          if (!hasTracked.current) {
            hasTracked.current = true;
            const p = new URLSearchParams(window.location.search);
            const source = p.get('source') || p.get('s') || 'direct';
            axios.post(import.meta.env.VITE_API_URL + '/analytics/track', { slug, source }).catch(() => {});
          }
        }
      } catch { setError('not found'); }
      finally  { setLoading(false); }
    })();
  }, [slug]);

  const handleBack = () => {
    const p = new URLSearchParams(window.location.search);
    const from = p.get('from');
    if (from) { navigate(p.get('preview') === 'true' ? `/c/${from}?preview=true` : `/c/${from}`); return; }
    if (window.opener && !window.opener.closed) { window.opener.focus(); window.close(); return; }
    navigate('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-white/60 animate-spin" />
        <p className="text-white/40 text-sm">Loading…</p>
      </div>
    </div>
  );

  if (error || !item) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">❌</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Content Not Found</h1>
        <p className="text-gray-400 mb-6 text-sm">This content doesn't exist or has been removed.</p>
        <button onClick={handleBack}
          className="px-6 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all">
          Go Back
        </button>
      </div>
    </div>
  );

  // Sticky top nav
  const NavBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3
      bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
      <button onClick={handleBack}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20
          text-white text-sm font-semibold transition-all">
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Back</span>
      </button>
      <h2 className="text-white text-sm font-semibold truncate flex-1 opacity-80">{item.title}</h2>
    </div>
  );

  // ── IMAGE ──────────────────────────────────────────────────────────────────
  if (item.type === 'IMAGE') return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <NavBar />
      <div className="flex-1 flex flex-col items-center pt-14 pb-4">
        <div className="w-full max-w-4xl">
          <img src={item.mediaUrl} alt={item.title}
            className="w-full object-contain"
            style={{ maxHeight: '70vh' }}
            onError={(e) => {
              if (e.target.src.includes('maxresdefault'))
                e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
              else e.target.style.display = 'none';
            }}
          />
        </div>
        <TitleStrip title={item.title} />
        <InfoCard item={item} onDocumentClick={setSelectedDocument} />
      </div>
      {selectedDocument && <DocumentModal doc={selectedDocument} onClose={() => setSelectedDocument(null)} />}
    </div>
  );

  // ── VIDEO ──────────────────────────────────────────────────────────────────
  if (item.type === 'VIDEO') return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <NavBar />
      <div className="flex-1 flex flex-col items-center pt-14">
        <div className="w-full max-w-4xl">
          <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
            <video controls autoPlay
              className="absolute inset-0 w-full h-full">
              <source src={item.mediaUrl} />
            </video>
          </div>
        </div>
        <TitleStrip title={item.title} />
        <InfoCard item={item} onDocumentClick={setSelectedDocument} />
      </div>
      {selectedDocument && <DocumentModal doc={selectedDocument} onClose={() => setSelectedDocument(null)} />}
    </div>
  );

  // ── AUDIO ──────────────────────────────────────────────────────────────────
  if (item.type === 'AUDIO') return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center pt-20 pb-8 px-4">
      <NavBar />
      <div className="w-full max-w-md mt-4">
        <div className="rounded-3xl p-8 text-center mb-4 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
          <div className="w-28 h-28 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-6">
            <Music size={52} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{item.title}</h1>
          {item.description && (
            <p className="text-white/70 text-sm mb-4 leading-relaxed">{item.description}</p>
          )}
          <audio controls className="w-full mt-4"><source src={item.mediaUrl} /></audio>
        </div>
        <InfoCard item={{ ...item, description: null }} onDocumentClick={setSelectedDocument} />
      </div>
      {selectedDocument && <DocumentModal doc={selectedDocument} onClose={() => setSelectedDocument(null)} />}
    </div>
  );

  // ── TEXT ───────────────────────────────────────────────────────────────────
  if (item.type === 'TEXT') return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center pt-20 pb-10 px-4">
      <NavBar />
      <div className="w-full max-w-2xl mt-4">
        <div className="bg-[#111827] rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full"
            style={{ background: 'linear-gradient(to right, var(--brand-primary), var(--brand-secondary))' }} />
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
                <FileText size={18} className="text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight pt-1">{item.title}</h1>
            </div>
            <div className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-6 border-t border-white/10 pt-5">
              {item.mediaUrl || 'No content available'}
            </div>
            {(item.attachments?.length > 0 || (item.buttonText && item.buttonUrl)) && (
              <div className="border-t border-white/10 pt-5 space-y-4">
                {item.attachments?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Paperclip size={12} /> Documents
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.attachments.map((doc, i) => (
                        <button key={i} onClick={() => setSelectedDocument(doc)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left group">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
                            <Paperclip size={14} className="text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400">{formatSize(doc.size)}</p>
                          </div>
                          <ExternalLink size={13} className="text-gray-500 group-hover:text-white flex-shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {item.buttonText && item.buttonUrl && (
                  <a href={item.buttonUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
                    <ExternalLink size={16} /> {item.buttonText}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedDocument && <DocumentModal doc={selectedDocument} onClose={() => setSelectedDocument(null)} />}
    </div>
  );

  // ── EMBED ──────────────────────────────────────────────────────────────────
  if (item.type === 'EMBED') {
    const embedCheck = isNonEmbeddablePlatform(item.mediaUrl);
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <NavBar />
        <div className="flex-1 flex flex-col items-center pt-14">
          <div className="w-full max-w-4xl">
            {embedCheck.blocked ? (
              <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-[#111827]">
                <div className="h-1.5 w-full"
                  style={{ background: 'linear-gradient(to right, var(--brand-primary), var(--brand-secondary))' }} />
                <div className="p-10 sm:p-16 text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
                    <Link size={34} className="text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{item.title}</h3>
                  {item.description && (
                    <p className="text-gray-400 text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm mb-8">
                    {embedCheck.platform} doesn't allow external embedding. View it directly below.
                  </p>
                  <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-sm sm:text-base shadow-xl transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
                    <ExternalLink size={18} /> View on {embedCheck.platform}
                  </a>
                </div>
              </div>
            ) : (
              <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={convertToEmbedUrl(item.mediaUrl)}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                  title={item.title}
                  loading="lazy"
                />
              </div>
            )}
          </div>
          {/* Title row with Open button */}
          <div className="w-full max-w-4xl px-4 mt-4 flex items-start justify-between gap-3">
            <h1 className="text-base sm:text-lg font-bold text-white leading-snug flex-1">{item.title}</h1>
            <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all">
              <ExternalLink size={13} /> Open
            </a>
          </div>
          <InfoCard item={item} onDocumentClick={setSelectedDocument} />
        </div>
        {selectedDocument && <DocumentModal doc={selectedDocument} onClose={() => setSelectedDocument(null)} />}
      </div>
    );
  }

  // ── FALLBACK ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <NavBar />
      <div className="bg-[#111827] rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
          <FileText size={36} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
        {item.description && <p className="text-gray-400 text-sm mb-6">{item.description}</p>}
        <a href={item.mediaUrl} download
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>
          <Download size={18} /> Download File
        </a>
      </div>
    </div>
  );
};

export default PublicViewer;