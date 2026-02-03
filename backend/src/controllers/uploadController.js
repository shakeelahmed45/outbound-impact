const prisma = require('../lib/prisma');
const { uploadToBunny, generateFileName, generateSlug } = require('../services/bunnyService');
const QRCode = require('qrcode');

// 🎬 NEW: Helper function to extract YouTube video ID
const getYouTubeVideoId = (url) => {
  // YouTube URL patterns:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  // https://m.youtube.com/watch?v=VIDEO_ID
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// 🎬 NEW: Generate YouTube thumbnail URL
const getYouTubeThumbnail = (videoId) => {
  if (!videoId) return null;
  
  // Use maxresdefault for highest quality
  // YouTube automatically falls back to lower quality if max not available
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// 🎬 NEW: Extract Vimeo video ID
const getVimeoVideoId = (url) => {
  // Vimeo URL patterns:
  // https://vimeo.com/VIDEO_ID
  // https://player.vimeo.com/video/VIDEO_ID
  
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

const uploadFile = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { title, description, type, fileData, fileName, fileSize, buttonText, buttonUrl, attachments, sharingEnabled } = req.body;

    if (!title || !type || !fileData || !fileName) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    if (buttonText && !buttonUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Button URL is required when button text is provided'
      });
    }
    
    if (buttonUrl && !buttonText) {
      return res.status(400).json({
        status: 'error',
        message: 'Button text is required when button URL is provided'
      });
    }

    if (buttonUrl) {
      try {
        new URL(buttonUrl);
        if (!buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
          return res.status(400).json({
            status: 'error',
            message: 'Button URL must start with http:// or https://'
          });
        }
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid button URL format'
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true, storageLimit: true }
    });

    const newStorageUsed = Number(user.storageUsed) + Number(fileSize);
    
    if (newStorageUsed > Number(user.storageLimit)) {
      return res.status(400).json({
        status: 'error',
        message: 'Storage limit exceeded. Please upgrade your plan.'
      });
    }

    const uniqueFileName = generateFileName(fileName, userId);
    const base64Data = fileData.split(',')[1] || fileData;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    const uploadResult = await uploadToBunny(
      fileBuffer,
      uniqueFileName,
      type.toLowerCase()
    );

    let mediaUrl;
    let thumbnailUrl = null;
    
    if (uploadResult.success) {
      console.log('✅ File uploaded to Bunny.net CDN');
      mediaUrl = uploadResult.url;
      
      if (type === 'IMAGE') {
        thumbnailUrl = mediaUrl;
      }
    } else {
      console.log('⚠️ Bunny.net upload failed, storing as base64');
      console.log('Error:', uploadResult.error);
      mediaUrl = fileData;
      
      if (type === 'IMAGE') {
        thumbnailUrl = fileData;
      }
    }

    let slug = generateSlug();
    let slugExists = await prisma.item.findUnique({ where: { slug } });
    
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.item.findUnique({ where: { slug } });
    }

    const publicUrl = `${process.env.FRONTEND_URL}/l/${slug}`;

    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#800080',
        light: '#FFFFFF',
      },
    });

    const base64QRData = qrCodeDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(base64QRData, 'base64');
    const qrFileName = `qr-${slug}.png`;
    
    const qrUploadResult = await uploadToBunny(qrBuffer, qrFileName, 'image/png');
    const qrCodeUrl = qrUploadResult.success ? qrUploadResult.url : qrCodeDataUrl;

    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: BigInt(newStorageUsed) }
    });

    // ✅ NEW: Include sharingEnabled (default true if not provided)
    const item = await prisma.item.create({
      data: {
        userId,
        slug,
        title,
        description: description || null,
        type,
        mediaUrl,
        qrCodeUrl,
        thumbnailUrl,
        fileSize: BigInt(fileSize),
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        attachments: attachments || null,
        sharingEnabled: sharingEnabled !== undefined ? sharingEnabled : true, // ✅ NEW: Default true
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        type: item.type,
        mediaUrl: item.mediaUrl,
        qrCodeUrl: item.qrCodeUrl,
        publicUrl: publicUrl,
        sharingEnabled: item.sharingEnabled, // ✅ NEW
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Upload failed: ' + error.message
    });
  }
};

const createTextPost = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { title, description, content, buttonText, buttonUrl, attachments, sharingEnabled } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and content are required'
      });
    }

    if (buttonText && !buttonUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Button URL is required when button text is provided'
      });
    }
    
    if (buttonUrl && !buttonText) {
      return res.status(400).json({
        status: 'error',
        message: 'Button text is required when button URL is provided'
      });
    }

    if (buttonUrl) {
      try {
        new URL(buttonUrl);
        if (!buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
          return res.status(400).json({
            status: 'error',
            message: 'Button URL must start with http:// or https://'
          });
        }
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid button URL format'
        });
      }
    }

    let slug = generateSlug();
    let slugExists = await prisma.item.findUnique({ where: { slug } });
    
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.item.findUnique({ where: { slug } });
    }

    const publicUrl = `${process.env.FRONTEND_URL}/l/${slug}`;

    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#800080',
        light: '#FFFFFF',
      },
    });

    // ✅ NEW: Include sharingEnabled (default true if not provided)
    const item = await prisma.item.create({
      data: {
        userId,
        title,
        description: description || null,
        type: 'TEXT',
        slug,
        mediaUrl: content,
        qrCodeUrl: qrCodeDataUrl,
        thumbnailUrl: null,
        fileSize: BigInt(content.length),
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        attachments: attachments || null,
        sharingEnabled: sharingEnabled !== undefined ? sharingEnabled : true, // ✅ NEW: Default true
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: BigInt(Number(user.storageUsed) + content.length) }
    });

    res.status(201).json({
      status: 'success',
      message: 'Text post created successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        type: item.type,
        mediaUrl: item.mediaUrl,
        qrCodeUrl: item.qrCodeUrl,
        publicUrl: publicUrl,
        sharingEnabled: item.sharingEnabled, // ✅ NEW
      }
    });

  } catch (error) {
    console.error('Text post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create text post'
    });
  }
};

const createEmbedPost = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { title, description, embedUrl, embedType, sharingEnabled } = req.body;

    if (!title || !embedUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and embed URL are required'
      });
    }

    // Validate embed URL
    try {
      new URL(embedUrl);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid embed URL format'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true, storageLimit: true }
    });

    const slug = generateSlug();
    const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/l/${slug}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#800080',
        light: '#FFFFFF',
      },
    });
    const base64Data = qrCodeDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(base64Data, 'base64');
    const qrFileName = `qr-${slug}.png`;
    
    // Upload to Bunny and extract URL
    const qrUploadResult = await uploadToBunny(qrBuffer, qrFileName, 'image/png');
    const qrCodeUrl = qrUploadResult.success ? qrUploadResult.url : qrCodeDataUrl;

    // 🎬 NEW: Extract thumbnail URL for YouTube/Vimeo
    let thumbnailUrl = null;

    if (embedType === 'YouTube') {
      const videoId = getYouTubeVideoId(embedUrl);
      if (videoId) {
        thumbnailUrl = getYouTubeThumbnail(videoId);
        console.log('✅ YouTube thumbnail generated:', thumbnailUrl);
      } else {
        console.log('⚠️ Could not extract YouTube video ID from:', embedUrl);
      }
    } else if (embedType === 'Vimeo') {
      const videoId = getVimeoVideoId(embedUrl);
      if (videoId) {
        // Vimeo thumbnails require API call with authentication
        // For now, we'll use null and show colored background
        thumbnailUrl = null;
        console.log('ℹ️ Vimeo video ID:', videoId, '(thumbnail requires API)');
      }
    }

    // ✅ UPDATED: Include thumbnailUrl with YouTube support
    const item = await prisma.item.create({
      data: {
        userId,
        slug,
        title,
        description: description || `${embedType || 'External'} Embed`,
        type: 'EMBED',
        mediaUrl: embedUrl,
        fileSize: 0,
        qrCodeUrl,
        thumbnailUrl,  // 🎬 NOW HAS YOUTUBE THUMBNAIL!
        buttonText: embedType || 'External Content',
        buttonUrl: null,
        attachments: null,
        sharingEnabled: sharingEnabled !== undefined ? sharingEnabled : true,
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Embed created successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        type: item.type,
        mediaUrl: item.mediaUrl,
        qrCodeUrl: item.qrCodeUrl,
        thumbnailUrl: item.thumbnailUrl, // 🎬 NEW: Include in response
        publicUrl: publicUrl,
        sharingEnabled: item.sharingEnabled,
      }
    });

  } catch (error) {
    console.error('Embed creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create embed'
    });
  }
};

module.exports = {
  uploadFile,
  createTextPost,
  createEmbedPost,
};