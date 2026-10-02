import { app } from "@/lib/server/api/app";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = app.fetch;
export const POST = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
