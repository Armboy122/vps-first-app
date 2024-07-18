/*
  Warnings:

  - You are about to drop the column `aera` on the `PowerOutageRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PowerOutageRequest" DROP COLUMN "aera",
ADD COLUMN     "area" TEXT;
