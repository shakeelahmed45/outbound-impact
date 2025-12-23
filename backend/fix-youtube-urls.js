// Fix YouTube URLs in Database
// Save as: backend/fix-youtube-urls.js
// Run: node fix-youtube-urls.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Convert YouTube URLs to embed format
function convertToEmbedUrl(url) {
  if (!url) return url;

  // YouTube short URL: https://youtu.be/VIDEO_ID
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  // YouTube watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const videoId = urlParams.get('v');
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  // YouTube mobile URL: https://m.youtube.com/watch?v=VIDEO_ID
  if (url.includes('m.youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const videoId = urlParams.get('v');
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  // YouTube embed URL (already correct)
  if (url.includes('youtube.com/embed/')) {
    return url;
  }

  // Vimeo
  if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  }

  return url;
}

async function fixYouTubeUrls() {
  console.log('🔍 Finding EMBED items with YouTube URLs...\n');

  try {
    // Get all EMBED items
    const embedItems = await prisma.item.findMany({
      where: {
        type: 'EMBED'
      }
    });

    console.log(`📊 Found ${embedItems.length} embed items\n`);

    let fixedCount = 0;
    let alreadyCorrect = 0;

    for (const item of embedItems) {
      const originalUrl = item.mediaUrl;
      const convertedUrl = convertToEmbedUrl(originalUrl);

      if (originalUrl !== convertedUrl) {
        console.log(`🔧 Fixing: ${item.title}`);
        console.log(`   Before: ${originalUrl}`);
        console.log(`   After:  ${convertedUrl}`);
        
        // Update the item
        await prisma.item.update({
          where: { id: item.id },
          data: { mediaUrl: convertedUrl }
        });

        fixedCount++;
        console.log(`   ✅ Updated!\n`);
      } else {
        console.log(`✅ Already correct: ${item.title}`);
        console.log(`   URL: ${originalUrl}\n`);
        alreadyCorrect++;
      }
    }

    console.log('═══════════════════════════════════');
    console.log('📊 SUMMARY:');
    console.log(`   Total embeds: ${embedItems.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Already correct: ${alreadyCorrect}`);
    console.log('═══════════════════════════════════');
    console.log('\n🎉 Done! All YouTube URLs fixed!');
    console.log('\n💡 Now refresh your browser and test the embeds.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixYouTubeUrls();