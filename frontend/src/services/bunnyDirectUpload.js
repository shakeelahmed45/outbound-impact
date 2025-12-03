// Direct Bunny.net Upload Service
// Upload files directly from browser to Bunny.net CDN

const BUNNY_STORAGE_ZONE = 'outboundimpactstoragezone123';
const BUNNY_STORAGE_PASSWORD = '22c573c6-8c95-4a73-94a05b6e12ea-32bb-4410';
const BUNNY_HOSTNAME = 'ny.storage.bunnycdn.com';
const BUNNY_PULL_ZONE = 'outboundimpactpullzone.b-cdn.net';

/**
 * Upload file directly to Bunny.net from browser
 * @param {File} file - The file to upload
 * @param {string} folder - Folder name (image, video, audio, etc)
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - CDN URL of uploaded file
 */
export const uploadToBunnyDirect = async (file, folder, onProgress) => {
  return new Promise((resolve, reject) => {
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomStr}.${ext}`;
    const uploadPath = `/${folder}/${fileName}`;
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}${uploadPath}`;

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        if (onProgress) {
          onProgress(percentComplete);
        }
      }
    });

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status === 201 || xhr.status === 200) {
        const cdnUrl = `https://${BUNNY_PULL_ZONE}${uploadPath}`;
        resolve({
          success: true,
          url: cdnUrl,
          fileName: fileName,
        });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    // Setup and send request
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('AccessKey', BUNNY_STORAGE_PASSWORD);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(file);
  });
};

/**
 * Get file type folder based on MIME type
 */
export const getFileFolder = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'other';
};

/**
 * Example usage:
 * 
 * const file = document.getElementById('fileInput').files[0];
 * const folder = getFileFolder(file.type);
 * 
 * try {
 *   const result = await uploadToBunnyDirect(file, folder, (progress) => {
 *     console.log(`Upload progress: ${progress}%`);
 *   });
 *   console.log('Upload successful:', result.url);
 * } catch (error) {
 *   console.error('Upload failed:', error);
 * }
 */