-- These four indexes are present in schema.prisma but were absent from the
-- checked-in migration history, so new environments never received them.
CREATE INDEX "PowerOutageRequest_outageDate_omsStatus_statusRequest_idx"
ON "PowerOutageRequest"("outageDate", "omsStatus", "statusRequest");

CREATE INDEX "PowerOutageRequest_createdAt_idx"
ON "PowerOutageRequest"("createdAt");

CREATE INDEX "PowerOutageRequest_workCenterId_omsStatus_idx"
ON "PowerOutageRequest"("workCenterId", "omsStatus");

CREATE INDEX "PowerOutageRequest_statusRequest_omsStatus_outageDate_idx"
ON "PowerOutageRequest"("statusRequest", "omsStatus", "outageDate");
