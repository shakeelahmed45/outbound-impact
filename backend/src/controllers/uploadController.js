const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Generate unique slug
const generateSlug = () => {
  return crypto.randomBytes(6).toString('hex');
};

// Generate QR Code
const generateQRCode = async (url) => {
  try {
    const qrBuffer = await QRCode.toBuffer(url, {
      width: 500,
      margin: 2,
      color: {
        dark: '#800080', // Purple
        light: '#FFFFFF',
      },
    });
    return qrBuffer.toString('base64');
  } catch (error) {
    console.error('QR generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Register a file that was uploaded directly to Bunny.net
 * This endpoint is called AFTER the file is already on CDN
 * It just creates the database record and generates QR code
 */
exports.registerDirectUpload = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, description, type, mediaUrl, fileName, fileSize } = req.body;

    console.log('Registering direct upload:', { title, type, fileName, fileSize });

    // Validate required fields
    if (!title || !type || !mediaUrl || !fileName) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Check user storage
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

    // Generate unique slug
    let slug = generateSlug();
    let slugExists = await prisma.item.findUnique({ where: { slug } });
    
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.item.findUnique({ where: { slug } });
    }

    // Generate QR code for the public link
    const publicUrl = `${process.env.APP_URL || 'http://localhost:5173'}/l/${slug}`;
    const qrCodeData = await generateQRCode(publicUrl);
    const qrCodeUrl = `data:image/png;base64,${qrCodeData}`;

    // Create item in database
    const item = await prisma.item.create({
      data: {
        userId,
        title,
        description: description || null,
        type,
        slug,
        mediaUrl, // CDN URL from direct upload
        qrCodeUrl, // Generated QR code
        fileSize: BigInt(fileSize),
      }
    });

    // Update user storage
    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: BigInt(newStorageUsed) }
    });

    console.log('✅ Direct upload registered successfully:', item.id);

    res.json({
      status: 'success',
      message: 'File registered and QR code generated successfully',
      item: {
        ...item,
        fileSize: item.fileSize.toString(),
      }
    });
  } catch (error) {
    console.error('❌ Register direct upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register upload'
    });
  }
};

// Existing uploadFile function (for backward compatibility)
// Keep this if you still want the old upload method to work
exports.uploadFile = async (req, res) => {
  // Your existing upload logic here
  // This handles the old method where file goes through backend
  res.status(501).json({
    status: 'error',
    message: 'Please use direct upload instead'
  });
};

// Export existing text upload function
exports.uploadText = async (req, res) => {
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

    // Generate QR code
    const publicUrl = `${process.env.APP_URL || 'http://localhost:5173'}/l/${slug}`;
    const qrCodeData = await generateQRCode(publicUrl);
    const qrCodeUrl = `data:image/png;base64,${qrCodeData}`;

    // Create text item
    const item = await prisma.item.create({
      data: {
        userId,
        title,
        description: description || null,
        type: 'TEXT',
        slug,
        mediaUrl: content, // Store text content as mediaUrl
        qrCodeUrl,
        fileSize: BigInt(Buffer.byteLength(content, 'utf8')),
      }
    });

    // Update user storage (text is minimal)
    await prisma.user.update({
      where: { id: userId },
      data: { 
        storageUsed: { 
          increment: BigInt(Buffer.byteLength(content, 'utf8'))
        } 
      }
    });

    console.log('✅ Text post created:', item.id);

    res.json({
      status: 'success',
      message: 'Text post created successfully',
      item: {
        ...item,
        fileSize: item.fileSize.toString(),
      }
    });
  } catch (error) {
    console.error('❌ Text upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create text post'
    });
  }
};