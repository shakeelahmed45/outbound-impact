const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const BUNNY_PULL_ZONE = process.env.BUNNY_PULL_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME || 'storage.bunnycdn.com';
const BUNNY_STORAGE_API = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}`;

const uploadToBunny = async (file, fileName, folder = 'uploads') => {
  try {
    const uploadPath = `/${folder}/${fileName}`;
    
    console.log('Uploading to Bunny.net:');
    console.log('API URL:', `${BUNNY_STORAGE_API}${uploadPath}`);
    console.log('Storage Zone:', BUNNY_STORAGE_ZONE);
    console.log('Hostname:', BUNNY_HOSTNAME);
    
    const response = await axios.put(
      `${BUNNY_STORAGE_API}${uploadPath}`,
      file,
      {
        headers: {
          'AccessKey': BUNNY_STORAGE_PASSWORD,
          'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    if (response.status === 201) {
      const cdnUrl = `https://${BUNNY_PULL_ZONE}${uploadPath}`;
      console.log('Upload successful! CDN URL:', cdnUrl);
      return {
        success: true,
        url: cdnUrl,
        fileName: fileName,
      };
    }

    return {
      success: false,
      error: 'Upload failed',
    };
  } catch (error) {
    console.error('Bunny upload error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers sent:', {
      'AccessKey': BUNNY_STORAGE_PASSWORD ? '***configured***' : 'MISSING',
      'API URL': `${BUNNY_STORAGE_API}`,
    });
    return {
      success: false,
      error: error.message,
    };
  }
};

const deleteFromBunny = async (filePath) => {
  try {
    await axios.delete(`${BUNNY_STORAGE_API}${filePath}`, {
      headers: {
        'AccessKey': BUNNY_STORAGE_PASSWORD,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Bunny delete error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

const generateFileName = (originalName, userId) => {
  const timestamp = Date.now();
  const random = uuidv4().substring(0, 8);
  const ext = originalName.split('.').pop();
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

module.exports = {
  uploadToBunny,
  deleteFromBunny,
  generateFileName,
  generateSlug,
};