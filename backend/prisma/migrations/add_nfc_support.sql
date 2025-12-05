-- Add NFC support fields to items table
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "nfcEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "nfcUrl" TEXT;

-- Split views tracking by source
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "viewsQr" INTEGER DEFAULT 0;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "viewsNfc" INTEGER DEFAULT 0;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "viewsDirect" INTEGER DEFAULT 0;

-- Update existing items to have NFC URLs
UPDATE "Item" 
SET 
  "nfcUrl" = CONCAT('https://outboundimpact.net/l/', "slug", '?source=nfc'),
  "viewsQr" = 0,
  "viewsNfc" = 0,
  "viewsDirect" = "views"
WHERE "nfcUrl" IS NULL;

-- Add index for faster source queries
CREATE INDEX IF NOT EXISTS "idx_item_nfc_enabled" ON "Item"("nfcEnabled");

-- Add source column to analytics table for tracking
ALTER TABLE "Analytics" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'direct';

-- Update existing analytics records
UPDATE "Analytics" SET "source" = 'direct' WHERE "source" IS NULL;