import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface AuthInfo {
  isAdmin: boolean;
  isUser: boolean;
  isViewer: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  userWorkCenterId?: number;
  userWorkCenterName?: string;
  isLoading: boolean;
  /** Correct casing — prefer this over the deprecated aliases below */
  userBranch?: string;
  /** Correct casing — prefer this over the deprecated aliases below */
  userBranchId?: number;
  /**
   * @deprecated Use `userBranch` instead.
   * TODO: Update consumers (components/print.tsx) to use `userBranch`.
   */
  userbranch?: string;
  /**
   * @deprecated Use `userBranchId` instead.
   * TODO: Update consumers (components/print.tsx) to use `userBranchId`.
   */
  userbranchID?: number;
}

export function useAuth(): AuthInfo {
  const { data: session, status } = useSession();
  const [authInfo, setAuthInfo] = useState<AuthInfo>({
    isAdmin: false,
    isUser: false,
    isViewer: false,
    isManager: false,
    isSupervisor: false,
    isLoading: true,
  });

  useEffect(() => {
    if (status === "loading") return;

    const branchName = session?.user?.branchName;
    const branchId = session?.user?.branchId;

    setAuthInfo({
      isAdmin: session?.user?.role === "ADMIN",
      isUser: session?.user?.role === "USER",
      isViewer: session?.user?.role === "VIEWER",
      isManager: session?.user?.role === "MANAGER",
      isSupervisor: session?.user?.role === "SUPERVISOR",
      userWorkCenterId: session?.user?.workCenterId,
      userWorkCenterName: session?.user?.workCenterName,
      // Corrected property names
      userBranch: branchName,
      userBranchId: branchId,
      // Deprecated aliases — kept for backward compatibility with components/print.tsx
      // TODO: Update components/print.tsx to use userBranch and userBranchId, then remove these.
      userbranch: branchName,
      userbranchID: branchId,
      isLoading: false,
    });
  }, [session, status]);

  return authInfo;
}
