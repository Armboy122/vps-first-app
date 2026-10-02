const PREVIEW_DATABASE = "vps_tr_mock";
const PREVIEW_HOSTS = new Set([
    "ep-odd-paper-azxfykgo.c-3.ap-southeast-1.aws.neon.tech",
    "ep-odd-paper-azxfykgo-pooler.c-3.ap-southeast-1.aws.neon.tech",
]);
export const PREVIEW_DATABASE_ERROR_CODES = [
    "DB_TARGET_REJECTED", "DB_ENV_REJECTED", "DB_URL_MISSING", "DB_URL_INVALID",
    "DB_PROTOCOL_REJECTED", "DB_HOST_REJECTED", "DB_NAME_REJECTED", "DB_PATH_INVALID",
    "DB_TLS_MISSING", "DB_TLS_INVALID", "DB_SCHEMA_REJECTED", "DB_QUERY_UNKNOWN",
    "DB_QUERY_DUPLICATE", "DB_PORT_REJECTED", "DB_FRAGMENT_REJECTED",
] as const;
type PreviewDatabaseErrorCode = typeof PREVIEW_DATABASE_ERROR_CODES[number];
/** Fixed reason identifiers only; never retain supplied targets, options or parser errors. */
export class PreviewDatabaseTargetError extends Error {
    readonly code: PreviewDatabaseErrorCode;
    constructor(code: PreviewDatabaseErrorCode) {
        const safeCode = PREVIEW_DATABASE_ERROR_CODES.includes(code) ? code : "DB_TARGET_REJECTED";
        super(`Preview database target rejected (${safeCode})`);
        this.name = "PreviewDatabaseTargetError";
        this.code = safeCode;
    }
}
/** Public target metadata is allowlisted; credentials are never returned or logged. */
export function assertPreviewDatabaseTarget(env: Record<string, string | undefined> = process.env): void {
    if (env.APP_ENV !== "preview" || (env.VERCEL_ENV && env.VERCEL_ENV !== "preview"))
        throw new PreviewDatabaseTargetError("DB_ENV_REJECTED");
    if (!env.DATABASE_URL)
        throw new PreviewDatabaseTargetError("DB_URL_MISSING");
    let target: URL;
    try {
        target = new URL(env.DATABASE_URL);
    }
    catch {
        throw new PreviewDatabaseTargetError("DB_URL_INVALID");
    }
    const allowedParameters = new Set(["sslmode", "channel_binding", "schema", "connection_limit", "pool_timeout", "connect_timeout", "statement_cache_size", "pgbouncer", "application_name"]);
    const parameters = Array.from(target.searchParams.keys());
    if (target.port && target.port !== "5432")
        throw new PreviewDatabaseTargetError("DB_PORT_REJECTED");
    if (target.hash)
        throw new PreviewDatabaseTargetError("DB_FRAGMENT_REJECTED");
    if (new Set(parameters).size !== parameters.length)
        throw new PreviewDatabaseTargetError("DB_QUERY_DUPLICATE");
    if (parameters.some((key) => !allowedParameters.has(key)))
        throw new PreviewDatabaseTargetError("DB_QUERY_UNKNOWN");
    if (!target.searchParams.has("sslmode"))
        throw new PreviewDatabaseTargetError("DB_TLS_MISSING");
    if (!["require", "verify-ca", "verify-full"].includes(target.searchParams.get("sslmode") || ""))
        throw new PreviewDatabaseTargetError("DB_TLS_INVALID");
    if (!["postgresql:", "postgres:"].includes(target.protocol))
        throw new PreviewDatabaseTargetError("DB_PROTOCOL_REJECTED");
    if (!PREVIEW_HOSTS.has(target.hostname))
        throw new PreviewDatabaseTargetError("DB_HOST_REJECTED");
    let databaseName: string;
    try { databaseName = decodeURIComponent(target.pathname.slice(1)); }
    catch { throw new PreviewDatabaseTargetError("DB_PATH_INVALID"); }
    if (databaseName !== PREVIEW_DATABASE)
        throw new PreviewDatabaseTargetError("DB_NAME_REJECTED");
    if (target.searchParams.get("schema") && target.searchParams.get("schema") !== "public")
        throw new PreviewDatabaseTargetError("DB_SCHEMA_REJECTED");
}
