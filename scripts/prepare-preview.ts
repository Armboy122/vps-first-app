import { spawnSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { assertPreviewDatabaseTarget } from "../lib/server/config/previewBoundary";
import { runPreviewSeed, PREVIEW_SEED_CONFIRMATION, type PreviewSeedClient } from "./seed-preview";
export const PREVIEW_PREPARE_CONFIRMATION = "prepare-vps-tr-mock-20261001";
export interface PrepareEnvironment extends Record<string, string | undefined> {
    APP_ENV?: string;
    VERCEL_ENV?: string;
    DATABASE_URL?: string;
    DIRECT_URL?: string;
    PREVIEW_PREPARE_ONCE?: string;
    PREVIEW_ADMIN_PASSWORD?: string;
}
type PrepareClient = PreviewSeedClient & {
    user: PreviewSeedClient["user"] & {
        create(input: {
            data: {
                employeeId: string;
                fullName: string;
                password: string;
                role: "ADMIN";
                workCenterId: number;
                branchId: number;
            };
        }): Promise<unknown>;
    };
    workCenter: PreviewSeedClient["workCenter"] & {
        findUnique(input: unknown): Promise<{
            id: number;
        } | null>;
    };
    branch: PreviewSeedClient["branch"] & {
        findUnique(input: unknown): Promise<{
            id: number;
        } | null>;
    };
};
export interface PreparePorts {
    migrate: (directUrl: string, env: PrepareEnvironment) => Promise<void>;
    seed: typeof runPreviewSeed;
    client: (url: string) => Promise<PrepareClient>;
    hashPassword: (password: string) => Promise<string>;
}
const PREPARATION_STAGES = [
    "unknown", "validate-environment", "validate-database", "validate-direct", "validate-password",
    "migrate", "lookup-seed", "admin-client", "admin-lookup", "admin-organization",
    "admin-password", "admin-create", "admin-disconnect", "full-seed",
] as const;
type PreparationStage = typeof PREPARATION_STAGES[number];
const SAFE_FAILURE_CODES = new Set([
    "PREPARATION_FAILED", "APP_ENV_NOT_PREVIEW", "VERCEL_ENV_NOT_PREVIEW", "PREPARE_CONFIRMATION_INVALID",
    "DATABASE_TARGET_REJECTED", "DIRECT_TARGET_REJECTED", "DIRECT_ENDPOINT_REQUIRED", "ADMIN_PASSWORD_INVALID",
    "ADMIN_ORGANIZATION_MISSING", "MIGRATION_LAUNCH_FAILED", "MIGRATION_SUBPROCESS_FAILED",
]);
// Fixed Prisma 5 error identifiers only. Never forward a raw code, message, meta or cause.
const SAFE_PRISMA_CODES = new Set([
    "P1000", "P1001", "P1002", "P1003", "P1008", "P1009", "P1010", "P1011", "P1012", "P1013", "P1014", "P1015", "P1016", "P1017",
    "P2000", "P2001", "P2002", "P2003", "P2004", "P2005", "P2006", "P2007", "P2008", "P2009", "P2010", "P2011", "P2012", "P2013", "P2014", "P2015", "P2016", "P2017", "P2018", "P2019", "P2020", "P2021", "P2022", "P2023", "P2024", "P2025", "P2026", "P2027", "P2028", "P2029", "P2030", "P2031", "P2032", "P2033", "P2034", "P2035", "P2036", "P2037",
    "P3000", "P3001", "P3002", "P3003", "P3004", "P3005", "P3006", "P3007", "P3008", "P3009", "P3010", "P3011", "P3012", "P3013", "P3014", "P3015", "P3016", "P3017", "P3018", "P3019", "P3020", "P3021", "P3022",
]);
function isSafeCode(code: unknown): code is string {
    return typeof code === "string" && (SAFE_FAILURE_CODES.has(code) || SAFE_PRISMA_CODES.has(code));
}
class PreviewPreparationError extends Error {
    readonly stage: PreparationStage;
    readonly code: string;
    constructor(stage: PreparationStage, code: string) {
        const safeCode = isSafeCode(code) ? code : "PREPARATION_FAILED";
        super(`Preview preparation failed at ${stage} (${safeCode})`);
        this.name = "PreviewPreparationError";
        this.stage = stage;
        this.code = safeCode;
    }
}
/** The CLI emits only static stages and allowlisted codes, never arbitrary Error fields. */
export function formatPreviewPreparationFailure(error: unknown): string {
    const known = error instanceof PreviewPreparationError;
    const stage = known && PREPARATION_STAGES.includes(error.stage) ? error.stage : "unknown";
    const code = known && isSafeCode(error.code) ? error.code : "PREPARATION_FAILED";
    return `Preview preparation failed safely (stage=${stage}; code=${code}). Credentials and subprocess output were omitted.`;
}
function prismaErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== "object") return undefined;
    // A getter or a proxy can itself throw. Unknown error objects still stay safely generic.
    try {
        for (const key of ["code", "errorCode"] as const) {
            const value = (error as Record<string, unknown>)[key];
            if (typeof value === "string" && SAFE_PRISMA_CODES.has(value)) return value;
        }
    } catch { /* No error details are inspected or retained. */ }
    return undefined;
}
async function atStage<T>(stage: PreparationStage, action: () => T | Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error) {
        if (error instanceof PreviewPreparationError) throw error;
        throw new PreviewPreparationError(stage, prismaErrorCode(error) || "PREPARATION_FAILED");
    }
}
export function validatePrepareEnvironment(env: PrepareEnvironment): void {
    if (env.APP_ENV !== "preview")
        throw new PreviewPreparationError("validate-environment", "APP_ENV_NOT_PREVIEW");
    if (env.VERCEL_ENV !== "preview")
        throw new PreviewPreparationError("validate-environment", "VERCEL_ENV_NOT_PREVIEW");
    if (env.PREVIEW_PREPARE_ONCE !== PREVIEW_PREPARE_CONFIRMATION)
        throw new PreviewPreparationError("validate-environment", "PREPARE_CONFIRMATION_INVALID");
    try { assertPreviewDatabaseTarget(env); }
    catch { throw new PreviewPreparationError("validate-database", "DATABASE_TARGET_REJECTED"); }
    try { assertPreviewDatabaseTarget({ ...env, DATABASE_URL: env.DIRECT_URL }); }
    catch { throw new PreviewPreparationError("validate-direct", "DIRECT_TARGET_REJECTED"); }
    const direct = new URL(env.DIRECT_URL!);
    if (direct.hostname.includes("-pooler."))
        throw new PreviewPreparationError("validate-direct", "DIRECT_ENDPOINT_REQUIRED");
    if (!env.PREVIEW_ADMIN_PASSWORD || env.PREVIEW_ADMIN_PASSWORD.length < 20 || env.PREVIEW_ADMIN_PASSWORD.length > 200 || env.PREVIEW_ADMIN_PASSWORD === "DEMO_ADMIN")
        throw new PreviewPreparationError("validate-password", "ADMIN_PASSWORD_INVALID");
}
export function migratePreviewDatabase(directUrl: string, env: PrepareEnvironment, run: typeof spawnSync = spawnSync): void {
    // Retain all guards even if this helper is invoked independently of the orchestration.
    validatePrepareEnvironment(env);
    if (directUrl !== env.DIRECT_URL)
        throw new PreviewPreparationError("validate-direct", "DIRECT_TARGET_REJECTED");
    // Secret values stay in the child environment, never argv, stdout or errors.
    const result = run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
        env: { ...env, NODE_ENV: process.env.NODE_ENV || "production", DATABASE_URL: directUrl },
        encoding: "utf8", stdio: "pipe",
    });
    if (result.error)
        throw new PreviewPreparationError("migrate", "MIGRATION_LAUNCH_FAILED");
    if (result.status !== 0) {
        // Prisma 5 CLI error headers only; matching substrings in URLs or arbitrary output is forbidden.
        // Captured output remains local and is discarded after extracting a fixed allowlisted identifier.
        for (const output of [result.stderr, result.stdout]) {
            if (typeof output !== "string") continue;
            const plain = output.replace(/\u001b\[[0-9;]*m/g, "");
            for (const match of plain.matchAll(/^(?:Error:|Error code:)\s*(P\d{4})(?=[:\s]|$)/gm)) {
                if (SAFE_PRISMA_CODES.has(match[1]))
                    throw new PreviewPreparationError("migrate", match[1]);
            }
        }
        throw new PreviewPreparationError("migrate", "MIGRATION_SUBPROCESS_FAILED");
    }
}
const runtimePorts: PreparePorts = {
    async migrate(directUrl, env) { migratePreviewDatabase(directUrl, env); },
    seed: runPreviewSeed,
    async client(url) { return new PrismaClient({ datasources: { db: { url } } }) as unknown as PrepareClient; },
    hashPassword: (password) => bcrypt.hash(password, 12),
};
/** Explicit command only. Normal build/dev/start never invokes this function. */
export async function preparePreview(env: PrepareEnvironment = process.env, ports: PreparePorts = runtimePorts) {
    validatePrepareEnvironment(env); // All target/consent/password guards before any subprocess or connection.
    await atStage("migrate", () => ports.migrate(env.DIRECT_URL!, env));
    const seedEnv = { ...env, PREVIEW_SEED_DATABASE_URL: env.DIRECT_URL, PREVIEW_SEED_ENV: "preview", PREVIEW_SEED_CONFIRM: PREVIEW_SEED_CONFIRMATION, PREVIEW_SEED_ACTOR_EMPLOYEE_ID: "DEMO_ADMIN" };
    await atStage("lookup-seed", () => ports.seed({ env: seedEnv, args: ["--lookup-only"] }));
    const client = await atStage("admin-client", () => ports.client(env.DIRECT_URL!));
    let createdAdmin = false;
    let adminFailed = false;
    try {
        const existing = await atStage("admin-lookup", () => client.user.findUnique({ where: { employeeId: "DEMO_ADMIN" }, select: { id: true, employeeId: true, role: true, workCenterId: true, branchId: true } }));
        if (!existing) {
            const center = await atStage("admin-organization", () => client.workCenter.findUnique({ where: { name: "ศูนย์ทดสอบ01" }, select: { id: true } }));
            const branch = center ? await atStage("admin-organization", () => client.branch.findUnique({ where: { workCenterId_shortName: { workCenterId: center.id, shortName: "สาขาทดสอบ01" } }, select: { id: true } })) : null;
            if (!center || !branch)
                throw new PreviewPreparationError("admin-organization", "ADMIN_ORGANIZATION_MISSING");
            const password = await atStage("admin-password", () => ports.hashPassword(env.PREVIEW_ADMIN_PASSWORD!));
            await atStage("admin-create", () => client.user.create({ data: { employeeId: "DEMO_ADMIN", fullName: "ผู้ดูแลระบบจำลอง", password, role: "ADMIN", workCenterId: center.id, branchId: branch.id } }));
            createdAdmin = true;
        }
        // Existing credentials are preserved; there is no automatic password reset.
    }
    catch (error) {
        adminFailed = true;
        throw error;
    }
    finally {
        try { await atStage("admin-disconnect", () => client.$disconnect?.()); }
        catch (error) { if (!adminFailed) throw error; } // Preserve the primary failure's safe stage/code.
    }
    const counts = await atStage("full-seed", () => ports.seed({ env: seedEnv }));
    return { createdAdmin, ...counts };
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/prepare-preview.ts")) {
    void preparePreview().then((result) => console.log("Isolated synthetic preview prepared:", result)).catch((error: unknown) => {
        console.error(formatPreviewPreparationFailure(error));
        process.exitCode = 1;
    });
}
