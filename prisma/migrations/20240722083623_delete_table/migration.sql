/*
  Warnings:

  - You are about to drop the `TransformerLocationHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TransformerLocationHistory" DROP CONSTRAINT "TransformerLocationHistory_transformerId_fkey";

-- DropTable
DROP TABLE "TransformerLocationHistory";
