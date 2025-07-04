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
  userbranch?: string;
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

    setAuthInfo({
      isAdmin: session?.user?.role === "ADMIN",
      isUser: session?.user?.role === "USER",
      isViewer: session?.user?.role === "VIEWER",
      isManager: session?.user?.role === "MANAGER",
      isSupervisor: session?.user?.role === "SUPERVISOR",
      userWorkCenterId: session?.user?.workCenterId,
      userWorkCenterName: session?.user?.workCenterName,
      userbranch: session?.user?.branchName,
      userbranchID: session?.user?.branchId,
      isLoading: false,
    });
  }, [session, status]);

  return authInfo;
}
