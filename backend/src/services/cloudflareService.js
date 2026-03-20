// ═══════════════════════════════════════════════════════════════
// CLOUDFLARE R2 STORAGE SERVICE
// Replaces Bunny.net for all file storage.
//
// Cloudflare R2 is fully S3-compatible so we use the AWS SDK.
//
// Required env vars:
//   CF_ACCOUNT_ID          — Cloudflare account ID
//   CF_R2_ACCESS_KEY_ID    — R2 API token (Access Key ID)
//   CF_R2_SECRET_ACCESS_KEY — R2 API token (Secret Access Key)
//   CF_R2_BUCKET_NAME      — R2 bucket name (e.g. "outbound-impact")
//   CF_R2_PUBLIC_URL       — Public base URL for the bucket
//                            e.g. https://media.outboundimpact.net
//                            or   https://pub-xxxx.r2.dev
// ═══════════════════════════════════════════════════════════════

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// ── R2 client (lazy-initialised so missing env vars don't crash on import) ──
let _client = null;
const getClient = () => {
  if (!_client) {
    const accountId = process.env.CF_ACCOUNT_ID;
    if (!accountId) throw new Error('CF_ACCOUNT_ID env var is not set');

    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.CF_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
};

const BUCKET = () => {
  const b = process.env.CF_R2_BUCKET_NAME;
  if (!b) throw new Error('CF_R2_BUCKET_NAME env var is not set');
  return b;
};

const PUBLIC_URL = () => {
  const u = process.env.CF_R2_PUBLIC_URL;
  if (!u) throw new Error('CF_R2_PUBLIC_URL env var is not set');
  return u.replace(/\/$/, ''); // strip trailing slash
};

// ── MIME type map ────────────────────────────────────────────
const MIME_TYPES = {
  // Video
  mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', webm: 'video/webm', m4v: 'video/mp4',
  // Audio
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  // Image
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  // Docs
  pdf: 'application/pdf',
};

const getMimeType = (fileName) => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
};

// ── Upload ───────────────────────────────────────────────────

/**
 * Upload a Buffer to Cloudflare R2.
 *
 * @param {Buffer}  fileBuffer   — file contents
 * @param {string}  fileName     — final filename (already unique)
 * @param {string}  folder       — folder prefix e.g. "video", "image", "qr-codes"
 * @param {string}  [mimeType]   — optional override; auto-detected from fileName otherwise
 * @returns {{ success: boolean, url?: string, key?: string, error?: string }}
 */
const uploadToCloudflare = async (fileBuffer, fileName, folder = 'uploads', mimeType) => {
  try {
    const client      = getClient();
    const bucket      = BUCKET();
    const contentType = mimeType || getMimeType(fileName);
    const key         = `${folder}/${fileName}`;

    console.log(`☁️  R2 upload → ${bucket}/${key} (${contentType}, ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    await client.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        fileBuffer,
      ContentType: contentType,
      // Cache-Control: 1 year for immutable media, 1 day for QR codes
      CacheControl: folder === 'qr-codes'
        ? 'public, max-age=86400'
        : 'public, max-age=31536000, immutable',
    }));

    const url = `${PUBLIC_URL()}/${key}`;
    console.log(`✅ R2 upload successful: ${url}`);

    return { success: true, url, key };
  } catch (error) {
    console.error('❌ R2 upload error:', error.message);
    return { success: false, error: error.message };
  }
};

// ── Delete ───────────────────────────────────────────────────

/**
 * Delete a file from Cloudflare R2 by its full URL or its object key.
 *
 * @param {string} urlOrKey  — full CDN URL  OR  just the object key (e.g. "video/file.mp4")
 */
const deleteFromCloudflare = async (urlOrKey) => {
  try {
    const client = getClient();
    const bucket = BUCKET();
    const pubUrl = PUBLIC_URL();

    // Derive key from URL if a full URL was passed
    let key = urlOrKey;
    if (urlOrKey.startsWith('http')) {
      key = urlOrKey.replace(pubUrl + '/', '');
    }

    console.log(`🗑️  R2 delete → ${bucket}/${key}`);

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`✅ R2 delete successful: ${key}`);
    return { success: true };
  } catch (error) {
    console.error('❌ R2 delete error:', error.message);
    return { success: false, error: error.message };
  }
};

// ── Helpers (shared with bunnyService, same signatures) ──────

const generateFileName = (originalName, userId) => {
  const timestamp = Date.now();
  const random    = uuidv4().substring(0, 8);
  const ext       = originalName.split('.').pop().toLowerCase();
  return `${userId}_${timestamp}_${random}.${ext}`;
};

const generateSlug = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
};

// ── Config check (called on startup) ─────────────────────────
const checkConfig = () => {
  const required = [
    'CF_ACCOUNT_ID',
    'CF_R2_ACCESS_KEY_ID',
    'CF_R2_SECRET_ACCESS_KEY',
    'CF_R2_BUCKET_NAME',
    'CF_R2_PUBLIC_URL',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`⚠️  Cloudflare R2: missing env vars: ${missing.join(', ')}`);
    return false;
  }
  console.log('✅ Cloudflare R2 configured');
  return true;
};

module.exports = {
  uploadToCloudflare,
  deleteFromCloudflare,
  generateFileName,
  generateSlug,
  checkConfig,
};