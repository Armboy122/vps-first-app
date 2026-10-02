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
export function validatePrepareEnvironment(env: PrepareEnvironment): void {
    if (env.VERCEL_ENV !== "preview" || env.APP_ENV !== "preview" || env.PREVIEW_PREPARE_ONCE !== PREVIEW_PREPARE_CONFIRMATION)
        throw new Error("One-time preview preparation is not explicitly enabled for Vercel Preview");
    assertPreviewDatabaseTarget(env);
    assertPreviewDatabaseTarget({ ...env, DATABASE_URL: env.DIRECT_URL });
    const direct = new URL(env.DIRECT_URL!);
    if (direct.hostname.includes("-pooler."))
        throw new Error("Preview migrations require the verified direct endpoint");
    if (!env.PREVIEW_ADMIN_PASSWORD || env.PREVIEW_ADMIN_PASSWORD.length < 20 || env.PREVIEW_ADMIN_PASSWORD.length > 200 || env.PREVIEW_ADMIN_PASSWORD === "DEMO_ADMIN")
        throw new Error("A strong owner-supplied synthetic account password is required");
}
const runtimePorts: PreparePorts = {
    async migrate(directUrl, env) {
        // Secret values stay in the child environment, never argv, stdout or errors.
        const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: { ...env, NODE_ENV: process.env.NODE_ENV || "production", DATABASE_URL: directUrl }, encoding: "utf8", stdio: "pipe" });
        if (result.status !== 0 || result.error)
            throw new Error("Isolated preview migrations failed; connection details were omitted");
    },
    seed: runPreviewSeed,
    async client(url) { return new PrismaClient({ datasources: { db: { url } } }) as unknown as PrepareClient; },
    hashPassword: (password) => bcrypt.hash(password, 12),
};
/** Explicit command only. Normal build/dev/start never invokes this function. */
export async function preparePreview(env: PrepareEnvironment = process.env, ports: PreparePorts = runtimePorts) {
    validatePrepareEnvironment(env); // All target/consent/password guards before any subprocess or connection.
    await ports.migrate(env.DIRECT_URL!, env);
    const seedEnv = { ...env, PREVIEW_SEED_DATABASE_URL: env.DIRECT_URL, PREVIEW_SEED_ENV: "preview", PREVIEW_SEED_CONFIRM: PREVIEW_SEED_CONFIRMATION, PREVIEW_SEED_ACTOR_EMPLOYEE_ID: "DEMO_ADMIN" };
    await ports.seed({ env: seedEnv, args: ["--lookup-only"] });
    const client = await ports.client(env.DIRECT_URL!);
    let createdAdmin = false;
    try {
        const existing = await client.user.findUnique({ where: { employeeId: "DEMO_ADMIN" }, select: { id: true, employeeId: true, role: true, workCenterId: true, branchId: true } });
        if (!existing) {
            const center = await client.workCenter.findUnique({ where: { name: "ศูนย์ทดสอบ01" }, select: { id: true } });
            const branch = center ? await client.branch.findUnique({ where: { workCenterId_shortName: { workCenterId: center.id, shortName: "สาขาทดสอบ01" } }, select: { id: true } }) : null;
            if (!center || !branch)
                throw new Error("Synthetic account organization is missing");
            const password = await ports.hashPassword(env.PREVIEW_ADMIN_PASSWORD!);
            await client.user.create({ data: { employeeId: "DEMO_ADMIN", fullName: "ผู้ดูแลระบบจำลอง", password, role: "ADMIN", workCenterId: center.id, branchId: branch.id } });
            createdAdmin = true;
        }
        // Existing credentials are preserved; there is no automatic password reset.
    }
    finally {
        await client.$disconnect?.();
    }
    const counts = await ports.seed({ env: seedEnv });
    return { createdAdmin, ...counts };
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/prepare-preview.ts")) {
    void preparePreview().then((result) => console.log("Isolated synthetic preview prepared:", result)).catch(() => {
        console.error("Preview preparation failed safely. Credentials and subprocess output were omitted.");
        process.exitCode = 1;
    });
}
