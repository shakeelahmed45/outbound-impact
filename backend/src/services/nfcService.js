/**
 * NFC Service
 * Handles NFC tag data generation and management
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NFCService {
  /**
   * Generate NFC URL for an item
   * @param {string} slug - Item slug
   * @returns {string} - NFC-enabled URL
   */
  generateNFCUrl(slug) {
    const baseUrl = process.env.FRONTEND_URL || 'https://outboundimpact.net';
    return `${baseUrl}/l/${slug}?source=nfc`;
  }

  /**
   * Generate NDEF record data for NFC tag
   * NDEF = NFC Data Exchange Format (standard format)
   * @param {string} url - URL to encode
   * @returns {object} - NDEF record structure
   */
  generateNDEFRecord(url) {
    return {
      recordType: 'url',
      data: url,
      // NDEF message structure for Web NFC API
      ndefMessage: {
        records: [
          {
            recordType: 'url',
            data: url
          }
        ]
      }
    };
  }

  /**
   * Enable NFC for an item
   * @param {string} itemId - Item ID
   * @returns {object} - Updated item with NFC data
   */
  async enableNFC(itemId) {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    const nfcUrl = this.generateNFCUrl(item.slug);

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        nfcEnabled: true,
        nfcUrl: nfcUrl
      }
    });

    return {
      ...updatedItem,
      ndefRecord: this.generateNDEFRecord(nfcUrl)
    };
  }

  /**
   * Disable NFC for an item
   * @param {string} itemId - Item ID
   * @returns {object} - Updated item
   */
  async disableNFC(itemId) {
    return await prisma.item.update({
      where: { id: itemId },
      data: {
        nfcEnabled: false
      }
    });
  }

  /**
   * Get NFC data for an item
   * @param {string} itemId - Item ID
   * @returns {object} - NFC data including NDEF record
   */
  async getNFCData(itemId) {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    if (!item.nfcEnabled) {
      throw new Error('NFC not enabled for this item');
    }

    const nfcUrl = item.nfcUrl || this.generateNFCUrl(item.slug);

    return {
      itemId: item.id,
      slug: item.slug,
      nfcUrl: nfcUrl,
      nfcEnabled: item.nfcEnabled,
      ndefRecord: this.generateNDEFRecord(nfcUrl),
      // Instructions for manual NFC apps
      writeInstructions: {
        format: 'NDEF',
        type: 'URL',
        url: nfcUrl,
        encoding: 'UTF-8'
      }
    };
  }

  /**
   * Get NFC statistics for an item
   * @param {string} itemId - Item ID
   * @returns {object} - NFC view statistics
   */
  async getNFCStats(itemId) {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    return {
      totalNfcViews: item.viewsNfc || 0,
      totalQrViews: item.viewsQr || 0,
      totalDirectViews: item.viewsDirect || 0,
      totalViews: item.views || 0,
      nfcPercentage: item.views > 0 ? ((item.viewsNfc / item.views) * 100).toFixed(1) : 0,
    };
  }

  /**
   * Bulk generate NFC URLs for multiple items
   * Useful for campaigns
   * @param {array} itemIds - Array of item IDs
   * @returns {array} - Array of items with NFC data
   */
  async bulkGenerateNFC(itemIds) {
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds }
      }
    });

    const results = await Promise.all(
      items.map(async (item) => {
        const nfcUrl = this.generateNFCUrl(item.slug);
        
        const updated = await prisma.item.update({
          where: { id: item.id },
          data: {
            nfcEnabled: true,
            nfcUrl: nfcUrl
          }
        });

        return {
          itemId: updated.id,
          title: updated.title,
          slug: updated.slug,
          nfcUrl: nfcUrl,
          ndefRecord: this.generateNDEFRecord(nfcUrl)
        };
      })
    );

    return results;
  }

  /**
   * Get NFC data for a campaign
   * @param {string} campaignId - Campaign ID
   * @returns {object} - Campaign NFC data
   */
  async getCampaignNFCData(campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        items: true
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const nfcData = campaign.items.map(item => {
      const nfcUrl = item.nfcUrl || this.generateNFCUrl(item.slug);
      return {
        itemId: item.id,
        title: item.title,
        slug: item.slug,
        nfcUrl: nfcUrl,
        nfcEnabled: item.nfcEnabled,
        ndefRecord: this.generateNDEFRecord(nfcUrl)
      };
    });

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalItems: campaign.items.length,
      nfcEnabledItems: campaign.items.filter(i => i.nfcEnabled).length,
      items: nfcData
    };
  }
}

module.exports = new NFCService();