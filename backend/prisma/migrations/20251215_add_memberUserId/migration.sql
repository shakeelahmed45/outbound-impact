-- Add memberUserId field to TeamMember model
ALTER TABLE "TeamMember" ADD COLUMN "memberUserId" TEXT;

-- Add foreign key constraint
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_memberUserId_fkey" 
  FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for faster lookups
CREATE INDEX "TeamMember_memberUserId_idx" ON "TeamMember"("memberUserId");
