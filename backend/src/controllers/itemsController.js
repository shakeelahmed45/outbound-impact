const { PrismaClient } = require('@prisma/client');
const { deleteFromBunny, uploadToBunny, generateFileName } = require('../services/bunnyService');

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

    // Fetch all fields without explicit select to avoid column issues
    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        slug: item.slug,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl || null,
        qrCodeUrl: item.qrCodeUrl || null,
        fileSize: item.fileSize.toString(),
        campaignId: item.campaignId,
        views: item.views || 0,
        createdAt: item.createdAt,
        publicUrl: `${process.env.FRONTEND_URL}/l/${item.slug}`,
      }))
    });

  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch items: ' + error.message
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const item = await prisma.item.findFirst({
      where: { id, userId },
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
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        slug: item.slug,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl || null,
        qrCodeUrl: item.qrCodeUrl || null,
        fileSize: item.fileSize.toString(),
        views: item.views || 0,
        createdAt: item.createdAt,
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

    // Update view count
    await prisma.item.update({
      where: { id: item.id },
      data: {
        views: { increment: 1 }
      }
    });

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

// Upload custom thumbnail
const uploadThumbnail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { thumbnailData, fileName } = req.body;

    if (!thumbnailData) {
      return res.status(400).json({
        status: 'error',
        message: 'Thumbnail data is required'
      });
    }

    const item = await prisma.item.findFirst({
      where: { id, userId }
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    // Delete old thumbnail from CDN if exists and is different from mediaUrl
    if (item.thumbnailUrl && item.thumbnailUrl !== item.mediaUrl && item.thumbnailUrl.includes('b-cdn.net')) {
      try {
        const urlPath = new URL(item.thumbnailUrl).pathname;
        await deleteFromBunny(urlPath);
      } catch (err) {
        console.log('Could not delete old thumbnail:', err.message);
      }
    }

    // Upload new thumbnail
    const uniqueFileName = generateFileName(fileName || 'thumbnail.jpg', `${userId}-thumb`);
    const base64Data = thumbnailData.split(',')[1] || thumbnailData;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    const uploadResult = await uploadToBunny(
      fileBuffer,
      uniqueFileName,
      'thumbnails'
    );

    let thumbnailUrl;
    if (uploadResult.success) {
      thumbnailUrl = uploadResult.url;
    } else {
      thumbnailUrl = thumbnailData; // Fallback to base64
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: { thumbnailUrl }
    });

    res.json({
      status: 'success',
      message: 'Thumbnail updated successfully',
      item: {
        ...updatedItem,
        fileSize: updatedItem.fileSize.toString(),
      }
    });

  } catch (error) {
    console.error('Upload thumbnail error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload thumbnail: ' + error.message
    });
  }
};

// Remove custom thumbnail (revert to auto-generated or null)
const removeThumbnail = async (req, res) => {
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

    // Delete thumbnail from CDN if exists and is different from mediaUrl
    if (item.thumbnailUrl && item.thumbnailUrl !== item.mediaUrl && item.thumbnailUrl.includes('b-cdn.net')) {
      try {
        const urlPath = new URL(item.thumbnailUrl).pathname;
        await deleteFromBunny(urlPath);
      } catch (err) {
        console.log('Could not delete thumbnail:', err.message);
      }
    }

    // Set thumbnail to mediaUrl for images, null for others
    let newThumbnailUrl = null;
    if (item.type === 'IMAGE') {
      newThumbnailUrl = item.mediaUrl;
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: { thumbnailUrl: newThumbnailUrl }
    });

    res.json({
      status: 'success',
      message: 'Thumbnail removed successfully',
      item: {
        ...updatedItem,
        fileSize: updatedItem.fileSize.toString(),
      }
    });

  } catch (error) {
    console.error('Remove thumbnail error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove thumbnail'
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

    // Delete media from Bunny.net if it's a CDN URL
    if (item.type !== 'TEXT' && item.mediaUrl && item.mediaUrl.includes('b-cdn.net')) {
      try {
        const urlPath = new URL(item.mediaUrl).pathname;
        await deleteFromBunny(urlPath);
      } catch (err) {
        console.log('Could not delete from CDN:', err.message);
      }
    }

    // Delete thumbnail from Bunny.net if it's a separate file
    if (item.thumbnailUrl && item.thumbnailUrl !== item.mediaUrl && item.thumbnailUrl.includes('b-cdn.net')) {
      try {
        const urlPath = new URL(item.thumbnailUrl).pathname;
        await deleteFromBunny(urlPath);
      } catch (err) {
        console.log('Could not delete thumbnail:', err.message);
      }
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
  updateItem,
  uploadThumbnail,
  removeThumbnail,
  deleteItem,
};