const ffmpeg        = require('fluent-ffmpeg');
const ffmpegStatic  = require('ffmpeg-static');
const os            = require('os');
const path          = require('path');
const fs            = require('fs');

// Point fluent-ffmpeg at the bundled static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

// Video formats that benefit from faststart processing
const PROCESSABLE_VIDEO_EXTENSIONS = new Set([
  'mp4', 'm4v', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm',
]);

const isVideoFile = (fileName) => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return PROCESSABLE_VIDEO_EXTENSIONS.has(ext);
};

// ── Core processor ───────────────────────────────────────────

/**
 * Process a video buffer through FFmpeg:
 *   - Apply -movflags +faststart  (instant playback, no buffering)
 *   - Copy streams without re-encoding (fast, lossless, no quality loss)
 *   - Output as MP4
 *
 * @param {Buffer}  inputBuffer   — raw video file buffer
 * @param {string}  originalName  — used only to determine input format
 * @returns {Promise<{ success: boolean, buffer?: Buffer, fileName?: string, error?: string }>}
 */
const processVideo = (inputBuffer, originalName) => {
  return new Promise((resolve) => {
    const tmpDir    = os.tmpdir();
    const baseName  = path.basename(originalName, path.extname(originalName));
    const inputExt  = path.extname(originalName).toLowerCase() || '.mp4';
    const inputPath = path.join(tmpDir, `oi_input_${Date.now()}${inputExt}`);
    const outputPath= path.join(tmpDir, `oi_output_${Date.now()}.mp4`);

    console.log(`🎬 FFmpeg processing: ${originalName} (${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    const startTime = Date.now();

    // Write input buffer to temp file
    try {
      fs.writeFileSync(inputPath, inputBuffer);
    } catch (err) {
      console.error('❌ FFmpeg: failed to write temp input file:', err.message);
      return resolve({ success: false, error: err.message });
    }

    ffmpeg(inputPath)
      .outputOptions([
        '-movflags +faststart',   // ← Key: moves moov atom to front for instant play
        '-c:v copy',              // Copy video stream — no re-encode, no quality loss
        '-c:a copy',              // Copy audio stream — no re-encode
        '-avoid_negative_ts make_zero', // Fix some timestamp issues
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`🎬 FFmpeg command: ${cmd}`);
      })
      .on('end', () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        try {
          const outputBuffer = fs.readFileSync(outputPath);
          console.log(`✅ FFmpeg done in ${elapsed}s — ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB (faststart applied)`);

          // Cleanup temp files
          try { fs.unlinkSync(inputPath); } catch (_) {}
          try { fs.unlinkSync(outputPath); } catch (_) {}

          // Output filename is always .mp4
          const outName = `${baseName}.mp4`;
          resolve({ success: true, buffer: outputBuffer, fileName: outName });
        } catch (readErr) {
          console.error('❌ FFmpeg: failed to read output file:', readErr.message);
          resolve({ success: false, error: readErr.message });
        }
      })
      .on('error', (err) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`❌ FFmpeg error after ${elapsed}s:`, err.message);

        // Cleanup temp files
        try { fs.unlinkSync(inputPath); } catch (_) {}
        try { fs.unlinkSync(outputPath); } catch (_) {}

        // Don't fail the whole upload — return original buffer as fallback
        console.warn('⚠️  FFmpeg failed — uploading original file without faststart');
        resolve({ success: false, error: err.message, fallbackBuffer: inputBuffer });
      })
      .run();
  });
};

// ── Public API ───────────────────────────────────────────────

/**
 * Optimise a video file if it's a supported format.
 * Always resolves (never rejects) — falls back to original if FFmpeg fails.
 *
 * @param {Buffer}  buffer        — file buffer
 * @param {string}  originalName  — original filename
 * @returns {{ buffer: Buffer, fileName: string, processed: boolean }}
 */
const optimiseVideo = async (buffer, originalName) => {
  if (!isVideoFile(originalName)) {
    // Not a video — return unchanged
    return { buffer, fileName: originalName, processed: false };
  }

  const result = await processVideo(buffer, originalName);

  if (result.success) {
    return {
      buffer:    result.buffer,
      fileName:  result.fileName,
      processed: true,
    };
  }

  // FFmpeg failed — use original
  console.warn('⚠️  Video will be uploaded without faststart optimisation');
  return {
    buffer:    result.fallbackBuffer || buffer,
    fileName:  originalName,
    processed: false,
  };
};

module.exports = { optimiseVideo, isVideoFile };