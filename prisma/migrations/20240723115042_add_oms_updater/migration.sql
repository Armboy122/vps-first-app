-- AlterTable
ALTER TABLE "PowerOutageRequest" ADD COLUMN     "omsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "omsUpdatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "PowerOutageRequest" ADD CONSTRAINT "PowerOutageRequest_omsUpdatedById_fkey" FOREIGN KEY ("omsUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
