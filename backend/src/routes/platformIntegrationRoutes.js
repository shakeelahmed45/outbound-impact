const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const QRCode = require('qrcode');
const crypto = require('crypto');

// ========================================
// SHOPIFY INTEGRATION
// ========================================

router.post('/shopify/connect', authMiddleware, async (req, res) => {
  try {
    const { shopifyStore, accessToken } = req.body;

    if (!shopifyStore || !accessToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Store URL and access token are required'
      });
    }

    const storeRegex = /^[a-zA-Z0-9-]+\.myshopify\.com$/;
    if (!storeRegex.test(shopifyStore)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid Shopify store format. Should be: mystore.myshopify.com'
      });
    }

    try {
      const shopResponse = await axios.get(
        `https://${shopifyStore}/admin/api/2024-01/shop.json`,
        {
          headers: { 'X-Shopify-Access-Token': accessToken }
        }
      );

      const shopName = shopResponse.data.shop.name;

      const integration = await prisma.integration.upsert({
        where: {
          userId_type: {
            userId: req.user.userId,
            type: 'shopify'
          }
        },
        update: {
          name: shopName,
          config: {
            store: shopifyStore,
            accessToken: accessToken,
            shopName: shopName
          },
          active: true
        },
        create: {
          userId: req.user.userId,
          type: 'shopify',
          name: shopName,
          config: {
            store: shopifyStore,
            accessToken: accessToken,
            shopName: shopName
          },
          active: true
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'Shopify Store Connected',
          metadata: { shopName, store: shopifyStore }
        }
      });

      res.json({
        status: 'success',
        message: 'Shopify store connected successfully',
        integration,
        shopName
      });

    } catch (error) {
      console.error('Shopify connection error:', error.response?.data || error.message);
      return res.status(400).json({
        status: 'error',
        message: 'Failed to connect to Shopify. Please check your credentials.'
      });
    }
  } catch (error) {
    console.error('Connect Shopify error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect Shopify store'
    });
  }
});

router.post('/shopify/import', authMiddleware, async (req, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        userId: req.user.userId,
        type: 'shopify',
        active: true
      }
    });

    if (!integration) {
      return res.status(400).json({
        status: 'error',
        message: 'Shopify not connected'
      });
    }

    const { store, accessToken } = integration.config;

    const productsResponse = await axios.get(
      `https://${store}/admin/api/2024-01/products.json?limit=250`,
      {
        headers: { 'X-Shopify-Access-Token': accessToken }
      }
    );

    const products = productsResponse.data.products;
    let importedCount = 0;

    for (const product of products) {
      try {
        const slug = crypto.randomBytes(4).toString('hex');
        const imageUrl = product.images?.[0]?.src || null;
        
        const item = await prisma.item.create({
          data: {
            userId: req.user.userId,
            slug: slug,
            title: product.title,
            description: product.body_html || product.title,
            type: 'IMAGE',
            mediaUrl: imageUrl || 'https://via.placeholder.com/400',
            fileSize: 0,
            thumbnailUrl: imageUrl
          }
        });

        const publicUrl = `${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/${slug}`;
        const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
          width: 500,
          margin: 2,
          color: { dark: '#800080', light: '#FFFFFF' }
        });

        await prisma.item.update({
          where: { id: item.id },
          data: { qrCodeUrl: qrCodeDataUrl }
        });

        importedCount++;
      } catch (error) {
        console.error(`Failed to import product ${product.title}:`, error);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'Shopify Products Imported',
        metadata: { productsImported: importedCount }
      }
    });

    res.json({
      status: 'success',
      message: `Imported ${importedCount} products`,
      stats: { productsImported: importedCount, qrCodesGenerated: importedCount }
    });
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to import products'
    });
  }
});

// ========================================
// WOOCOMMERCE INTEGRATION
// ========================================

router.post('/woocommerce/connect', authMiddleware, async (req, res) => {
  try {
    const { siteUrl, consumerKey, consumerSecret } = req.body;

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    try {
      const response = await axios.get(
        `${siteUrl}/wp-json/wc/v3/system_status`,
        {
          auth: {
            username: consumerKey,
            password: consumerSecret
          }
        }
      );

      const siteName = response.data.settings?.site_title?.value || siteUrl;

      const integration = await prisma.integration.upsert({
        where: {
          userId_type: {
            userId: req.user.userId,
            type: 'woocommerce'
          }
        },
        update: {
          name: siteName,
          config: { siteUrl, consumerKey, consumerSecret },
          active: true
        },
        create: {
          userId: req.user.userId,
          type: 'woocommerce',
          name: siteName,
          config: { siteUrl, consumerKey, consumerSecret },
          active: true
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'WooCommerce Store Connected',
          metadata: { siteName, siteUrl }
        }
      });

      res.json({
        status: 'success',
        message: 'WooCommerce store connected successfully',
        integration,
        siteName
      });
    } catch (error) {
      console.error('WooCommerce connection error:', error);
      return res.status(400).json({
        status: 'error',
        message: 'Failed to connect to WooCommerce. Please check your credentials.'
      });
    }
  } catch (error) {
    console.error('Connect WooCommerce error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect WooCommerce store'
    });
  }
});

router.post('/woocommerce/import', authMiddleware, async (req, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        userId: req.user.userId,
        type: 'woocommerce',
        active: true
      }
    });

    if (!integration) {
      return res.status(400).json({
        status: 'error',
        message: 'WooCommerce not connected'
      });
    }

    const { siteUrl, consumerKey, consumerSecret } = integration.config;

    const productsResponse = await axios.get(
      `${siteUrl}/wp-json/wc/v3/products?per_page=100`,
      {
        auth: {
          username: consumerKey,
          password: consumerSecret
        }
      }
    );

    const products = productsResponse.data;
    let importedCount = 0;

    for (const product of products) {
      try {
        const slug = crypto.randomBytes(4).toString('hex');
        const imageUrl = product.images?.[0]?.src || null;
        
        const item = await prisma.item.create({
          data: {
            userId: req.user.userId,
            slug: slug,
            title: product.name,
            description: product.description || product.name,
            type: 'IMAGE',
            mediaUrl: imageUrl || 'https://via.placeholder.com/400',
            fileSize: 0,
            thumbnailUrl: imageUrl
          }
        });

        const publicUrl = `${process.env.FRONTEND_URL}/${slug}`;
        const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
          width: 500,
          margin: 2,
          color: { dark: '#800080', light: '#FFFFFF' }
        });

        await prisma.item.update({
          where: { id: item.id },
          data: { qrCodeUrl: qrCodeDataUrl }
        });

        importedCount++;
      } catch (error) {
        console.error(`Failed to import product ${product.name}:`, error);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'WooCommerce Products Imported',
        metadata: { productsImported: importedCount }
      }
    });

    res.json({
      status: 'success',
      message: `Imported ${importedCount} products`,
      stats: { productsImported: importedCount, qrCodesGenerated: importedCount }
    });
  } catch (error) {
    console.error('Import WooCommerce products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to import products'
    });
  }
});

// ========================================
// BIGCOMMERCE INTEGRATION
// ========================================

router.post('/bigcommerce/connect', authMiddleware, async (req, res) => {
  try {
    const { storeHash, accessToken } = req.body;

    if (!storeHash || !accessToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Store hash and access token are required'
      });
    }

    try {
      const response = await axios.get(
        `https://api.bigcommerce.com/stores/${storeHash}/v2/store`,
        {
          headers: {
            'X-Auth-Token': accessToken,
            'Accept': 'application/json'
          }
        }
      );

      const storeName = response.data.name;

      const integration = await prisma.integration.upsert({
        where: {
          userId_type: {
            userId: req.user.userId,
            type: 'bigcommerce'
          }
        },
        update: {
          name: storeName,
          config: { storeHash, accessToken },
          active: true
        },
        create: {
          userId: req.user.userId,
          type: 'bigcommerce',
          name: storeName,
          config: { storeHash, accessToken },
          active: true
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'BigCommerce Store Connected',
          metadata: { storeName, storeHash }
        }
      });

      res.json({
        status: 'success',
        message: 'BigCommerce store connected successfully',
        integration,
        storeName
      });
    } catch (error) {
      console.error('BigCommerce connection error:', error);
      return res.status(400).json({
        status: 'error',
        message: 'Failed to connect to BigCommerce. Please check your credentials.'
      });
    }
  } catch (error) {
    console.error('Connect BigCommerce error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect BigCommerce store'
    });
  }
});

router.post('/bigcommerce/import', authMiddleware, async (req, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        userId: req.user.userId,
        type: 'bigcommerce',
        active: true
      }
    });

    if (!integration) {
      return res.status(400).json({
        status: 'error',
        message: 'BigCommerce not connected'
      });
    }

    const { storeHash, accessToken } = integration.config;

    const productsResponse = await axios.get(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=250`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json'
        }
      }
    );

    const products = productsResponse.data.data;
    let importedCount = 0;

    for (const product of products) {
      try {
        const slug = crypto.randomBytes(4).toString('hex');
        
        const item = await prisma.item.create({
          data: {
            userId: req.user.userId,
            slug: slug,
            title: product.name,
            description: product.description || product.name,
            type: 'IMAGE',
            mediaUrl: product.images?.[0]?.url_standard || 'https://via.placeholder.com/400',
            fileSize: 0,
            thumbnailUrl: product.images?.[0]?.url_thumbnail
          }
        });

        const publicUrl = `${process.env.FRONTEND_URL}/${slug}`;
        const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
          width: 500,
          margin: 2,
          color: { dark: '#800080', light: '#FFFFFF' }
        });

        await prisma.item.update({
          where: { id: item.id },
          data: { qrCodeUrl: qrCodeDataUrl }
        });

        importedCount++;
      } catch (error) {
        console.error(`Failed to import product ${product.name}:`, error);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'BigCommerce Products Imported',
        metadata: { productsImported: importedCount }
      }
    });

    res.json({
      status: 'success',
      message: `Imported ${importedCount} products`,
      stats: { productsImported: importedCount, qrCodesGenerated: importedCount }
    });
  } catch (error) {
    console.error('Import BigCommerce products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to import products'
    });
  }
});

// ========================================
// UNIVERSAL DISCONNECT & STATUS
// ========================================

router.delete('/:platform/disconnect', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.params;
    
    await prisma.integration.deleteMany({
      where: {
        userId: req.user.userId,
        type: platform
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: `${platform} Store Disconnected`
      }
    });

    res.json({
      status: 'success',
      message: `${platform} store disconnected`
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to disconnect store'
    });
  }
});

router.get('/:platform/status', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.params;
    
    const integration = await prisma.integration.findFirst({
      where: {
        userId: req.user.userId,
        type: platform,
        active: true
      }
    });

    if (!integration) {
      return res.json({
        status: 'success',
        connected: false
      });
    }

    const productCount = await prisma.item.count({
      where: { userId: req.user.userId }
    });

    res.json({
      status: 'success',
      connected: true,
      storeName: integration.name,
      stats: {
        products: productCount,
        qrCodes: productCount
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get status'
    });
  }
});

// ========================================
// BULK DOWNLOAD QR CODES
// ========================================

router.get('/bulk-download-qr', authMiddleware, async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.user.userId },
      select: {
        title: true,
        slug: true,
        qrCodeUrl: true
      }
    });

    if (items.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No items found'
      });
    }

    const qrCodes = items.map(item => ({
      filename: `${item.title.replace(/[^a-z0-9]/gi, '_')}_${item.slug}.png`,
      title: item.title,
      dataUrl: item.qrCodeUrl
    }));

    res.json({
      status: 'success',
      qrCodes
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to prepare bulk download'
    });
  }
});

module.exports = router;