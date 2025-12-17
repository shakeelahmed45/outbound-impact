const { PrismaClient } = require('@prisma/client');
const { uploadToBunny, generateFileName, generateSlug } = require('../services/bunnyService');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

const uploadFile = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    // ✅ NEW: Added buttonText, buttonUrl, and attachments support
    const { title, description, type, fileData, fileName, fileSize, buttonText, buttonUrl, attachments } = req.body;

    if (!title || !type || !fileData || !fileName) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // ✅ NEW: Validate button fields if provided
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

    // ✅ NEW: Validate URL format if provided
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

    // Upload to Bunny.net
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
      
      // Auto-generate thumbnail for images
      if (type === 'IMAGE') {
        thumbnailUrl = mediaUrl; // Use the image itself as thumbnail
      }
    } else {
      console.log('⚠️ Bunny.net upload failed, storing as base64');
      console.log('Error:', uploadResult.error);
      mediaUrl = fileData;
      
      if (type === 'IMAGE') {
        thumbnailUrl = fileData;
      }
    }

    // Generate unique slug
    let slug = generateSlug();
    let slugExists = await prisma.item.findUnique({ where: { slug } });
    
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.item.findUnique({ where: { slug } });
    }

    // Generate public URL
    const publicUrl = `${process.env.FRONTEND_URL}/l/${slug}`;

    // Generate QR code (keeping for backward compatibility)
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#800080', // Purple
        light: '#FFFFFF',
      },
    });

    // ✅ NEW: Create item with button and attachments support
    const item = await prisma.item.create({
      data: {
        userId,
        title,
        description: description || null,
        type,
        slug,
        mediaUrl,
        qrCodeUrl: qrCodeDataUrl,
        thumbnailUrl,
        fileSize: BigInt(fileSize),
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        attachments: attachments || null,
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: BigInt(Number(user.storageUsed) + Number(fileSize)) }
    });

    res.json({
      status: 'success',
      message: 'File uploaded successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        type: item.type,
        thumbnailUrl: item.thumbnailUrl,
        qrCodeUrl: item.qrCodeUrl,
        publicUrl: publicUrl,
        buttonText: item.buttonText,
        buttonUrl: item.buttonUrl,
        attachments: item.attachments,
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
    // Get buttonText, buttonUrl, and attachments from request
    const { title, description, content, buttonText, buttonUrl, attachments } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and content are required'
      });
    }

    // Validate button fields if provided
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

    // Validate URL format if provided
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

    // Generate unique slug
    let slug = generateSlug();
    let slugExists = await prisma.item.findUnique({ where: { slug } });
    
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.item.findUnique({ where: { slug } });
    }

    // Generate public URL
    const publicUrl = `${process.env.FRONTEND_URL}/l/${slug}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#800080',
        light: '#FFFFFF',
      },
    });

    // Include buttonText, buttonUrl, and attachments in database
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

    res.json({
      status: 'success',
      message: 'Text post created successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        type: item.type,
        thumbnailUrl: item.thumbnailUrl,
        qrCodeUrl: item.qrCodeUrl,
        publicUrl: publicUrl,
        buttonText: item.buttonText,
        buttonUrl: item.buttonUrl,
        attachments: item.attachments,
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

module.exports = {
  uploadFile,
  createTextPost,
};