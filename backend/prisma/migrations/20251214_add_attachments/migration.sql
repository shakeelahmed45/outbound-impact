-- AlterTable
ALTER TABLE "Item" 
ADD COLUMN IF NOT EXISTS "attachments" JSONB;
