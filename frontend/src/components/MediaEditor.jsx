// Media Editor Component
// Allows users to edit photos, videos, and audio before uploading
// - Photos: Crop, rotate, brightness/contrast adjustments
// - Videos: Trim start/end with preview
// - Audio: Trim with waveform visualization

import React, { useState, useRef, useEffect } from 'react';
import {
  Check, RotateCw, RotateCcw, Sun, Contrast, Crop,
  Play, Pause, SkipBack, SkipForward, Scissors, Volume2,
  ZoomIn, RefreshCw, FlipHorizontal, FlipVertical, Loader2, Square
} from 'lucide-react';

// ============================================
// IMAGE EDITOR WITH CROP
// ============================================
function ImageEditor({ file, preview, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [image, setImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropAspect, setCropAspect] = useState('free'); // 'free', '1:1', '4:3', '16:9'

  // Load image from file or preview
  useEffect(() => {
    setLoading(true);
    setError(null);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setImage(img);
      setLoading(false);
    };

    img.onerror = (err) => {
      console.error('Failed to load image:', err);
      setError('Failed to load image');
      setLoading(false);
    };

    if (preview) {
      img.src = preview;
    } else if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  }, [file, preview]);

  // Draw image on canvas with transformations
  useEffect(() => {
    if (!image || !canvasRef.current || loading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const isRotated = rotation === 90 || rotation === 270;
    const displayWidth = isRotated ? image.height : image.width;
    const displayHeight = isRotated ? image.width : image.height;

    const scale = Math.min(380 / displayWidth, 260 / displayHeight, 1);
    canvas.width = displayWidth * scale;
    canvas.height = displayHeight * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    const drawWidth = image.width * scale * (zoom / 100);
    const drawHeight = image.height * scale * (zoom / 100);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    // Draw crop overlay if in crop mode
    if (cropMode && cropStart && cropEnd) {
      const x = Math.min(cropStart.x, cropEnd.x);
      const y = Math.min(cropStart.y, cropEnd.y);
      const w = Math.abs(cropEnd.x - cropStart.x);
      const h = Math.abs(cropEnd.y - cropStart.y);

      // Darken areas outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, y); // Top
      ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h); // Bottom
      ctx.fillRect(0, y, x, h); // Left
      ctx.fillRect(x + w, y, canvas.width - x - w, h); // Right

      // Draw crop border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);

      // Draw corner handles
      ctx.fillStyle = '#fff';
      const handleSize = 8;
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      });
    }
  }, [image, rotation, flipH, flipV, brightness, contrast, zoom, loading, cropMode, cropStart, cropEnd]);

  const handleMouseDown = (e) => {
    if (!cropMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    let y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    // Apply aspect ratio constraints
    if (cropAspect !== 'free' && cropStart) {
      const ratios = { '1:1': 1, '4:3': 4/3, '16:9': 16/9 };
      const ratio = ratios[cropAspect];
      const width = x - cropStart.x;
      const height = Math.abs(width) / ratio;
      y = cropStart.y + (width > 0 ? height : -height);
    }

    setCropEnd({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const applyCrop = () => {
    if (!cropStart || !cropEnd || !image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;

    const x = Math.min(cropStart.x, cropEnd.x) * scaleX;
    const y = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const w = Math.abs(cropEnd.x - cropStart.x) * scaleX;
    const h = Math.abs(cropEnd.y - cropStart.y) * scaleY;

    if (w < 10 || h < 10) {
      setCropMode(false);
      setCropStart(null);
      setCropEnd(null);
      return;
    }

    // Create cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(image, x, y, w, h, 0, 0, w, h);

    // Create new image from cropped canvas
    const croppedImg = new window.Image();
    croppedImg.onload = () => {
      setImage(croppedImg);
      setCropMode(false);
      setCropStart(null);
      setCropEnd(null);
    };
    croppedImg.src = cropCanvas.toDataURL();
  };

  const handleRotateRight = () => setRotation((r) => (r + 90) % 360);
  const handleRotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const handleFlipH = () => setFlipH((f) => !f);
  const handleFlipV = () => setFlipV((f) => !f);
  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setZoom(100);
    setCropMode(false);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleSave = async () => {
    if (!image) return;
    setProcessing(true);

    try {
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');

      const isRotated = rotation === 90 || rotation === 270;
      exportCanvas.width = isRotated ? image.height : image.width;
      exportCanvas.height = isRotated ? image.width : image.height;

      ctx.translate(exportCanvas.width / 2, exportCanvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(image, -image.width / 2, -image.height / 2);

      const mimeType = file.type || 'image/png';
      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            const editedFile = new File([blob], file.name, { type: mimeType });
            const editedPreview = exportCanvas.toDataURL(mimeType);
            onSave(editedFile, editedPreview);
          } else {
            setError('Failed to save image');
          }
          setProcessing(false);
        },
        mimeType,
        0.92
      );
    } catch (err) {
      console.error('Error saving image:', err);
      setError('Failed to save image');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 size={48} className="animate-spin text-purple-600 mb-4" />
        <p className="text-slate-600">Loading image...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Canvas */}
      <div
        ref={containerRef}
        className="bg-slate-900 rounded-xl p-4 flex items-center justify-center min-h-[280px]"
      >
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-[260px] rounded-lg ${cropMode ? 'cursor-crosshair' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Crop Mode Controls */}
      {cropMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-purple-900">Crop Mode</span>
            <div className="flex gap-2">
              {['free', '1:1', '4:3', '16:9'].map((aspect) => (
                <button
                  key={aspect}
                  onClick={() => setCropAspect(aspect)}
                  className={`px-2 py-1 text-xs rounded ${
                    cropAspect === aspect
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-600 border border-purple-300'
                  }`}
                >
                  {aspect === 'free' ? 'Free' : aspect}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-purple-700 mb-3">Click and drag on the image to select crop area</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCropMode(false);
                setCropStart(null);
                setCropEnd(null);
              }}
              className="flex-1 px-3 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-100"
            >
              Cancel Crop
            </button>
            <button
              onClick={applyCrop}
              disabled={!cropStart || !cropEnd}
              className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              Apply Crop
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!cropMode && (
        <div className="bg-slate-100 rounded-xl p-4 space-y-4">
          {/* Tools Row */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCropMode(true)}
              className="p-2 bg-white rounded-lg hover:bg-purple-100 transition-colors"
              title="Crop"
            >
              <Crop size={20} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <button
              onClick={handleRotateLeft}
              className="p-2 bg-white rounded-lg hover:bg-slate-200 transition-colors"
              title="Rotate Left"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={handleRotateRight}
              className="p-2 bg-white rounded-lg hover:bg-slate-200 transition-colors"
              title="Rotate Right"
            >
              <RotateCw size={20} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <button
              onClick={handleFlipH}
              className={`p-2 rounded-lg transition-colors ${flipH ? 'bg-purple-600 text-white' : 'bg-white hover:bg-slate-200'}`}
              title="Flip Horizontal"
            >
              <FlipHorizontal size={20} />
            </button>
            <button
              onClick={handleFlipV}
              className={`p-2 rounded-lg transition-colors ${flipV ? 'bg-purple-600 text-white' : 'bg-white hover:bg-slate-200'}`}
              title="Flip Vertical"
            >
              <FlipVertical size={20} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <button
              onClick={handleReset}
              className="p-2 bg-white rounded-lg hover:bg-slate-200 transition-colors"
              title="Reset"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Brightness */}
          <div className="flex items-center gap-3">
            <Sun size={18} className="text-slate-500" />
            <span className="text-sm text-slate-600 w-20">Brightness</span>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-sm text-slate-600 w-12 text-right">{brightness}%</span>
          </div>

          {/* Contrast */}
          <div className="flex items-center gap-3">
            <Contrast size={18} className="text-slate-500" />
            <span className="text-sm text-slate-600 w-20">Contrast</span>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-sm text-slate-600 w-12 text-right">{contrast}%</span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomIn size={18} className="text-slate-500" />
            <span className="text-sm text-slate-600 w-20">Zoom</span>
            <input
              type="range"
              min="50"
              max="200"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-sm text-slate-600 w-12 text-right">{zoom}%</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!cropMode && (
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check size={18} />
                Apply Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// VIDEO EDITOR
// ============================================
function VideoEditor({ file, onSave, onCancel }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setError('No video file provided');
      setLoading(false);
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (isFinite(dur) && dur > 0) {
        setDuration(dur);
        setTrimEnd(dur);
        setLoading(false);
      }
    }
  };

  const handleError = () => {
    setError('Failed to load video');
    setLoading(false);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      if (time >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        if (currentTime < trimStart || currentTime >= trimEnd) {
          videoRef.current.currentTime = trimStart;
        }
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleTrimStartChange = (value) => {
    const newStart = Math.min(value, trimEnd - 0.5);
    setTrimStart(Math.max(0, newStart));
    if (videoRef.current && currentTime < newStart) {
      videoRef.current.currentTime = newStart;
    }
  };

  const handleTrimEndChange = (value) => {
    const newEnd = Math.max(value, trimStart + 0.5);
    setTrimEnd(Math.min(duration, newEnd));
    if (videoRef.current && currentTime > newEnd) {
      videoRef.current.currentTime = trimStart;
    }
  };

  const handleSave = () => {
    setProcessing(true);
    const trimMetadata = {
      originalFile: file,
      trimStart,
      trimEnd,
      duration: trimEnd - trimStart
    };
    onSave(file, videoUrl, trimMetadata);
    setProcessing(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-xl p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={32} className="animate-spin text-white" />
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          onError={handleError}
          className={`w-full max-h-[220px] rounded-lg ${loading ? 'hidden' : ''}`}
          playsInline
        />
      </div>

      {!loading && (
        <>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = trimStart; }}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={togglePlay}
              className="p-4 bg-purple-600 text-white rounded-full hover:bg-purple-700"
            >
              {playing ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(currentTime + 1, trimEnd); }}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{formatTime(currentTime)}</span>
              <span>Duration: {formatTime(trimEnd - trimStart)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="relative h-12 bg-slate-200 rounded-lg overflow-hidden">
              <div
                className="absolute h-full bg-purple-200"
                style={{
                  left: `${(trimStart / duration) * 100}%`,
                  width: `${((trimEnd - trimStart) / duration) * 100}%`
                }}
              />
              <div
                className="absolute w-0.5 h-full bg-purple-600 z-10"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-3 bg-green-500 cursor-ew-resize rounded-l-lg flex items-center justify-center"
                style={{ left: `calc(${(trimStart / duration) * 100}% - 6px)` }}
              >
                <div className="w-0.5 h-4 bg-white rounded" />
              </div>
              <div
                className="absolute top-0 bottom-0 w-3 bg-red-500 cursor-ew-resize rounded-r-lg flex items-center justify-center"
                style={{ left: `${(trimEnd / duration) * 100}%` }}
              >
                <div className="w-0.5 h-4 bg-white rounded" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start: {formatTime(trimStart)}
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => handleTrimStartChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  <button
                    onClick={() => setTrimStart(currentTime)}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                  >
                    Set
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End: {formatTime(trimEnd)}
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => handleTrimEndChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <button
                    onClick={() => setTrimEnd(currentTime)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={processing}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Scissors size={18} />
              Apply Trim ({formatTime(trimEnd - trimStart)})
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// AUDIO EDITOR
// ============================================
function AudioEditor({ file, onSave, onCancel }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  const [volume, setVolume] = useState(100);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setError('No audio file provided');
      setLoading(false);
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const generateWaveform = async () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);
            const samples = 150;
            const blockSize = Math.floor(channelData.length / samples);
            const waveform = [];

            for (let i = 0; i < samples; i++) {
              let sum = 0;
              for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[i * blockSize + j] || 0);
              }
              waveform.push(sum / blockSize);
            }

            const max = Math.max(...waveform, 0.01);
            setWaveformData(waveform.map(v => v / max));
            setLoading(false);
            audioContext.close();
          } catch {
            setWaveformData(new Array(150).fill(0.5));
            setLoading(false);
          }
        };

        reader.onerror = () => {
          setWaveformData(new Array(150).fill(0.5));
          setLoading(false);
        };

        reader.readAsArrayBuffer(file);
      } catch {
        setWaveformData(new Array(150).fill(0.5));
        setLoading(false);
      }
    };

    generateWaveform();

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0 || duration === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    const startX = (trimStart / duration) * width;
    const endX = (trimEnd / duration) * width;
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(startX, 0, endX - startX, height);

    const barWidth = width / waveformData.length;
    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * (height - 10);
      const y = (height - barHeight) / 2;
      const position = index / waveformData.length;
      const isInRange = position >= trimStart / duration && position <= trimEnd / duration;
      ctx.fillStyle = isInRange ? '#9333ea' : '#cbd5e1';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    const posX = (currentTime / duration) * width;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(posX, 0);
    ctx.lineTo(posX, height);
    ctx.stroke();
  }, [waveformData, trimStart, trimEnd, currentTime, duration]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (isFinite(dur) && dur > 0) {
        setDuration(dur);
        setTrimEnd(dur);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      if (time >= trimEnd) {
        audioRef.current.currentTime = trimStart;
        if (!playing) audioRef.current.pause();
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        if (currentTime < trimStart || currentTime >= trimEnd) {
          audioRef.current.currentTime = trimStart;
        }
        audioRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value / 100;
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !audioRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, (x / rect.width) * duration));
  };

  const handleSave = () => {
    setProcessing(true);
    const trimMetadata = {
      originalFile: file,
      trimStart,
      trimEnd,
      duration: trimEnd - trimStart,
      volume: volume / 100
    };
    onSave(file, audioUrl, trimMetadata);
    setProcessing(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />

      <div className="bg-slate-900 rounded-xl p-4">
        {loading ? (
          <div className="h-[100px] flex items-center justify-center text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Loading audio...
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={400}
            height={100}
            onClick={handleCanvasClick}
            className="w-full h-[100px] rounded-lg cursor-pointer"
          />
        )}
      </div>

      {!loading && (
        <>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => { if (audioRef.current) audioRef.current.currentTime = trimStart; }}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={togglePlay}
              className="p-4 bg-purple-600 text-white rounded-full hover:bg-purple-700"
            >
              {playing ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button
              onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(currentTime + 1, trimEnd); }}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{formatTime(currentTime)}</span>
              <span>Trimmed: {formatTime(trimEnd - trimStart)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start: {formatTime(trimStart)}
                </label>
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.1"
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.5))}
                  className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End: {formatTime(trimEnd)}
                </label>
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.1"
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
                  className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Volume2 size={18} className="text-slate-500" />
              <span className="text-sm text-slate-600 w-16">Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <span className="text-sm text-slate-600 w-12 text-right">{volume}%</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={processing}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Scissors size={18} />
              Apply Trim ({formatTime(trimEnd - trimStart)})
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// MAIN MEDIA EDITOR COMPONENT
// ============================================
export default function MediaEditor({ file, preview, onSave, onCancel }) {
  if (!file) {
    return (
      <div className="text-center py-8 text-slate-500">
        No file selected for editing
      </div>
    );
  }

  const fileType = file.type?.split('/')[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-900">
          Edit {fileType === 'image' ? 'Image' : fileType === 'video' ? 'Video' : 'Audio'}
        </h3>
        <span className="text-sm text-slate-500 truncate max-w-[200px]">{file.name}</span>
      </div>

      {fileType === 'image' && (
        <ImageEditor file={file} preview={preview} onSave={onSave} onCancel={onCancel} />
      )}

      {fileType === 'video' && (
        <VideoEditor file={file} onSave={onSave} onCancel={onCancel} />
      )}

      {fileType === 'audio' && (
        <AudioEditor file={file} onSave={onSave} onCancel={onCancel} />
      )}

      {!['image', 'video', 'audio'].includes(fileType) && (
        <div className="text-center py-8">
          <p className="text-slate-500 mb-4">This file type ({fileType || 'unknown'}) cannot be edited</p>
          <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}
