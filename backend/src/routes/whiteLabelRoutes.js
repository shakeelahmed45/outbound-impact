const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ TEST ROUTE - No auth required - just to verify route works
router.get('/test', async (req, res) => {
  try {
    res.json({
      status: 'success',
      message: 'White label route is working!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ✅ Get current user's white label settings (protected route)
router.get('/branding', authMiddleware, async (req, res) => {
  try {
    console.log('📝 GET /branding - User ID:', req.user?.userId);
    
    // ✅ FIXED: Changed from whiteLabelBranding to whiteLabelSettings
    const settings = await prisma.whiteLabelSettings.findUnique({
      where: { userId: req.user.userId }
    });

    console.log('📝 Found settings:', settings ? 'Yes' : 'No (first time user)');

    if (!settings) {
      return res.json({
        status: 'success',
        branding: null
      });
    }

    res.json({
      status: 'success',
      branding: settings
    });
  } catch (error) {
    console.error('❌ Get white label settings error:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get white label settings',
      error: error.message
    });
  }
});

// ✅ Get branding for specific user (public route for QR code viewing)
router.get('/branding/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📝 GET /branding/:userId - User ID:', userId);
    
    const settings = await prisma.whiteLabelSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      return res.json({
        status: 'success',
        branding: null
      });
    }

    res.json({
      status: 'success',
      branding: {
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor
      }
    });
  } catch (error) {
    console.error('❌ Get public branding error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get branding',
      error: error.message
    });
  }
});

// ✅ Update white label settings
router.put('/branding', authMiddleware, async (req, res) => {
  try {
    console.log('📝 PUT /branding - User ID:', req.user?.userId);
    console.log('📝 Request body:', req.body);
    
    const { 
      primaryColor, 
      secondaryColor, 
      accentColor,
      customDomain, 
      emailFromName,
      emailReplyTo,
      footerText
    } = req.body;

    const settings = await prisma.whiteLabelSettings.upsert({
      where: { userId: req.user.userId },
      update: {
        primaryColor,
        secondaryColor,
        accentColor,
        customDomain,
        emailFromName,
        emailReplyTo,
        footerText
      },
      create: {
        userId: req.user.userId,
        primaryColor,
        secondaryColor,
        accentColor,
        customDomain,
        emailFromName,
        emailReplyTo,
        footerText
      }
    });

    console.log('✅ Settings saved successfully');

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'White Label Settings Updated'
      }
    });

    res.json({
      status: 'success',
      message: 'White label settings saved successfully',
      branding: settings
    });
  } catch (error) {
    console.error('❌ Update white label settings error:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

// ✅ Delete white label settings (reset to default)
router.delete('/branding', authMiddleware, async (req, res) => {
  try {
    console.log('📝 DELETE /branding - User ID:', req.user?.userId);
    
    await prisma.whiteLabelSettings.delete({
      where: { userId: req.user.userId }
    });

    console.log('✅ Settings deleted successfully');

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'White Label Settings Reset to Default'
      }
    });

    res.json({
      status: 'success',
      message: 'Settings reset to default'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('📝 No settings to delete (first time user)');
      return res.json({
        status: 'success',
        message: 'No custom settings to delete'
      });
    }
    
    console.error('❌ Delete white label settings error:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset settings',
      error: error.message
    });
  }
});

module.exports = router;