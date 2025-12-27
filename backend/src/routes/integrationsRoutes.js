const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ========== WEBHOOKS ==========

// Get all webhooks
router.get('/webhooks', authMiddleware, async (req, res) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      webhooks
    });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch webhooks'
    });
  }
});

// Create webhook
router.post('/webhooks', authMiddleware, async (req, res) => {
  try {
    const { name, url, events } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Webhook name is required'
      });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Webhook URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook URL format'
      });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one event must be selected'
      });
    }

    // Generate webhook secret for signature verification
    const secret = 'whsec_' + crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        userId: req.user.userId,
        name: name.trim(),
        url: url.trim(),
        events,
        secret,
        active: true
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'Webhook Created',
        metadata: { webhookName: name, events }
      }
    });

    res.json({
      status: 'success',
      webhook
    });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create webhook'
    });
  }
});

// Delete webhook
router.delete('/webhooks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify webhook belongs to user
    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    await prisma.webhook.delete({
      where: { id }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'Webhook Deleted',
        metadata: { webhookName: webhook.name }
      }
    });

    res.json({
      status: 'success',
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete webhook'
    });
  }
});

// Toggle webhook active status
router.put('/webhooks/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: { active: !webhook.active }
    });

    res.json({
      status: 'success',
      webhook: updated
    });
  } catch (error) {
    console.error('Toggle webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle webhook'
    });
  }
});

// Test webhook
router.post('/webhooks/:id/test', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    // Send test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Outbound Impact'
      }
    };

    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');

    await axios.post(webhook.url, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      timeout: 10000
    });

    res.json({
      status: 'success',
      message: 'Test webhook sent successfully'
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: error.response?.data?.message || 'Failed to send test webhook'
    });
  }
});

// ========== INTEGRATIONS ==========

// Get all integrations
router.get('/integrations', authMiddleware, async (req, res) => {
  try {
    const integrations = await prisma.integration.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      integrations
    });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch integrations'
    });
  }
});

// Connect integration
router.post('/integrations', authMiddleware, async (req, res) => {
  try {
    const { type, name, config } = req.body;

    if (!type || !['zapier', 'slack', 'google-drive', 'dropbox'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid integration type'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Integration name is required'
      });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Integration configuration is required'
      });
    }

    // Validate config based on type
    if (type === 'zapier' && !config.webhookUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Zapier webhook URL is required'
      });
    }

    if (type === 'slack' && (!config.webhookUrl || !config.channel)) {
      return res.status(400).json({
        status: 'error',
        message: 'Slack webhook URL and channel are required'
      });
    }

    const integration = await prisma.integration.create({
      data: {
        userId: req.user.userId,
        type,
        name: name.trim(),
        config,
        active: true
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'Integration Connected',
        metadata: { integrationType: type, integrationName: name }
      }
    });

    res.json({
      status: 'success',
      integration
    });
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect integration'
    });
  }
});

// Delete integration
router.delete('/integrations/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await prisma.integration.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!integration) {
      return res.status(404).json({
        status: 'error',
        message: 'Integration not found'
      });
    }

    await prisma.integration.delete({
      where: { id }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'Integration Disconnected',
        metadata: { integrationType: integration.type, integrationName: integration.name }
      }
    });

    res.json({
      status: 'success',
      message: 'Integration disconnected successfully'
    });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to disconnect integration'
    });
  }
});

// Toggle integration active status
router.put('/integrations/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await prisma.integration.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!integration) {
      return res.status(404).json({
        status: 'error',
        message: 'Integration not found'
      });
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: { active: !integration.active }
    });

    res.json({
      status: 'success',
      integration: updated
    });
  } catch (error) {
    console.error('Toggle integration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle integration'
    });
  }
});

// ========== WEBHOOK TRIGGER FUNCTION ==========
// Call this function when events occur to trigger webhooks
async function triggerWebhooks(userId, eventType, data) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        active: true,
        events: {
          has: eventType
        }
      }
    });

    for (const webhook of webhooks) {
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data
      };

      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Send webhook asynchronously (don't wait for response)
      axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        timeout: 10000
      }).catch(error => {
        console.error(`Webhook ${webhook.id} failed:`, error.message);
      });
    }
  } catch (error) {
    console.error('Trigger webhooks error:', error);
  }
}

module.exports = router;
module.exports.triggerWebhooks = triggerWebhooks;