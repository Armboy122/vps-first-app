import type { Role } from "@prisma/client";
export interface Actor {
    id: number;
    employeeId: string;
    fullName: string;
    role: Role;
    workCenterId: number;
    branchId: number;
}
export type OutageMutation = "edit" | "delete" | "request-status" | "oms";
export function canReadWorkCenter(actor: Actor, workCenterId: number): boolean {
    return Number.isSafeInteger(workCenterId) && workCenterId > 0 &&
        (actor.role === "ADMIN" || actor.role === "VIEWER" || actor.workCenterId === workCenterId);
}
/** Preserve the current UI workflow; creating still sets CONFIRM as before. */
export function canMutateOutage(actor: Actor, request: {
    workCenterId: number;
    branchId: number;
}, mutation: OutageMutation): boolean {
    if (actor.role === "ADMIN")
        return true;
    if (actor.workCenterId !== request.workCenterId)
        return false;
    return mutation === "oms" ? actor.role === "SUPERVISOR" : actor.role === "USER";
}
