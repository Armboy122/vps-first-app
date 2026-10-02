import { assertPreviewDatabaseTarget } from "@/lib/server/config/previewBoundary";
import { PrismaClient, Role, Request, OMSStatus } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;
const buildOnly = process.env.NEXT_PHASE === "phase-production-build";
// Validate before constructing any client: $connect/$transaction must never
// touch a wrong target before query middleware executes.
if (!buildOnly) assertPreviewDatabaseTarget();
const clientOptions = buildOnly ? { datasources: { db: { url: "postgresql://build_only:build_only@127.0.0.1:59999/disconnected_build" } } } : undefined;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient(clientOptions);
} else {
  if (!global.prisma) global.prisma = new PrismaClient(clientOptions);
  prisma = global.prisma;
}

prisma.$use(async (params, next) => {
  if (buildOnly) throw new Error("Database access is disabled during the build");
  assertPreviewDatabaseTarget();
  return next(params);
});

export { Role, Request, OMSStatus };
export default prisma;
