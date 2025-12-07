const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');
const { nanoid } = require('nanoid');

const prisma = new PrismaClient();

// Generate unique slug
const generateUniqueSlug = async () => {
  let slug;
  let exists = true;

  while (exists) {
    slug = nanoid(8); // Generate 8-character random string
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

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(campaignUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#800080',  // Purple
        light: '#FFFFFF',
      },
    });

    // Upload to Bunny CDN
    const form = new FormData();
    form.append('file', qrCodeBuffer, {
      filename: `campaign-qr-${slug}.png`,
      contentType: 'image/png',
    });

    const response = await axios.post(
      `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/qr-codes/campaign-qr-${slug}.png`,
      qrCodeBuffer,
      {
        headers: {
          'AccessKey': process.env.BUNNY_API_KEY,
          'Content-Type': 'image/png',
        },
      }
    );

    const qrCodeUrl = `https://${process.env.BUNNY_CDN_HOSTNAME}/qr-codes/campaign-qr-${slug}.png`;
    return qrCodeUrl;
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
};

const getUserCampaigns = async (req, res) => {
  try {
    const userId = req.user.userId;

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
    const userId = req.user.userId;
    const { name, description, category } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Campaign name is required',
      });
    }

    // Generate unique slug
    const slug = await generateUniqueSlug();

    // Generate QR code
    const qrCodeUrl = await generateCampaignQRCode(slug);

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        slug,
        name,
        description: description || null,
        category: category || null,
        qrCodeUrl,
      },
    });

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
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, description, category } = req.body;

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
      },
    });

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
    const userId = req.user.userId;
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
    const userId = req.user.userId;
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

// 🆕 NEW: Get public campaign data
const getPublicCampaign = async (req, res) => {
  try {
    const { slug } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }

    res.json({
      status: 'success',
      campaign,
    });
  } catch (error) {
    console.error('Get public campaign error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign',
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