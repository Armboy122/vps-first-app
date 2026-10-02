import type { Role } from "@prisma/client";

/**
 * Request creation permissions are deliberately narrower than read access:
 * USER may create only in their assigned work center and branch; ADMIN may
 * create in any valid work-center/branch pair. Other roles are read/status-only.
 */
export function canCreateOutageInScope(input: {
  role: Role;
  userWorkCenterId: number;
  userBranchId: number;
  workCenterId: number;
  branchId: number;
}): boolean {
  if (!Number.isInteger(input.workCenterId) || input.workCenterId <= 0) return false;
  if (!Number.isInteger(input.branchId) || input.branchId <= 0) return false;
  if (input.role === "ADMIN") return true;
  return input.role === "USER" &&
    input.userWorkCenterId === input.workCenterId &&
    input.userBranchId === input.branchId;
}
