import { getServerSession } from "next-auth";
import { authOptions } from "@/authOption";
import { UserService } from "@/lib/services";
import type { Actor } from "@/lib/modules/outages/domain/authorization";
export class AccessError extends Error {
    constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND", message: string, public status = code === "UNAUTHENTICATED" ? 401 : code === "NOT_FOUND" ? 404 : 403) { super(message); }
}
/** Read current identity and role from DB, never from caller data or a stale JWT role. */
export async function getCurrentActor(): Promise<Actor> {
    const session = await getServerSession(authOptions);
    const sessionId = session?.user?.id;
    if (typeof sessionId !== "string" || !/^\d+$/.test(sessionId) || !Number.isSafeInteger(Number(sessionId)) || Number(sessionId) <= 0)
        throw new AccessError("UNAUTHENTICATED", "กรุณาเข้าสู่ระบบ");
    const user = await UserService.getUserById(Number(sessionId));
    if (!user)
        throw new AccessError("UNAUTHENTICATED", "ไม่พบผู้ใช้งานปัจจุบัน");
    return { id: user.id, employeeId: user.employeeId, fullName: user.fullName, role: user.role, workCenterId: user.workCenterId, branchId: user.branchId };
}
export async function requireAdmin(): Promise<Actor> {
    const actor = await getCurrentActor();
    if (actor.role !== "ADMIN")
        throw new AccessError("FORBIDDEN", "ต้องเป็นผู้ดูแลระบบเท่านั้น");
    return actor;
}
