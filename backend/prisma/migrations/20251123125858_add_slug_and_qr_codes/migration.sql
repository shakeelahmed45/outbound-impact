/*
  Warnings:

  - You are about to drop the column `qrCodeUrl` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `downloads` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `invitedAt` on the `TeamMember` table. All the data in the column will be lost.
  - You are about to drop the column `bandwidthUsed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CampaignItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'OTHER';

-- DropForeignKey
ALTER TABLE "Analytics" DROP CONSTRAINT "Analytics_itemId_fkey";

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_userId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignItem" DROP CONSTRAINT "CampaignItem_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignItem" DROP CONSTRAINT "CampaignItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- DropIndex
DROP INDEX "Campaign_slug_key";

-- DropIndex
DROP INDEX "Campaign_userId_idx";

-- DropIndex
DROP INDEX "TeamMember_userId_email_key";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "qrCodeUrl",
DROP COLUMN "slug",
DROP COLUMN "views";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "downloads",
DROP COLUMN "duration",
DROP COLUMN "thumbnailUrl",
DROP COLUMN "views",
ADD COLUMN     "campaignId" TEXT;

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "invitedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bandwidthUsed";

-- DropTable
DROP TABLE "Analytics";

-- DropTable
DROP TABLE "CampaignItem";

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
