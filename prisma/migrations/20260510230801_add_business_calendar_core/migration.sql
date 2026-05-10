-- CreateEnum
CREATE TYPE "BusinessCalendarDateType" AS ENUM ('HOLIDAY', 'SPECIAL_WORKDAY');

-- CreateTable
CREATE TABLE "BusinessCalendarDate" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "type" "BusinessCalendarDateType" NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCalendarDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCalendarDate_date_scope_key" ON "BusinessCalendarDate"("date", "scope");

-- CreateIndex
CREATE INDEX "BusinessCalendarDate_scope_type_isActive_idx" ON "BusinessCalendarDate"("scope", "type", "isActive");

-- CreateIndex
CREATE INDEX "BusinessCalendarDate_date_isActive_idx" ON "BusinessCalendarDate"("date", "isActive");
