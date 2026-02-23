const prisma = require('../lib/prisma');
const { buildOrgFilter, getAutoAssignOrgId } = require("../helpers/orgScope");
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const axios = require('axios');
const { nanoid } = require('nanoid');
const { notifyStreamPublished, notifyQrScan } = require('../services/notificationService');

// Helper function to sort items by custom order
const applyCustomOrder = (items, itemOrder) => {
  if (!itemOrder || itemOrder.length === 0) {
    // No custom order, return items as-is (they're already sorted by createdAt desc)
    return items;
  }

  // Create a map of item positions based on itemOrder
  const orderMap = new Map();
  itemOrder.forEach((id, index) => {
    orderMap.set(id, index);
  });

  // Sort items: items in itemOrder come first (in that order), then remaining items by createdAt
  return items.sort((a, b) => {
    const aIndex = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
    const bIndex = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;

    if (aIndex === Infinity && bIndex === Infinity) {
      // Both items not in order, sort by createdAt desc
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    return aIndex - bIndex;
  });
};


// Generate unique slug
const generateUniqueSlug = async () => {
  let slug;
  let exists = true;

  while (exists) {
    slug = nanoid(8);
    const existing = await prisma.campaign.findUnique({
      where: { slug },
    });
    exists = !!existing;
  }

  return slug;
};

// Generate and upload QR code to Bunny CDN
const generateCampaignQRCode = async (slug) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://outboundimpact.net';
    const campaignUrl = `${baseUrl}/c/${slug}`;
    const qrUrl = `${campaignUrl}?s=qr`;

    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#800080',
        light: '#FFFFFF',
      },
    });

    const bunnyHostname = process.env.BUNNY_HOSTNAME || 'storage.bunnycdn.com';
    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE;
    const bunnyStoragePassword = process.env.BUNNY_STORAGE_PASSWORD;
    const bunnyPullZone = process.env.BUNNY_PULL_ZONE;

    // âœ… Use unique filename to bust CDN cache
    const timestamp = Date.now();
    const fileName = `campaign-qr-${slug}-${timestamp}.png`;

    const response = await axios.put(
      `https://${bunnyHostname}/${bunnyStorageZone}/qr-codes/${fileName}`,
      qrCodeBuffer,
      {
        headers: {
          'AccessKey': bunnyStoragePassword,
          'Content-Type': 'image/png',
        },
      }
    );

    const qrCodeUrl = `https://${bunnyPullZone}/qr-codes/${fileName}`;
    return qrCodeUrl;
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
};

// âœ… Get all campaigns for authenticated user
const getUserCampaigns = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const campaigns = await prisma.campaign.findMany({
      where: { userId, ...buildOrgFilter(req) },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        logoUrl: true,
        qrCodeUrl: true,
        passwordProtected: true, // âœ… NEW: Include password protection status
        views: true, // âœ… Campaign page view count
        viewsQr: true, // âœ… QR scan count
        viewsNfc: true, // âœ… NFC tap count
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const campaignsWithCounts = campaigns.map((campaign) => ({
      ...campaign,
      itemCount: campaign._count.items,
    }));

    res.json({
      status: 'success',
      campaigns: campaignsWithCounts,
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaigns',
    });
  }
};

// âœ… Create new campaign with optional password protection
const createCampaign = async (req, res) => {
  try {
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({
        status: 'error',
        message: 'VIEWER role does not have permission to create campaigns',
      });
    }

    const userId = req.effectiveUserId;
    const { name, description, category, logoUrl, passwordProtected, password } = req.body;

    // ✅ STRICT: Individual plan → 2 streams max
    const owner = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (owner?.role === 'INDIVIDUAL') {
      const streamCount = await prisma.campaign.count({ where: { userId } });
      if (streamCount >= 2) {
        return res.status(403).json({
          status: 'error',
          message: 'Stream limit reached (2/2). Please upgrade your plan to create more streams.'
        });
      }
    }

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign name is required',
      });
    }

    // âœ… NEW: Validate password if protection is enabled
    if (passwordProtected && !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required when protection is enabled',
      });
    }

    if (passwordProtected && password && password.length < 4) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 4 characters',
      });
    }

    const slug = await generateUniqueSlug();
    const qrCodeUrl = await generateCampaignQRCode(slug);

    // âœ… NEW: Hash password if provided
    let passwordHash = null;
    if (passwordProtected && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        slug,
        name,
        description: description || null,
        category: category || null,
        logoUrl: logoUrl || null,
        qrCodeUrl,
        passwordProtected: passwordProtected || false, // âœ… NEW
        organizationId: req.body.organizationId || getAutoAssignOrgId(req),
        passwordHash, // âœ… NEW
      },
    });

    console.log(`âœ… Campaign created: ${campaign.name}${logoUrl ? ' (with logo)' : ''}${passwordProtected ? ' [PROTECTED]' : ''}`);

    // 🔔 Notify: stream published
    await notifyStreamPublished(userId, name);

    res.status(201).json({
      status: 'success',
      message: 'Campaign created successfully',
      campaign,
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create campaign',
    });
  }
};

// âœ… Update campaign with password protection support
const updateCampaign = async (req, res) => {
  try {
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({
        status: 'error',
        message: 'VIEWER role does not have permission to edit campaigns',
      });
    }

    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { name, description, category, logoUrl, passwordProtected, password } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    // âœ… NEW: Handle password updates
    let passwordHash = campaign.passwordHash;
    
    if (passwordProtected) {
      // If enabling protection or changing password
      if (password) {
        if (password.length < 4) {
          return res.status(400).json({
            status: 'error',
            message: 'Password must be at least 4 characters',
          });
        }
        passwordHash = await bcrypt.hash(password, 10);
      } else if (!campaign.passwordProtected) {
        // Enabling protection but no password provided and wasn't protected before
        return res.status(400).json({
          status: 'error',
          message: 'Password is required when enabling protection',
        });
      }
      // If password is empty and was already protected, keep existing hash
    } else {
      // Disabling protection
      passwordHash = null;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: name || campaign.name,
        description: description !== undefined ? description : campaign.description,
        category: category !== undefined ? category : campaign.category,
        logoUrl: logoUrl !== undefined ? logoUrl : campaign.logoUrl,
        passwordProtected: passwordProtected || false, // âœ… NEW
        passwordHash, // âœ… NEW
      },
    });

    console.log(`âœ… Campaign updated: ${updatedCampaign.name}${logoUrl ? ' (logo updated)' : ''}${passwordProtected ? ' [PROTECTED]' : ''}`);

    res.json({
      status: 'success',
      message: 'Campaign updated successfully',
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update campaign',
    });
  }
};

// âœ… Delete campaign
const deleteCampaign = async (req, res) => {
  try {
    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({
        status: 'error',
        message: 'Only ADMIN role can delete campaigns',
      });
    }

    const userId = req.effectiveUserId;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    await prisma.item.updateMany({
      where: { campaignId: id },
      data: { campaignId: null },
    });

    await prisma.campaign.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete campaign',
    });
  }
};

// âœ… Assign/remove item to/from campaign
const assignItemToCampaign = async (req, res) => {
  try {
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({
        status: 'error',
        message: 'VIEWER role does not have permission to assign items to campaigns',
      });
    }

    const userId = req.effectiveUserId;
    const { itemId, campaignId } = req.body;

    const item = await prisma.item.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found',
      });
    }

    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          status: 'error',
          message: 'Campaign not found',
        });
      }
    }

    await prisma.item.update({
      where: { id: itemId },
      data: { campaignId: campaignId || null },
    });

    res.json({
      status: 'success',
      message: campaignId ? 'Item assigned to campaign' : 'Item removed from campaign',
    });
  } catch (error) {
    console.error('Assign item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign item',
    });
  }
};

// âœ… FIXED: Get public campaign (with password protection check)
const getPublicCampaign = async (req, res) => {
  try {
    const { slug } = req.params;

    console.log('ðŸ“‹ Fetching campaign with slug:', slug);

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        logoUrl: true,
        qrCodeUrl: true,
        userId: true,
        createdAt: true,
        passwordProtected: true,
        passwordHash: true,
        itemOrder: true, // âœ… Fetch custom order
        items: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            slug: true,
            mediaUrl: true,
            thumbnailUrl: true,
            qrCodeUrl: true,
            fileSize: true,
            buttonText: true,
            buttonUrl: true,
            sharingEnabled: true, // âœ… CRITICAL FIX: Added sharingEnabled field!
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      console.log('âŒ Campaign not found:', slug);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    // âœ… Check if campaign is password protected
    if (campaign.passwordProtected) {
      console.log(`ðŸ”’ Campaign is password protected: ${campaign.name}`);
      
      // Return limited info indicating password is required
      return res.json({
        status: 'success',
        campaign: {
          id: campaign.id,
          slug: campaign.slug,
          name: campaign.name,
          description: campaign.description,
          logoUrl: campaign.logoUrl,
          passwordProtected: true,
          requiresPassword: true,
        },
      });
    }

    console.log('âœ… Campaign found:', campaign.name);
    console.log('ðŸ“¦ Items count:', campaign.items.length);
    if (campaign.logoUrl) {
      console.log('ðŸŽ¨ Logo URL:', campaign.logoUrl);
    }

    let userName = 'Unknown';
    try {
      const user = await prisma.user.findUnique({
        where: { id: campaign.userId },
        select: { name: true },
      });
      if (user) {
        userName = user.name;
      }
    } catch (userError) {
      console.error('âš ï¸ Could not fetch user name:', userError.message);
    }

    // âœ… Apply custom item order
    const orderedItems = applyCustomOrder(campaign.items, campaign.itemOrder);
    console.log('ðŸŽ¨ Applied custom order:', campaign.itemOrder?.length > 0 ? 'Yes' : 'No (using default)');

    // Remove passwordHash and itemOrder before sending
    const { passwordHash, itemOrder, ...campaignWithoutHash } = campaign;

    const campaignData = {
      ...campaignWithoutHash,
      items: orderedItems.map(item => ({
        ...item,
        fileSize: item.fileSize ? item.fileSize.toString() : '0',
      })),
      user: {
        name: userName,
      },
    };

    console.log('âœ… Sending campaign data');

    res.json({
      status: 'success',
      campaign: campaignData,
    });
  } catch (error) {
    console.error('âŒ Get public campaign error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign',
      error: error.message,
    });
  }
};

// âœ… FIXED: Verify campaign password and return full campaign data
const verifyCampaignPassword = async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;

    console.log(`ðŸ” Password verification attempt for campaign: ${slug}`);

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required',
      });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        logoUrl: true,
        qrCodeUrl: true,
        userId: true,
        createdAt: true,
        passwordProtected: true,
        passwordHash: true,
        itemOrder: true, // âœ… Fetch custom order
        items: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            type: true,
            mediaUrl: true,
            thumbnailUrl: true,
            qrCodeUrl: true,
            views: true,
            buttonText: true,
            buttonUrl: true,
            attachments: true,
            sharingEnabled: true, // âœ… CRITICAL FIX: Added sharingEnabled field!
            fileSize: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      console.log(`âŒ Campaign not found: ${slug}`);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    if (!campaign.passwordProtected || !campaign.passwordHash) {
      console.log(`âš ï¸ Campaign is not password protected: ${campaign.name}`);
      return res.status(400).json({
        status: 'error',
        message: 'This campaign is not password protected',
      });
    }

    // âœ… Verify password
    const isValidPassword = await bcrypt.compare(password, campaign.passwordHash);

    if (!isValidPassword) {
      console.log(`âŒ Invalid password for campaign: ${campaign.name}`);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect password',
      });
    }

    // âœ… Password is correct - return full campaign data
    console.log(`âœ… Password verified for campaign: ${campaign.name}`);

    // Get user name
    let userName = 'Unknown';
    try {
      const user = await prisma.user.findUnique({
        where: { id: campaign.userId },
        select: { name: true },
      });
      if (user) {
        userName = user.name;
      }
    } catch (userError) {
      console.error('âš ï¸ Could not fetch user name:', userError.message);
    }

    // âœ… Apply custom item order
    const orderedItems = applyCustomOrder(campaign.items, campaign.itemOrder);
    console.log('ðŸŽ¨ Applied custom order:', campaign.itemOrder?.length > 0 ? 'Yes' : 'No (using default)');

    // Remove sensitive data
    const { passwordHash, userId, itemOrder, ...campaignWithoutHash } = campaign;

    const campaignData = {
      ...campaignWithoutHash,
      items: orderedItems.map(item => ({
        ...item,
        fileSize: item.fileSize ? item.fileSize.toString() : '0',
      })),
      user: {
        name: userName,
      },
    };

    res.json({
      status: 'success',
      campaign: campaignData,
      message: 'Access granted',
    });
  } catch (error) {
    console.error('âŒ Verify campaign password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify password',
    });
  }
};

// âœ… Update campaign item order
const updateCampaignOrder = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { slug } = req.params;
    const { itemOrder } = req.body;

    console.log(`ðŸŽ¨ Updating item order for campaign: ${slug}`);
    console.log(`ðŸ“¦ New order:`, itemOrder);

    // Find campaign by slug and verify ownership
    const campaign = await prisma.campaign.findFirst({
      where: { slug, userId },
    });

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found or you do not have permission to edit it',
      });
    }

    // Update the itemOrder
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { itemOrder: itemOrder || [] },
    });

    console.log(`âœ… Item order updated successfully for campaign: ${campaign.name}`);

    res.json({
      status: 'success',
      message: 'Item order updated successfully',
    });
  } catch (error) {
    console.error('âŒ Update campaign order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update item order',
    });
  }
};

// âœ… Regenerate QR codes for a campaign (with ?s=qr tracking)
const regenerateCampaignQR = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      select: { id: true, slug: true, name: true },
    });

    if (!campaign) {
      return res.status(404).json({ status: 'error', message: 'Campaign not found' });
    }

    // Regenerate QR code with ?s=qr source tracking
    const qrCodeUrl = await generateCampaignQRCode(campaign.slug);

    await prisma.campaign.update({
      where: { id },
      data: { qrCodeUrl },
    });

    res.json({
      status: 'success',
      message: 'QR code regenerated with tracking',
      qrCodeUrl,
    });
  } catch (error) {
    console.error('Regenerate QR error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to regenerate QR code' });
  }
};

// âœ… Track a campaign page view with source (qr/nfc/direct)
const trackCampaignView = async (req, res) => {
  try {
    const { slug } = req.params;
    const { source } = req.body;
    const viewSource = (source || 'direct').toLowerCase();

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: { id: true, name: true, userId: true, viewsQr: true },
    });

    if (!campaign) {
      return res.status(404).json({ status: 'error', message: 'Campaign not found' });
    }

    // Increment total views + source-specific counter
    const incrementData = { views: { increment: 1 } };
    if (viewSource === 'qr') {
      incrementData.viewsQr = { increment: 1 };
    } else if (viewSource === 'nfc') {
      incrementData.viewsNfc = { increment: 1 };
    }

    try {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: incrementData,
      });
    } catch (updateErr) {
      // Fallback if viewsQr/viewsNfc columns don't exist yet
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { views: { increment: 1 } },
      });
    }


    // 🔔 Notify: QR scan milestone
    if (viewSource === 'qr') {
      const newCount = (campaign.viewsQr || 0) + 1;
      await notifyQrScan(campaign.userId, campaign.name, newCount);
    }
    res.json({ status: 'success', message: 'View tracked' });
  } catch (error) {
    console.error('Track campaign view error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to track view' });
  }
};

module.exports = {
  getUserCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  assignItemToCampaign,
  getPublicCampaign,
  verifyCampaignPassword,
  updateCampaignOrder,
  regenerateCampaignQR,
  trackCampaignView,
};