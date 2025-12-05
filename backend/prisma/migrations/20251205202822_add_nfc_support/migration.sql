-- AlterTable
ALTER TABLE "Analytics" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'direct';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "nfcEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nfcUrl" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewsDirect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewsNfc" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewsQr" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Analytics_source_idx" ON "Analytics"("source");

-- CreateIndex
CREATE INDEX "Item_nfcEnabled_idx" ON "Item"("nfcEnabled");
