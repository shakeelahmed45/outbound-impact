const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// GET ALL ITEMS
// ═══════════════════════════════════════════════════════════
const getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          },
          campaign: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.item.count()
    ]);

    res.json({
      status: 'success',
      items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch items'
    });
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE ITEM
// ═══════════════════════════════════════════════════════════
const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    await prisma.item.delete({
      where: { id: itemId }
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
  getAllItems,
  deleteItem
};