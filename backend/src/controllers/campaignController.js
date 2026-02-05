const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const axios = require('axios');
const { nanoid } = require('nanoid');

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

    const qrCodeBuffer = await QRCode.toBuffer(campaignUrl, {
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

    const response = await axios.put(
      `https://${bunnyHostname}/${bunnyStorageZone}/qr-codes/campaign-qr-${slug}.png`,
      qrCodeBuffer,
      {
        headers: {
          'AccessKey': bunnyStoragePassword,
          'Content-Type': 'image/png',
        },
      }
    );

    const qrCodeUrl = `https://${bunnyPullZone}/qr-codes/campaign-qr-${slug}.png`;
    return qrCodeUrl;
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
};

// ✅ Get all campaigns for authenticated user
const getUserCampaigns = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        logoUrl: true,
        qrCodeUrl: true,
        passwordProtected: true, // ✅ NEW: Include password protection status
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

// ✅ Create new campaign with optional password protection
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

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign name is required',
      });
    }

    // ✅ NEW: Validate password if protection is enabled
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

    // ✅ NEW: Hash password if provided
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
        passwordProtected: passwordProtected || false, // ✅ NEW
        passwordHash, // ✅ NEW
      },
    });

    console.log(`✅ Campaign created: ${campaign.name}${logoUrl ? ' (with logo)' : ''}${passwordProtected ? ' [PROTECTED]' : ''}`);

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

// ✅ Update campaign with password protection support
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

    // ✅ NEW: Handle password updates
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
        passwordProtected: passwordProtected || false, // ✅ NEW
        passwordHash, // ✅ NEW
      },
    });

    console.log(`✅ Campaign updated: ${updatedCampaign.name}${logoUrl ? ' (logo updated)' : ''}${passwordProtected ? ' [PROTECTED]' : ''}`);

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

// ✅ Delete campaign
const deleteCampaign = async (req, res) => {
  try {
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({
        status: 'error',
        message: 'VIEWER role does not have permission to delete campaigns',
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

// ✅ Assign/remove item to/from campaign
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

// ✅ FIXED: Get public campaign (with password protection check)
const getPublicCampaign = async (req, res) => {
  try {
    const { slug } = req.params;

    console.log('📋 Fetching campaign with slug:', slug);

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
        itemOrder: true, // ✅ Fetch custom order
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
            sharingEnabled: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      console.log('❌ Campaign not found:', slug);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    // ✅ Check if campaign is password protected
    if (campaign.passwordProtected) {
      console.log(`🔒 Campaign is password protected: ${campaign.name}`);
      
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

    console.log('✅ Campaign found:', campaign.name);
    console.log('📦 Items count:', campaign.items.length);
    if (campaign.logoUrl) {
      console.log('🎨 Logo URL:', campaign.logoUrl);
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
      console.error('⚠️ Could not fetch user name:', userError.message);
    }

    // ✅ Apply custom item order
    const orderedItems = applyCustomOrder(campaign.items, campaign.itemOrder);
    console.log('🎨 Applied custom order:', campaign.itemOrder?.length > 0 ? 'Yes' : 'No (using default)');

    // Remove passwordHash and itemOrder before sending
    const { passwordHash, itemOrder, ...campaignWithoutHash } = campaign;

    // Fetch itemOrder safely - use try/catch to handle invalid stored values
    let orderedItems = campaign.items;
    try {
      const rawResult = await prisma.$queryRawUnsafe(
        `SELECT "itemOrder"::text as "itemOrderText" FROM "Campaign" WHERE "id" = $1`,
        campaign.id
      );
      const rawText = rawResult?.[0]?.itemOrderText;
      let itemOrder = null;

      if (rawText && rawText !== 'null' && rawText !== '[]') {
        try {
          const parsed = JSON.parse(rawText);
          // Handle both array format and corrupted object format from Prisma
          if (Array.isArray(parsed)) {
            itemOrder = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Prisma stored array as {"0":"id1","1":"id2"} - convert back to array
            itemOrder = Object.keys(parsed).sort((a, b) => Number(a) - Number(b)).map(k => parsed[k]);
            console.log('⚠️ Converted object-format itemOrder to array');
          }
        } catch (e) {
          itemOrder = null;
        }
      }

      console.log('📋 itemOrder loaded:', Array.isArray(itemOrder) ? `${itemOrder.length} items` : 'none');

      if (Array.isArray(itemOrder) && itemOrder.length > 0) {
        const itemsMap = new Map(campaign.items.map(item => [item.id, item]));
        const sorted = itemOrder
          .map(id => itemsMap.get(id))
          .filter(Boolean);
        campaign.items.forEach(item => {
          if (!itemOrder.includes(item.id)) {
            sorted.push(item);
          }
        });
        orderedItems = sorted;
        console.log('✅ Applied custom order:', sorted.map(i => i.title).join(', '));
      }
    } catch (orderError) {
      console.error('⚠️ Could not fetch item order, using default:', orderError.message);
    }

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

    console.log('✅ Sending campaign data');

    res.json({
      status: 'success',
      campaign: campaignData,
    });
  } catch (error) {
    console.error('❌ Get public campaign error:', error);
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

// ✅ FIXED: Verify campaign password and return full campaign data
const verifyCampaignPassword = async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;

    console.log(`🔐 Password verification attempt for campaign: ${slug}`);

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
            sharingEnabled: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      console.log(`❌ Campaign not found: ${slug}`);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    if (!campaign.passwordProtected || !campaign.passwordHash) {
      console.log(`⚠️ Campaign is not password protected: ${campaign.name}`);
      return res.status(400).json({
        status: 'error',
        message: 'This campaign is not password protected',
      });
    }

    // ✅ Verify password
    const isValidPassword = await bcrypt.compare(password, campaign.passwordHash);

    if (!isValidPassword) {
      console.log(`❌ Invalid password for campaign: ${campaign.name}`);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect password',
      });
    }

    // ✅ Password is correct - return full campaign data
    console.log(`✅ Password verified for campaign: ${campaign.name}`);

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
      console.error('⚠️ Could not fetch user name:', userError.message);
    }

    // ✅ Apply custom item order
    const orderedItems = applyCustomOrder(campaign.items, campaign.itemOrder);
    console.log('🎨 Applied custom order:', campaign.itemOrder?.length > 0 ? 'Yes' : 'No (using default)');

    // Remove sensitive data
    const { passwordHash, userId, itemOrder, ...campaignWithoutHash } = campaign;

    // Fetch itemOrder safely - use try/catch to handle invalid stored values
    let orderedItems = campaign.items;
    try {
      const rawResult = await prisma.$queryRawUnsafe(
        `SELECT "itemOrder"::text as "itemOrderText" FROM "Campaign" WHERE "id" = $1`,
        campaign.id
      );
      const rawText = rawResult?.[0]?.itemOrderText;
      let itemOrder = null;

      if (rawText && rawText !== 'null' && rawText !== '[]') {
        try {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed)) {
            itemOrder = parsed;
          } else if (parsed && typeof parsed === 'object') {
            itemOrder = Object.keys(parsed).sort((a, b) => Number(a) - Number(b)).map(k => parsed[k]);
          }
        } catch (e) {
          itemOrder = null;
        }
      }

      if (Array.isArray(itemOrder) && itemOrder.length > 0) {
        const itemsMap = new Map(campaign.items.map(item => [item.id, item]));
        const sorted = itemOrder
          .map(id => itemsMap.get(id))
          .filter(Boolean);
        campaign.items.forEach(item => {
          if (!itemOrder.includes(item.id)) {
            sorted.push(item);
          }
        });
        orderedItems = sorted;
      }
    } catch (orderError) {
      console.error('⚠️ Could not fetch item order, using default:', orderError.message);
    }

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
    console.error('❌ Verify campaign password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify password',
    });
  }
};

// ✅ Update campaign item order (drag-and-drop reorder)
const updateCampaignItemOrder = async (req, res) => {
  try {
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({
        status: 'error',
        message: 'VIEWER role does not have permission to reorder campaign items',
      });
    }

    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { itemOrder } = req.body;

    console.log(`📦 Reorder request: campaignId=${id}, userId=${userId}, items=${Array.isArray(itemOrder) ? itemOrder.length : 'not-array'}`);

    if (!Array.isArray(itemOrder)) {
      console.log('❌ itemOrder is not an array:', typeof itemOrder);
      return res.status(400).json({
        status: 'error',
        message: 'itemOrder must be an array of item IDs',
      });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    if (!campaign) {
      console.log(`❌ Campaign not found for id=${id}, userId=${userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    // Use raw SQL to store as proper JSONB array (Prisma Json type can corrupt arrays to objects)
    if (itemOrder.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Campaign" SET "itemOrder" = $1::jsonb WHERE "id" = $2`,
        JSON.stringify(itemOrder),
        id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "Campaign" SET "itemOrder" = NULL WHERE "id" = $1`,
        id
      );
    }

    // Verify the save by reading it back
    const verifyResult = await prisma.$queryRawUnsafe(
      `SELECT "itemOrder"::text as "itemOrderText" FROM "Campaign" WHERE "id" = $1`,
      id
    );
    console.log(`✅ Campaign item order saved: ${campaign.name} (${itemOrder.length} items)`);
    console.log(`📋 Verified stored value: ${verifyResult?.[0]?.itemOrderText?.substring(0, 200)}`);

    res.json({
      status: 'success',
      message: 'Item order updated successfully',
    });
  } catch (error) {
    console.error('Update item order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update item order',
    });
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
  updateCampaignItemOrder,
};