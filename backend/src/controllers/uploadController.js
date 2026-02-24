const prisma = require('../lib/prisma');
const { getAutoAssignOrgId } = require("../helpers/orgScope");
const { uploadToBunny, generateFileName, generateSlug } = require('../services/bunnyService');
const QRCode = require('qrcode');
const { notifyUpload, notifyStorageWarning, createNotification } = require('../services/notificationService');
const { sendEditorUploadNotification } = require('../services/emailService');

// ═══════════════════════════════════════════════════════════
// CONTENT APPROVAL LOGIC
// Enterprise + EDITOR → PENDING_APPROVAL (Workflow auto-created)
// All other plans + EDITOR → PUBLISHED (auto-publish + email notification)
// Owner or ADMIN uploads → always PUBLISHED, no notification
// ═══════════════════════════════════════════════════════════
const resolveContentApproval = (req, ownerRole) => {
  if (!req.isTeamMember || req.teamRole !== 'EDITOR') {
    return { status: 'PUBLISHED', needsApproval: false, sendEmail: false };
  }
  if (ownerRole === 'ORG_ENTERPRISE') {
    return { status: 'PENDING_APPROVAL', needsApproval: true, sendEmail: true };
  }
  return { status: 'PUBLISHED', needsApproval: false, sendEmail: true };
};

// Auto-create a Workflow entry linked to the new Item (Enterprise only)
const autoCreateWorkflow = async (item, req) => {
  try {
    const actualUserId = req.user.userId;
    const submitter = await prisma.user.findUnique({
      where: { id: actualUserId },
      select: { name: true, email: true },
    });

    await prisma.workflow.create({
      data: {
        userId: item.userId,
        submittedById: actualUserId,
        submittedByName: submitter?.name || 'Editor',
        submittedByEmail: submitter?.email || '',
        assetName: item.title,
        assetType: item.type,
        assetUrl: `${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/l/${item.slug}`,
        itemId: item.id,
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
      },
    });
    console.log(`📋 Auto-created Workflow for "${item.title}" (PENDING_REVIEW)`);
  } catch (error) {
    console.error('Failed to auto-create workflow:', error.message);
  }
};

// Send notification emails to account owner + all ADMIN team members
const notifyOwnerAndAdmins = async (ownerId, uploaderEmail, itemTitle, itemType, needsApproval) => {
  try {
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { email: true, name: true },
    });
    if (!owner) return;

    const adminMembers = await prisma.teamMember.findMany({
      where: { userId: ownerId, role: 'ADMIN', status: 'ACCEPTED', memberUserId: { not: null } },
      include: { memberUser: { select: { email: true, name: true } } },
    });

    const recipients = [{ email: owner.email, name: owner.name }];
    for (const admin of adminMembers) {
      if (admin.memberUser) recipients.push({ email: admin.memberUser.email, name: admin.memberUser.name });
    }

    const dashboardUrl = needsApproval
      ? `${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/dashboard/workflows`
      : `${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/dashboard/items`;

    for (const r of recipients) {
      await sendEditorUploadNotification({
        recipientEmail: r.email,
        recipientName: r.name,
        editorEmail: uploaderEmail,
        itemTitle,
        itemType,
        needsApproval,
        dashboardUrl,
      });
    }
    console.log(`📧 Upload notification sent to ${recipients.length} recipient(s) (${needsApproval ? 'PENDING' : 'AUTO-PUBLISHED'})`);
  } catch (error) {
    console.error('Failed to send upload notifications:', error.message);
  }
};

// ═══════════════════════════════════════════════════════════
// PLAN LIMITS — Strict enforcement
// ═══════════════════════════════════════════════════════════
const PLAN_UPLOAD_LIMITS = {
  INDIVIDUAL: 5,
  ORG_SMALL: null,    // unlimited
  ORG_MEDIUM: null,   // unlimited
  ORG_ENTERPRISE: null // unlimited
};

const checkUploadLimit = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  const limit = PLAN_UPLOAD_LIMITS[user?.role];
  if (limit === null || limit === undefined) return { allowed: true };

  const currentCount = await prisma.item.count({ where: { userId } });
  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `Upload limit reached (${currentCount}/${limit}). Please upgrade your plan.`,
      current: currentCount,
      limit
    };
  }
  return { allowed: true, current: currentCount, limit };
};

// 🎬 Helper function to extract YouTube video ID
const getYouTubeVideoId = (url) => {
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

// 🎬 Generate YouTube thumbnail URL
const getYouTubeThumbnail = (videoId) => {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// 🎬 Extract Vimeo video ID
const getVimeoVideoId = (url) => {
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

// ✅ NEW: Main upload handler - supports BOTH multipart AND base64
const uploadFile = async (req, res) => {
  try {
    // ✅ VIEWER cannot upload
    if (req.teamRole === "VIEWER") {
      return res.status(403).json({ status: "error", message: "VIEWER role does not have permission to upload content" });
    }

    const userId = req.effectiveUserId;
    
    // ✅ STRICT: Check upload item limit per plan
    const limitCheck = await checkUploadLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(403).json({ status: 'error', message: limitCheck.message });
    }
    const isMultipart = req.file !== undefined;
    
    let title, description, type, fileName, fileSize, buttonText, buttonUrl, attachments, sharingEnabled;
    let fileBuffer;
    
    if (isMultipart) {
      // ✅ NEW: FormData upload (YouTube-style - no memory issues!)
      console.log('📤 FormData upload detected (YouTube-style)');
      
      title = req.body.title;
      description = req.body.description;
      type = req.body.type;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      buttonText = req.body.buttonText;
      buttonUrl = req.body.buttonUrl;
      attachments = req.body.attachments ? JSON.parse(req.body.attachments) : null;
      sharingEnabled = req.body.sharingEnabled === 'true' || req.body.sharingEnabled === true;
      
      // File is already in memory as Buffer
      fileBuffer = req.file.buffer;
      
    } else {
      // ⚠️ OLD: Base64 upload (backward compatibility - has memory issues)
      console.log('📦 Base64 upload detected (old method)');
      
      const { fileData } = req.body;
      title = req.body.title;
      description = req.body.description;
      type = req.body.type;
      fileName = req.body.fileName;
      fileSize = req.body.fileSize;
      buttonText = req.body.buttonText;
      buttonUrl = req.body.buttonUrl;
      attachments = req.body.attachments;
      sharingEnabled = req.body.sharingEnabled;
      
      if (!fileData) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing file data'
        });
      }
      
      // Convert base64 to buffer
      const base64Data = fileData.split(',')[1] || fileData;
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    // Validation
    if (!title || !type || !fileName) {
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

    // Check storage limits
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

    // Upload to Bunny.net
    const uniqueFileName = generateFileName(fileName, userId);
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
      console.log('⚠️ Bunny.net upload failed');
      console.log('Error:', uploadResult.error);
      
      // If multipart, we can't fall back to base64 in database
      if (isMultipart) {
        return res.status(500).json({
          status: 'error',
          message: 'File upload failed. Please try again.'
        });
      }
      
      // For base64, store as fallback
      mediaUrl = `data:${type.toLowerCase()};base64,${fileBuffer.toString('base64')}`;
      if (type === 'IMAGE') {
        thumbnailUrl = mediaUrl;
      }
    }

    // Generate slug and QR code
    let slug = generateSlug();
    let slugExists = await prisma.item.findUnique({ where: { slug } });
    
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.item.findUnique({ where: { slug } });
    }

    const publicUrl = `${process.env.FRONTEND_URL}/l/${slug}`;

    const qrUrl = `${publicUrl}?s=qr`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
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

    // Update storage
    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: BigInt(newStorageUsed) }
    });

    // ═══ Content Approval ═══
    const ownerUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const approval = resolveContentApproval(req, ownerUser.role);

    // Create item
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
        sharingEnabled: sharingEnabled !== undefined ? sharingEnabled : true,
        organizationId: req.body.organizationId || getAutoAssignOrgId(req),
        status: approval.status,
        uploadedByUserId: req.isTeamMember ? req.user.userId : null,
        uploadedByEmail: req.isTeamMember ? req.user.email : null,
      }
    });

    // 🔔 In-app notification for uploader
    await notifyUpload(userId, title, type);

    // 🔔 Storage warning
    const storageLimit = Number(user.storageLimit || 2147483648);
    const storagePercent = storageLimit > 0 ? Math.round((newStorageUsed / storageLimit) * 100) : 0;
    await notifyStorageWarning(userId, storagePercent);

    // 📋 Enterprise: auto-create Workflow for approval
    if (approval.needsApproval) {
      await autoCreateWorkflow(item, req);
    }

    // 📧 Email to owner + admins
    if (approval.sendEmail) {
      notifyOwnerAndAdmins(userId, req.user.email, title, type, approval.needsApproval);
    }

    res.status(201).json({
      status: 'success',
      message: approval.needsApproval
        ? 'Content submitted for approval. Your team admin will review it in Workflows.'
        : 'File uploaded successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        mediaUrl: item.mediaUrl,
        qrCodeUrl: item.qrCodeUrl,
        contentStatus: approval.status,
      }
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Text post creation (unchanged)
const createTextPost = async (req, res) => {
  try {
    // ✅ VIEWER cannot create text posts
    if (req.teamRole === "VIEWER") {
      return res.status(403).json({ status: "error", message: "VIEWER role does not have permission to create content" });
    }

    const userId = req.effectiveUserId;
    const { title, description, content, buttonText, buttonUrl, attachments, sharingEnabled } = req.body;

    // ✅ STRICT: Check upload item limit per plan
    const limitCheck = await checkUploadLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(403).json({ status: 'error', message: limitCheck.message });
    }

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

    const qrUrl = `${publicUrl}?s=qr`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
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

    // ═══ Content Approval ═══
    const ownerUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const approval = resolveContentApproval(req, ownerUser.role);

    const item = await prisma.item.create({
      data: {
        userId,
        slug,
        title,
        description: description || null,
        type: 'TEXT',
        content,
        qrCodeUrl,
        fileSize: BigInt(0),
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        attachments: attachments || null,
        sharingEnabled: sharingEnabled !== undefined ? sharingEnabled : true,
        organizationId: req.body.organizationId || getAutoAssignOrgId(req),
        status: approval.status,
        uploadedByUserId: req.isTeamMember ? req.user.userId : null,
        uploadedByEmail: req.isTeamMember ? req.user.email : null,
      }
    });

    await notifyUpload(userId, title, 'text');

    if (approval.needsApproval) await autoCreateWorkflow(item, req);
    if (approval.sendEmail) notifyOwnerAndAdmins(userId, req.user.email, title, 'TEXT', approval.needsApproval);

    res.status(201).json({
      status: 'success',
      message: approval.needsApproval
        ? 'Text post submitted for approval. Your team admin will review it in Workflows.'
        : 'Text post created successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        qrCodeUrl: item.qrCodeUrl,
        contentStatus: approval.status,
      }
    });

  } catch (error) {
    console.error('Create text post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Embed post creation (unchanged)
const createEmbedPost = async (req, res) => {
  try {
    // ✅ VIEWER cannot create embed posts
    if (req.teamRole === "VIEWER") {
      return res.status(403).json({ status: "error", message: "VIEWER role does not have permission to create content" });
    }

    const userId = req.effectiveUserId;
    const { title, description, embedUrl, embedType, sharingEnabled } = req.body;

    // ✅ STRICT: Check upload item limit per plan
    const limitCheck = await checkUploadLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(403).json({ status: 'error', message: limitCheck.message });
    }

    if (!title || !embedUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and embed URL are required'
      });
    }

    try {
      new URL(embedUrl);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid embed URL format'
      });
    }

    let slug = generateSlug();
    let slugExists = await prisma.item.findUnique({ where: { slug } });
    
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.item.findUnique({ where: { slug } });
    }

    const publicUrl = `${process.env.FRONTEND_URL}/l/${slug}`;

    const qrUrl = `${publicUrl}?s=qr`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
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

    let thumbnailUrl = null;
    if (embedType === 'YouTube') {
      const videoId = getYouTubeVideoId(embedUrl);
      if (videoId) {
        thumbnailUrl = getYouTubeThumbnail(videoId);
        console.log('🎬 YouTube thumbnail generated:', thumbnailUrl);
      }
    }

    // ═══ Content Approval ═══
    const ownerUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const approval = resolveContentApproval(req, ownerUser.role);

    const item = await prisma.item.create({
      data: {
        userId,
        slug,
        title,
        description: description || null,
        type: 'EMBED',
        embedUrl,
        embedType: embedType || 'External',
        qrCodeUrl,
        thumbnailUrl,
        fileSize: BigInt(0),
        sharingEnabled: sharingEnabled !== undefined ? sharingEnabled : true,
        organizationId: req.body.organizationId || getAutoAssignOrgId(req),
        status: approval.status,
        uploadedByUserId: req.isTeamMember ? req.user.userId : null,
        uploadedByEmail: req.isTeamMember ? req.user.email : null,
      }
    });

    await notifyUpload(userId, title, 'embed');

    if (approval.needsApproval) await autoCreateWorkflow(item, req);
    if (approval.sendEmail) notifyOwnerAndAdmins(userId, req.user.email, title, 'EMBED', approval.needsApproval);

    res.status(201).json({
      status: 'success',
      message: approval.needsApproval
        ? 'Embed post submitted for approval. Your team admin will review it in Workflows.'
        : 'Embed post created successfully',
      item: {
        id: item.id,
        title: item.title,
        slug: item.slug,
        qrCodeUrl: item.qrCodeUrl,
        contentStatus: approval.status,
      }
    });

  } catch (error) {
    console.error('Create embed post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  uploadFile,
  createTextPost,
  createEmbedPost
};