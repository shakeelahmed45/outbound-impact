const axios = require('axios');
const prisma = require('../lib/prisma');
const FormData = require('form-data');

// ═══════════════════════════════════════════════════════════
// CHAT FILE UPLOAD SERVICE
// Handles document and image uploads in live chat
// Uses Bunny.net CDN for storage
// ═══════════════════════════════════════════════════════════

// Configuration
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'outbound-impact';
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || `https://${BUNNY_STORAGE_ZONE}.b-cdn.net`;

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv',
];

// ═══════════════════════════════════════════════════════════
// VALIDATE FILE
// ═══════════════════════════════════════════════════════════

const validateFile = (file) => {
  const errors = [];

  // Check if file exists
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  // Check file size
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / 1024 / 1024;
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }

  // Check file type
  const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
  if (!allAllowedTypes.includes(file.mimetype)) {
    errors.push('File type not allowed. Allowed: Images (PNG, JPG, GIF), Documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)');
  }

  return {
    valid: errors.length === 0,
    errors,
    isImage,
  };
};

// ═══════════════════════════════════════════════════════════
// UPLOAD TO BUNNY CDN
// ═══════════════════════════════════════════════════════════

const uploadToBunny = async (file, folder = 'chat-attachments') => {
  try {
    if (!BUNNY_API_KEY) {
      throw new Error('Bunny.net API key not configured');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Bunny.net
    const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`;
    
    await axios.put(uploadUrl, file.buffer, {
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
    });

    // Generate CDN URL
    const cdnUrl = `${BUNNY_CDN_URL}/${filePath}`;

    console.log('✅ File uploaded to Bunny CDN:', cdnUrl);

    return {
      success: true,
      url: cdnUrl,
      fileName,
      filePath,
    };

  } catch (error) {
    console.error('❌ Bunny upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ═══════════════════════════════════════════════════════════
// GENERATE THUMBNAIL (for images)
// ═══════════════════════════════════════════════════════════

const generateThumbnail = async (imageUrl) => {
  try {
    // Bunny.net has built-in image optimization
    // Add query parameters for thumbnail
    const thumbnailUrl = `${imageUrl}?width=200&height=200&fit=crop`;
    return thumbnailUrl;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════
// UPLOAD CHAT ATTACHMENT
// ═══════════════════════════════════════════════════════════

const uploadChatAttachment = async (file, messageId, uploadedBy) => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Upload to Bunny CDN
    const uploadResult = await uploadToBunny(file);
    if (!uploadResult.success) {
      return {
        success: false,
        error: 'Failed to upload file to CDN',
      };
    }

    // Generate thumbnail for images
    let thumbnailUrl = null;
    if (validation.isImage) {
      thumbnailUrl = await generateThumbnail(uploadResult.url);
    }

    // Save to database
    const attachment = await prisma.chatAttachment.create({
      data: {
        messageId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: BigInt(file.size),
        fileUrl: uploadResult.url,
        thumbnailUrl,
        uploadedBy,
      },
    });

    // Update message to mark as having attachments
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { hasAttachments: true },
    });

    console.log('✅ Chat attachment saved:', attachment.id);

    return {
      success: true,
      attachment: {
        ...attachment,
        fileSize: attachment.fileSize.toString(), // Convert BigInt to string
      },
    };

  } catch (error) {
    console.error('❌ Upload chat attachment error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ═══════════════════════════════════════════════════════════
// GET MESSAGE ATTACHMENTS
// ═══════════════════════════════════════════════════════════

const getMessageAttachments = async (messageId) => {
  try {
    const attachments = await prisma.chatAttachment.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });

    // Convert BigInt to string for JSON serialization
    return attachments.map(att => ({
      ...att,
      fileSize: att.fileSize.toString(),
    }));

  } catch (error) {
    console.error('Get attachments error:', error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE ATTACHMENT
// ═══════════════════════════════════════════════════════════

const deleteAttachment = async (attachmentId) => {
  try {
    const attachment = await prisma.chatAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return { success: false, error: 'Attachment not found' };
    }

    // Delete from Bunny CDN
    if (BUNNY_API_KEY) {
      try {
        const filePath = attachment.fileUrl.replace(BUNNY_CDN_URL + '/', '');
        const deleteUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`;
        
        await axios.delete(deleteUrl, {
          headers: {
            'AccessKey': BUNNY_API_KEY,
          },
        });
        
        console.log('✅ File deleted from CDN:', filePath);
      } catch (error) {
        console.error('CDN delete error:', error.message);
        // Continue even if CDN delete fails
      }
    }

    // Delete from database
    await prisma.chatAttachment.delete({
      where: { id: attachmentId },
    });

    // Check if message has other attachments
    const remainingAttachments = await prisma.chatAttachment.count({
      where: { messageId: attachment.messageId },
    });

    // Update message if no more attachments
    if (remainingAttachments === 0) {
      await prisma.chatMessage.update({
        where: { id: attachment.messageId },
        data: { hasAttachments: false },
      });
    }

    return { success: true };

  } catch (error) {
    console.error('Delete attachment error:', error);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════
// GET FILE ICON (for non-image files)
// ═══════════════════════════════════════════════════════════

const getFileIcon = (fileType) => {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('text')) return '📃';
  if (fileType.includes('csv')) return '📈';
  return '📎';
};

// ═══════════════════════════════════════════════════════════
// FORMAT FILE SIZE
// ═══════════════════════════════════════════════════════════

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  uploadChatAttachment,
  getMessageAttachments,
  deleteAttachment,
  validateFile,
  getFileIcon,
  formatFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
};