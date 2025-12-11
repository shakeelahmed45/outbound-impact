/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,email]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- DropIndex
DROP INDEX "Item_nfcEnabled_idx";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "thumbnailUrl" TEXT,
ALTER COLUMN "nfcEnabled" SET DEFAULT false;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_token_key" ON "TeamMember"("token");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_token_idx" ON "TeamMember"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_email_key" ON "TeamMember"("userId", "email");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
