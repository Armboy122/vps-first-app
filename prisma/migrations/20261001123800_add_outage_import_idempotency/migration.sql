CREATE TABLE "OutageRequestImport" (
  "id" SERIAL NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdById" INTEGER NOT NULL,
  "requestIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutageRequestImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutageRequestImport_idempotencyKey_key"
ON "OutageRequestImport"("idempotencyKey");

ALTER TABLE "OutageRequestImport"
ADD CONSTRAINT "OutageRequestImport_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
