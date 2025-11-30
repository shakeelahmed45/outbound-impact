const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const { deleteFromBunny } = require('../services/bunnyService');

const prisma = new PrismaClient();

const getUserItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search, type } = req.query;

    const where = {
      userId,
      ...(type && { type }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        slug: true,
        mediaUrl: true,
        qrCodeUrl: true,
        fileSize: true,
        campaignId: true,
        createdAt: true,
      }
    });

    res.json({
      status: 'success',
      items: items.map(item => ({
        ...item,
        fileSize: item.fileSize.toString(),
        publicUrl: `${process.env.FRONTEND_URL}/l/${item.slug}`,
      }))
    });

  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch items'
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const item = await prisma.item.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        slug: true,
        mediaUrl: true,
        qrCodeUrl: true,
        fileSize: true,
        createdAt: true,
      }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    res.json({
      status: 'success',
      item: {
        ...item,
        fileSize: item.fileSize.toString(),
        publicUrl: `${process.env.FRONTEND_URL}/l/${item.slug}`,
      }
    });

  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch item'
    });
  }
};

// PUBLIC ROUTE - Get item by slug (no auth required)
const getPublicItem = async (req, res) => {
  try {
    const { slug } = req.params;

    const item = await prisma.item.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    res.json({
      status: 'success',
      item: {
        ...item,
        fileSize: item.fileSize.toString(),
      }
    });

  } catch (error) {
    console.error('Get public item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch item'
    });
  }
};

const generateQRCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const item = await prisma.item.findFirst({
      where: { id, userId }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    const publicUrl = `${process.env.FRONTEND_URL}/l/${item.slug}`;
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#800080',
        light: '#FFFFFF',
      },
    });

    await prisma.item.update({
      where: { id },
      data: { qrCodeUrl: qrCodeDataUrl }
    });

    res.json({
      status: 'success',
      qrCode: qrCodeDataUrl,
      publicUrl,
    });

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate QR code'
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, description } = req.body;

    const item = await prisma.item.findFirst({
      where: { id, userId }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
      }
    });

    res.json({
      status: 'success',
      message: 'Item updated successfully',
      item: {
        ...updatedItem,
        fileSize: updatedItem.fileSize.toString(),
      }
    });

  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update item'
    });
  }
};

const deleteItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const item = await prisma.item.findFirst({
      where: { id, userId }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    // Delete from Bunny.net if it's a CDN URL
    if (item.type !== 'TEXT' && item.mediaUrl.includes('b-cdn.net')) {
      const urlPath = new URL(item.mediaUrl).pathname;
      await deleteFromBunny(urlPath);
    }

    await prisma.item.delete({ where: { id } });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true }
    });

    const newStorageUsed = Math.max(0, Number(user.storageUsed) - Number(item.fileSize));

    await prisma.user.update({
      where: { id: userId },
      data: { storageUsed: BigInt(newStorageUsed) }
    });

    res.json({
      status: 'success',
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete item'
    });
  }
};

module.exports = {
  getUserItems,
  getItemById,
  getPublicItem,
  generateQRCode,
  updateItem,
  deleteItem,
};