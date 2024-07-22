-- CreateEnum
CREATE TYPE "Request" AS ENUM ('CONFIRM', 'CANCELLED', 'NOT');

-- AlterTable
ALTER TABLE "PowerOutageRequest" ADD COLUMN     "statusRequest" "Request" NOT NULL DEFAULT 'NOT';
