// ShareReceivePage.jsx
// This page receives content shared TO OI from the phone's share sheet.
// Flow:
//   1. Phone share menu → OI → this page loads with shared data
//   2. User reviews title/caption and hits "Post to OI"
//   3. Content uploads to OI
//   4. Amplify modal appears asking "Also share to Facebook, LinkedIn etc?"
//   5. User picks platforms, tabs open pre-filled, done.

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload, Image, Video, Music, Link, FileText,
  Loader2, Check, AlertCircle, ArrowRight, X
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import AmplifyModal from '../components/AmplifyModal';

const ShareReceivePage = () => {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuthStore();

  // Shared data from query params
  const sharedTitle    = searchParams.get('title') || '';
  const sharedText     = searchParams.get('text')  || '';
  const sharedUrl      = searchParams.get('url')   || '';
  const hasFile        = searchParams.get('hasFile') === '1';
  const fileType       = searchParams.get('fileType') || '';
  const fileName       = searchParams.get('fileName') || '';
  const hasError       = searchParams.get('error') === '1';

  // Form state
  const [title,       setTitle]       = useState(sharedTitle || sharedText.slice(0, 80) || '');
  const [description, setDescription] = useState(sharedText || '');
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [campaigns,   setCampaigns]   = useState([]);
  const [campaignId,  setCampaignId]  = useState('');

  // Upload state
  const [uploading,  setUploading]   = useState(false);
  const [progress,   setProgress]    = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadedItem, setUploadedItem] = useState(null); // after successful upload

  // Amplify modal
  const [showAmplify, setShowAmplify] = useState(false);

  const fileRef = useRef(null);

  // ── Detect content type ───────────────────────────────────────
  const isVideo  = fileType.startsWith('video/');
  const isAudio  = fileType.startsWith('audio/');
  const isImage  = fileType.startsWith('image/');
  const isLink   = !hasFile && (sharedUrl || sharedText?.startsWith('http'));
  const isText   = !hasFile && !isLink;

  const contentType = hasFile
    ? (isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : 'IMAGE')
    : isLink ? 'EMBED' : 'TEXT';

  const ContentIcon = isVideo ? Video
    : isAudio ? Music
    : isImage ? Image
    : isLink  ? Link
    : FileText;

  const contentLabel = isVideo ? 'Video' : isAudio ? 'Audio'
    : isImage ? 'Image' : isLink ? 'Link' : 'Text post';

  // ── Load shared file from SW cache ────────────────────────────
  useEffect(() => {
    if (!hasFile) return;
    (async () => {
      try {
        const cache    = await caches.open('share-target-v1');
        const response = await cache.match('/share-target-file');
        if (!response) return;
        const blob = await response.blob();
        const f    = new File([blob], fileName || 'shared-file', { type: fileType || blob.type });
        setFile(f);
        if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
          setPreview(URL.createObjectURL(f));
        }
        await cache.delete('/share-target-file');
      } catch (err) {
        console.error('Failed to load shared file:', err);
      }
    })();
  }, [hasFile, fileType, fileName]);

  // ── Load campaigns ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api.get('/campaigns').then(res => {
      const list = res.data.campaigns || [];
      setCampaigns(list);
      if (list.length > 0) setCampaignId(list[0].id);
    }).catch(() => {});
  }, [token]);

  // ── Redirect to login if not authenticated ────────────────────
  useEffect(() => {
    if (!token) {
      // Save share data so we can restore after login
      sessionStorage.setItem('pendingShare', JSON.stringify({
        title: sharedTitle, text: sharedText, url: sharedUrl
      }));
      navigate('/signin', { replace: true });
    }
  }, [token]);

  // ── Handle upload ─────────────────────────────────────────────
  const handlePost = async () => {
    if (!title.trim()) { setUploadError('Please add a title.'); return; }
    setUploading(true);
    setUploadError('');
    setProgress(0);

    try {
      let response;

      if (hasFile && file) {
        // ── File upload ──────────────────────────────────────────
        const formData = new FormData();
        formData.append('file',          file);
        formData.append('title',         title.trim());
        formData.append('description',   description.trim());
        formData.append('type',          contentType);
        formData.append('sharingEnabled', 'true');
        if (campaignId) formData.append('campaignId', campaignId);

        response = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / (e.total || 1)));
          },
        });

      } else if (isLink) {
        // ── Embed / link ──────────────────────────────────────────
        response = await api.post('/upload/embed', {
          title:         title.trim(),
          description:   description.trim(),
          embedUrl:      sharedUrl || sharedText,
          sharingEnabled: true,
          campaignId:    campaignId || undefined,
        });

      } else {
        // ── Text post ─────────────────────────────────────────────
        response = await api.post('/upload/text', {
          title:         title.trim(),
          content:       description.trim() || title.trim(),
          sharingEnabled: true,
          campaignId:    campaignId || undefined,
        });
      }

      if (response.data?.status === 'success' || response.data?.item) {
        const item = response.data.item || response.data;
        setUploadedItem(item);
        setProgress(100);
        // Show Amplify modal after a brief success moment
        setTimeout(() => setShowAmplify(true), 800);
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Share post error:', err);
      setUploadError(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Not authenticated (redirect handled in useEffect) ─────────
  if (!token) return null;

  // ── Success + Amplify done ────────────────────────────────────
  if (uploadedItem && !showAmplify) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-violet-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600"/>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Posted to Outbound Impact!</h2>
          <p className="text-slate-500 text-sm mb-6">Your content is live and ready to share.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowAmplify(true)}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 flex items-center justify-center gap-2"
            >
              Amplify to Social Media <ArrowRight size={18}/>
            </button>
            <button
              onClick={() => navigate('/dashboard/items')}
              className="w-full py-3 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50"
            >
              Go to My Items
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-violet-50 flex flex-col">

      {/* Amplify Modal — shown after successful upload */}
      {showAmplify && uploadedItem && (
        <AmplifyModal
          item={uploadedItem}
          onClose={() => navigate('/dashboard/items')}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="OI" className="w-8 h-8 object-contain"
            onError={e => e.target.style.display = 'none'}/>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">Post to Outbound Impact</h1>
            <p className="text-xs text-slate-500">Shared {contentLabel}</p>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard')}
          className="text-slate-400 hover:text-slate-600 p-2">
          <X size={20}/>
        </button>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-5">

        {/* Error state */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-semibold text-red-800 text-sm">Couldn't receive the shared content</p>
              <p className="text-red-600 text-xs mt-1">Try sharing again from your other app.</p>
            </div>
          </div>
        )}

        {/* Content preview */}
        {preview && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            {isVideo ? (
              <video src={preview} className="w-full max-h-64 object-cover" controls/>
            ) : (
              <img src={preview} alt="Shared content" className="w-full max-h-64 object-cover"/>
            )}
          </div>
        )}

        {/* Link preview */}
        {isLink && !preview && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Link size={18} className="text-violet-600"/>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{sharedUrl || sharedText}</p>
              <p className="text-xs text-slate-400">Will be saved as an embed</p>
            </div>
          </div>
        )}

        {/* Content type badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
            <ContentIcon size={14} className="text-violet-600"/>
            <span className="text-xs font-semibold text-slate-700">{contentLabel}</span>
          </div>
          {file && (
            <span className="text-xs text-slate-400">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setUploadError(''); }}
            placeholder="Give this post a title…"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none bg-white"
          />
        </div>

        {/* Description / caption */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Caption / Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description or caption…"
            rows={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none resize-none bg-white"
          />
        </div>

        {/* Campaign selector */}
        {campaigns.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Add to Campaign (optional)
            </label>
            <select
              value={campaignId}
              onChange={e => setCampaignId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-400 outline-none"
            >
              <option value="">No campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0"/>
            <p className="text-sm text-red-700 font-medium">{uploadError}</p>
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-violet-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Post button */}
        <button
          onClick={handlePost}
          disabled={uploading || !!uploadedItem || !title.trim()}
          className="w-full py-4 bg-gradient-to-r from-teal-500 to-violet-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
        >
          {uploading ? (
            <><Loader2 size={20} className="animate-spin"/> Posting to OI…</>
          ) : uploadedItem ? (
            <><Check size={20}/> Posted!</>
          ) : (
            <><Upload size={20}/> Post to Outbound Impact</>
          )}
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 text-slate-500 text-sm font-semibold hover:text-slate-700"
        >
          Cancel — go to dashboard
        </button>
      </div>
    </div>
  );
};

export default ShareReceivePage;