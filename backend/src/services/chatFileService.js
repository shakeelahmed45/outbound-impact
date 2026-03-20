const prisma = require('../lib/prisma');
const { uploadToCloudflare, deleteFromCloudflare } = require('./cloudflareService');

// ═══════════════════════════════════════════════════════════
// CHAT FILE UPLOAD SERVICE
// Handles document and image uploads in live chat.
// Uses Cloudflare R2 for storage.
// ═══════════════════════════════════════════════════════════

const MAX_FILE_SIZE  = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_SIZE =  5 * 1024 * 1024; //  5 MB

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// ── Validate ──────────────────────────────────────────────

const validateFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
  if (!allAllowedTypes.includes(file.mimetype)) {
    errors.push('File type not allowed. Allowed: Images (PNG, JPG, GIF), Documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)');
  }

  return { valid: errors.length === 0, errors, isImage };
};

// ── Upload Chat Attachment ────────────────────────────────

const uploadChatAttachment = async (file, messageId, uploadedBy) => {
  try {
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext       = file.originalname.split('.').pop();
    const fileName  = `${timestamp}_${randomStr}.${ext}`;

    const uploadResult = await uploadToCloudflare(
      file.buffer,
      fileName,
      'chat-attachments',
      file.mimetype
    );

    if (!uploadResult.success) {
      return { success: false, error: 'Failed to upload file to storage' };
    }

    const thumbnailUrl = validation.isImage ? uploadResult.url : null;

    const attachment = await prisma.chatAttachment.create({
      data: {
        messageId,
        fileName:    file.originalname,
        fileType:    file.mimetype,
        fileSize:    BigInt(file.size),
        fileUrl:     uploadResult.url,
        thumbnailUrl,
        uploadedBy,
      },
    });

    await prisma.chatMessage.update({
      where: { id: messageId },
      data:  { hasAttachments: true },
    });

    console.log('✅ Chat attachment saved to R2:', attachment.id);

    return {
      success:    true,
      attachment: { ...attachment, fileSize: attachment.fileSize.toString() },
    };
  } catch (error) {
    console.error('❌ uploadChatAttachment error:', error);
    return { success: false, error: error.message };
  }
};

// ── Get Message Attachments ───────────────────────────────

const getMessageAttachments = async (messageId) => {
  try {
    const attachments = await prisma.chatAttachment.findMany({
      where:   { messageId },
      orderBy: { createdAt: 'asc' },
    });
    return attachments.map(att => ({ ...att, fileSize: att.fileSize.toString() }));
  } catch (error) {
    console.error('getMessageAttachments error:', error);
    return [];
  }
};

// ── Delete Attachment ─────────────────────────────────────

const deleteAttachment = async (attachmentId) => {
  try {
    const attachment = await prisma.chatAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return { success: false, error: 'Attachment not found' };
    }

    if (attachment.fileUrl) {
      await deleteFromCloudflare(attachment.fileUrl).catch(err =>
        console.error('R2 delete error (non-fatal):', err.message)
      );
    }

    await prisma.chatAttachment.delete({ where: { id: attachmentId } });

    const remaining = await prisma.chatAttachment.count({
      where: { messageId: attachment.messageId },
    });

    if (remaining === 0) {
      await prisma.chatMessage.update({
        where: { id: attachment.messageId },
        data:  { hasAttachments: false },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('deleteAttachment error:', error);
    return { success: false, error: error.message };
  }
};

// ── Helpers ───────────────────────────────────────────────

const getFileIcon = (fileType) => {
  if (fileType.includes('pdf'))                                        return '📄';
  if (fileType.includes('word') || fileType.includes('document'))     return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('text'))                                       return '📃';
  if (fileType.includes('csv'))                                        return '📈';
  return '📎';
};

const formatFileSize = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// ── Exports ───────────────────────────────────────────────

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