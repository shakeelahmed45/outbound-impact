const { PrismaClient } = require('@prisma/client');
const { uploadToBunny, generateFileName, generateSlug } = require('../services/bunnyService');

const prisma = new PrismaClient();

const uploadFile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, description, type, fileData, fileName, fileSize } = req.body;

    if (!title || !type || !fileData || !fileName) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
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

    // Create item with thumbnail (no QR code)
    const item = await prisma.item.create({
      data: {
        userId,
        title,
        description: description || null,
        type,
        slug,
        mediaUrl,
        thumbnailUrl,
        fileSize: BigInt(fileSize),
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: BigInt(newStorageUsed) }
    });

    res.json({
      status: 'success',
      message: uploadResult.success ? 
        'File uploaded to CDN successfully' : 
        'File uploaded (stored locally - please configure Bunny.net)',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        type: item.type,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        publicUrl: publicUrl,
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
    const userId = req.user.userId;
    const { title, description, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and content are required'
      });
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

    const item = await prisma.item.create({
      data: {
        userId,
        title,
        description: description || null,
        type: 'TEXT',
        slug,
        mediaUrl: content,
        thumbnailUrl: null, // Text posts don't have thumbnails by default
        fileSize: BigInt(content.length),
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
        publicUrl: publicUrl,
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