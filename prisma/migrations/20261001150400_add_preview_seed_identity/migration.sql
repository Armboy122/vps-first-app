-- Nullable fixture identity; regular user-created requests remain unaffected.
ALTER TABLE "PowerOutageRequest" ADD COLUMN "seedKey" TEXT;
CREATE UNIQUE INDEX "PowerOutageRequest_seedKey_key" ON "PowerOutageRequest"("seedKey");
