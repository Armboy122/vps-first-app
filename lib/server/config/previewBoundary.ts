const PREVIEW_DATABASE = "vps_tr_mock";
const PREVIEW_HOSTS = new Set([
    "ep-odd-paper-azxfykgo.c-3.ap-southeast-1.aws.neon.tech",
    "ep-odd-paper-azxfykgo-pooler.c-3.ap-southeast-1.aws.neon.tech",
]);
/** Public target metadata is allowlisted; credentials are never returned or logged. */
export function assertPreviewDatabaseTarget(env: Record<string, string | undefined> = process.env): void {
    if (env.APP_ENV !== "preview" || (env.VERCEL_ENV && env.VERCEL_ENV !== "preview"))
        throw new Error("This deployment requires the isolated synthetic preview environment");
    let target: URL;
    try {
        target = new URL(env.DATABASE_URL || "");
    }
    catch {
        throw new Error("Preview database configuration is missing or invalid");
    }
    const allowedParameters = new Set(["sslmode", "channel_binding", "schema", "connection_limit", "pool_timeout", "connect_timeout", "statement_cache_size", "pgbouncer", "application_name"]);
    const parameters = Array.from(target.searchParams.keys());
    if ((target.port && target.port !== "5432") || target.hash || new Set(parameters).size !== parameters.length || parameters.some((key) => !allowedParameters.has(key)) || !["require", "verify-ca", "verify-full"].includes(target.searchParams.get("sslmode") || ""))
        throw new Error("Preview database connection options are outside the safe allowlist");
    if (!["postgresql:", "postgres:"].includes(target.protocol) || !PREVIEW_HOSTS.has(target.hostname) || decodeURIComponent(target.pathname.slice(1)) !== PREVIEW_DATABASE || target.searchParams.get("schema") && target.searchParams.get("schema") !== "public") {
        throw new Error("Database target is outside the isolated synthetic preview allowlist");
    }
}
