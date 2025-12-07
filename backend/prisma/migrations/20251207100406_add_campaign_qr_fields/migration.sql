-- Step 1: Add columns as nullable first
ALTER TABLE "Campaign" ADD COLUMN "slug" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "qrCodeUrl" TEXT;

-- Step 2: Update existing campaigns with unique slugs
UPDATE "Campaign" SET "slug" = substring(md5(random()::text || id::text) from 1 for 8) WHERE "slug" IS NULL;

-- Step 3: Now make slug required and unique
ALTER TABLE "Campaign" ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: Add unique constraint and indexes
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_slug_key" UNIQUE ("slug");
CREATE INDEX "Campaign_slug_idx" ON "Campaign"("slug");