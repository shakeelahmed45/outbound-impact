// 🎬 Migration Script: Fix Existing YouTube Embeds
// Run this ONCE after deploying the backend fix

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Helper function to generate YouTube thumbnail URL
const getYouTubeThumbnail = (videoId) => {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

async function fixYouTubeThumbnails() {
  try {
    console.log('🎬 Starting YouTube thumbnail migration...\n');

    // Find all EMBED items with YouTube in buttonText and no thumbnailUrl
    const embeds = await prisma.item.findMany({
      where: {
        type: 'EMBED',
        buttonText: {
          contains: 'YouTube',
          mode: 'insensitive'
        },
        thumbnailUrl: null
      }
    });

    console.log(`Found ${embeds.length} YouTube embeds without thumbnails\n`);

    let successCount = 0;
    let failCount = 0;

    for (const item of embeds) {
      console.log(`Processing: "${item.title}" (ID: ${item.id})`);
      console.log(`  URL: ${item.mediaUrl}`);

      const videoId = getYouTubeVideoId(item.mediaUrl);
      
      if (videoId) {
        const thumbnailUrl = getYouTubeThumbnail(videoId);
        
        try {
          await prisma.item.update({
            where: { id: item.id },
            data: { thumbnailUrl }
          });
          
          console.log(`  ✅ Updated! Thumbnail: ${thumbnailUrl}\n`);
          successCount++;
        } catch (error) {
          console.log(`  ❌ Failed to update: ${error.message}\n`);
          failCount++;
        }
      } else {
        console.log(`  ⚠️ Could not extract video ID\n`);
        failCount++;
      }
    }

    console.log('\n📊 MIGRATION SUMMARY');
    console.log('═══════════════════');
    console.log(`Total embeds found: ${embeds.length}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixYouTubeThumbnails();