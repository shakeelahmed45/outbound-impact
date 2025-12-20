const prisma = require('../lib/prisma');
const QRCode = require('qrcode');
const axios = require('axios');
const { nanoid } = require('nanoid');

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

const getUserCampaigns = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
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

const createCampaign = async (req, res) => {
  try {
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({
        status: 'error',
        message: 'VIEWER role does not have permission to create campaigns',
      });
    }

    const userId = req.effectiveUserId;
    const { name, description, category, logoUrl } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign name is required',
      });
    }

    const slug = await generateUniqueSlug();
    const qrCodeUrl = await generateCampaignQRCode(slug);

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        slug,
        name,
        description: description || null,
        category: category || null,
        logoUrl: logoUrl || null,
        qrCodeUrl,
      },
    });

    console.log(`✅ Campaign created: ${campaign.name}${logoUrl ? ' (with logo)' : ''}`);

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
    const { name, description, category, logoUrl } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: name || campaign.name,
        description: description !== undefined ? description : campaign.description,
        category: category !== undefined ? category : campaign.category,
        logoUrl: logoUrl !== undefined ? logoUrl : campaign.logoUrl,
      },
    });

    console.log(`✅ Campaign updated: ${updatedCampaign.name}${logoUrl ? ' (logo updated)' : ''}`);

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

const getPublicCampaign = async (req, res) => {
  try {
    const { slug } = req.params;

    console.log('📋 Fetching campaign with slug:', slug);

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      include: {
        items: {
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

    const campaignData = {
      ...campaign,
      items: campaign.items.map(item => ({
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

module.exports = {
  getUserCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  assignItemToCampaign,
  getPublicCampaign,
};