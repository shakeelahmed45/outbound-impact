// CampaignUploadModal.jsx
// Direct upload from a campaign/stream card.
// Lets users upload content and auto-assigns it to the selected campaign.
// Supports: Image, Video, Audio, Text post, Embed/Link

import { useState, useRef } from 'react';
import {
  X, Upload, Image as ImageIcon, Video, Music, FileText,
  Link, Loader2, Check, AlertCircle, Folder, ChevronDown
} from 'lucide-react';
import api from '../services/api';

// ── Content type config ──────────────────────────────────────
const TYPES = [
  { id: 'IMAGE', label: 'Image',  icon: ImageIcon, accept: 'image/*',       color: 'text-blue-600',   bg: 'bg-blue-50' },
  { id: 'VIDEO', label: 'Video',  icon: Video,     accept: 'video/*',       color: 'text-violet-600', bg: 'bg-violet-50' },
  { id: 'AUDIO', label: 'Audio',  icon: Music,     accept: 'audio/*',       color: 'text-green-600',  bg: 'bg-green-50' },
  { id: 'TEXT',  label: 'Text',   icon: FileText,  accept: null,            color: 'text-amber-600',  bg: 'bg-amber-50' },
  { id: 'EMBED', label: 'Link/Embed', icon: Link,  accept: null,            color: 'text-pink-600',   bg: 'bg-pink-50' },
];

const CampaignUploadModal = ({ campaign, labelSingle = 'campaign', onClose, onSuccess }) => {
  const [selectedType, setSelectedType] = useState('IMAGE');
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [embedUrl,     setEmbedUrl]     = useState('');
  const [textContent,  setTextContent]  = useState('');
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [error,        setError]        = useState('');
  const [done,         setDone]         = useState(false);

  const fileInputRef = useRef(null);
  const typeConfig   = TYPES.find(t => t.id === selectedType);
  const isFile       = selectedType === 'IMAGE' || selectedType === 'VIDEO' || selectedType === 'AUDIO';

  // ── File selection ───────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setTitle(prev => prev || f.name.replace(/\.[^.]+$/, ''));
    if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const input = fileInputRef.current;
    if (input) {
      const dt = new DataTransfer();
      dt.items.add(f);
      input.files = dt.files;
    }
    handleFileChange({ target: { files: [f] } });
  };

  // ── Type switch ──────────────────────────────────────────
  const switchType = (typeId) => {
    setSelectedType(typeId);
    setFile(null);
    setPreview(null);
    setEmbedUrl('');
    setTextContent('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Upload + assign ──────────────────────────────────────
  const handleUpload = async () => {
    if (!title.trim()) { setError('Please add a title.'); return; }

    if (isFile && !file) { setError('Please select a file to upload.'); return; }
    if (selectedType === 'EMBED' && !embedUrl.trim()) { setError('Please enter a URL.'); return; }
    if (selectedType === 'TEXT' && !textContent.trim()) { setError('Please enter some text content.'); return; }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      let uploadRes;

      if (isFile) {
        // ── FormData file upload ─────────────────────────
        const formData = new FormData();
        formData.append('file',          file);
        formData.append('title',         title.trim());
        formData.append('description',   description.trim());
        formData.append('type',          selectedType);
        formData.append('sharingEnabled', String(sharingEnabled));

        uploadRes = await api.post('/upload/file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / (e.total || 1)));
          },
        });

      } else if (selectedType === 'EMBED') {
        // ── Embed/Link upload ────────────────────────────
        uploadRes = await api.post('/upload/embed', {
          title:         title.trim(),
          description:   description.trim(),
          embedUrl:      embedUrl.trim(),
          sharingEnabled,
        });
        setProgress(60);

      } else {
        // ── Text post upload ─────────────────────────────
        uploadRes = await api.post('/upload/text', {
          title:         title.trim(),
          content:       textContent.trim(),
          sharingEnabled,
        });
        setProgress(60);
      }

      if (!uploadRes.data?.item && uploadRes.data?.status !== 'success') {
        throw new Error(uploadRes.data?.message || 'Upload failed');
      }

      const item = uploadRes.data.item;
      setProgress(80);

      // ── Auto-assign to this campaign ─────────────────
      await api.post('/campaigns/assign', {
        itemId:     item.id,
        campaignId: campaign.id,
      });

      setProgress(100);
      setDone(true);

      // Notify parent to refresh + close after short delay
      setTimeout(() => {
        onSuccess?.(item);
        onClose();
      }, 1200);

    } catch (err) {
      console.error('CampaignUpload error:', err);
      setError(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-secondary px-6 py-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload size={20} className="text-white"/>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">Upload to {labelSingle}</h2>
                <p className="text-white/75 text-xs mt-0.5 flex items-center gap-1">
                  <Folder size={11}/> {campaign.name}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
              <X size={20}/>
            </button>
          </div>
        </div>

        <div className="p-6 pb-8 space-y-5">

          {/* Content type selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Content Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TYPES.map(t => {
                const Icon = t.icon;
                const active = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchType(t.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                      active ? `border-primary ${t.bg}` : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Icon size={18} className={active ? t.color : 'text-slate-400'}/>
                    <span className={`text-[10px] font-bold leading-tight text-center ${active ? t.color : 'text-slate-400'}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File drop zone */}
          {isFile && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                File
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  file ? 'border-primary bg-purple-50' : 'border-slate-300 hover:border-primary bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={typeConfig.accept}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Preview */}
                {preview && selectedType === 'IMAGE' && (
                  <img src={preview} alt="preview" className="w-full max-h-48 object-cover rounded-xl"/>
                )}
                {preview && selectedType === 'VIDEO' && (
                  <video src={preview} className="w-full max-h-48 rounded-xl" controls/>
                )}

                {/* Drop area */}
                {!preview && (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    {file ? (
                      <>
                        <div className={`w-12 h-12 ${typeConfig.bg} rounded-xl flex items-center justify-center mb-3`}>
                          <typeConfig.icon size={24} className={typeConfig.color}/>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{file.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(file.size / (1024*1024)).toFixed(1)} MB</p>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-slate-300 mb-3"/>
                        <p className="text-slate-600 font-semibold text-sm">Drop file here or click to browse</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {selectedType === 'IMAGE' ? 'PNG, JPG, GIF, WebP'
                            : selectedType === 'VIDEO' ? 'MP4, MOV, WebM'
                            : 'MP3, WAV, M4A'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Change file button when preview shown */}
                {preview && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 rounded-xl transition-all flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">Click to change file</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Embed URL */}
          {selectedType === 'EMBED' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                URL / Link
              </label>
              <input
                type="url"
                value={embedUrl}
                onChange={e => { setEmbedUrl(e.target.value); setError(''); }}
                placeholder="https://youtube.com/watch?v=... or any URL"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          )}

          {/* Text content */}
          {selectedType === 'TEXT' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Text Content
              </label>
              <textarea
                value={textContent}
                onChange={e => { setTextContent(e.target.value); setError(''); }}
                placeholder="Write your text content here…"
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="Give this item a title…"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Sharing toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Public sharing</p>
              <p className="text-xs text-slate-500">Allow anyone with the link to view this item</p>
            </div>
            <button
              onClick={() => setSharingEnabled(p => !p)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                sharingEnabled ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                sharingEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}/>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0"/>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Progress bar */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload button */}
          {done ? (
            <div className="w-full py-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center gap-2 text-green-700 font-bold">
              <Check size={20}/> Uploaded & added to {campaign.name}!
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
            >
              {uploading ? (
                <><Loader2 size={20} className="animate-spin"/> Uploading…</>
              ) : (
                <><Upload size={20}/> Upload to {campaign.name}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignUploadModal;