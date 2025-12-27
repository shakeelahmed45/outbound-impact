const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all API keys for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      apiKeys
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch API keys'
    });
  }
});

// Generate new API key
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'API key name is required'
      });
    }

    // Generate secure random API key
    const key = 'ent_live_' + crypto.randomBytes(32).toString('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user.userId,
        name: name.trim(),
        key
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'API Key Generated',
        metadata: { keyName: name }
      }
    });

    res.json({
      status: 'success',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate API key'
    });
  }
});

// Revoke API key
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify key belongs to user
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!apiKey) {
      return res.status(404).json({
        status: 'error',
        message: 'API key not found'
      });
    }

    await prisma.apiKey.delete({
      where: { id }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'API Key Revoked',
        metadata: { keyName: apiKey.name }
      }
    });

    res.json({
      status: 'success',
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke API key'
    });
  }
});

// Middleware to validate API key for external API calls
const validateApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Missing or invalid API key'
      });
    }

    const key = authHeader.substring(7);

    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: { user: true }
    });

    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid API key'
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() }
    });

    req.user = apiKey.user;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'API key validation failed'
    });
  }
};

module.exports = router;
module.exports.validateApiKey = validateApiKey;