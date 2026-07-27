"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  GitBranch,
  KeyRound,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  changePassword,
  updateUserProfile,
  getCurrentUser,
} from "../api/action/User";
import {
  getWorkCenters,
  getBranches,
} from "../api/action/getWorkCentersAndBranches";

interface WorkCenter {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  shortName: string;
  workCenterId: number;
}

interface UserProfile {
  id: number;
  fullName: string;
  employeeId: string;
  role: string;
  workCenter: {
    id: number;
    name: string;
  };
  branch: {
    id: number;
    fullName: string;
    shortName: string;
  };
}

export default function User() {
  const { data: session, update } = useSession();

  // Profile Data
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Form States
  const [fullName, setFullName] = useState("");
  const [selectedWorkCenterId, setSelectedWorkCenterId] = useState<number>(0);
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0);

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI States
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Load branches
  const loadBranches = useCallback(async (workCenterId: number) => {
    if (!workCenterId) return;

    try {
      setIsLoadingBranches(true);
      const branchData = await getBranches(workCenterId);
      setBranches(branchData);
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    try {
      setIsLoadingProfile(true);
      const result = await getCurrentUser();
      if (result.success && result.user) {
        setUserProfile(result.user);
        setFullName(result.user.fullName);
        setSelectedWorkCenterId(result.user.workCenter.id);
        setSelectedBranchId(result.user.branch.id);

        // Load branches for current work center
        loadBranches(result.user.workCenter.id);
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [loadBranches]);

  // Load work centers
  const loadWorkCenters = useCallback(async () => {
    try {
      const centers = await getWorkCenters();
      setWorkCenters(centers);
    } catch (error) {
      console.error("Failed to load work centers:", error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      await loadUserProfile();
      await loadWorkCenters();
    };
    initializeData();
  }, [loadUserProfile, loadWorkCenters]);

  // Handle work center change
  const handleWorkCenterChange = (workCenterId: number) => {
    setSelectedWorkCenterId(workCenterId);
    if (workCenterId && workCenterId !== userProfile?.workCenter.id) {
      loadBranches(workCenterId);
      setSelectedBranchId(0); // Reset branch selection
    }
  };

  // Show message
  const showMessage = (
    msg: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setIsSubmitting(true);

    try {
      const result = await updateUserProfile({
        fullName,
        workCenterId: selectedWorkCenterId,
        branchId: selectedBranchId,
      });

      if (result.success) {
        showMessage("อัปเดตโปรไฟล์สำเร็จ", "success");
        // Reload profile data
        await loadUserProfile();
        // Update session
        await update();
      } else {
        showMessage(result.error || "ไม่สามารถอัปเดตโปรไฟล์ได้", "error");
      }
    } catch (error) {
      showMessage("เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showMessage("รหัสผ่านใหม่ไม่ตรงกัน", "error");
      return;
    }

    if (newPassword.length < 6) {
      showMessage("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        showMessage("เปลี่ยนรหัสผ่านสำเร็จ", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showMessage(result.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้", "error");
      }
    } catch (error) {
      showMessage("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-pea-200 border-t-pea-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-5 sm:py-7">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <header className="mb-5 border-b border-[var(--app-border)] pb-4">
          <h1 className="text-2xl font-bold text-[var(--app-text)]">ข้อมูลส่วนตัว</h1>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            ตรวจสอบข้อมูลหน่วยงาน แก้ไขโปรไฟล์ และเปลี่ยนรหัสผ่าน
          </p>
        </header>

        {message && (
          <div
            role={messageType === "error" ? "alert" : "status"}
            className={`mb-5 flex items-center gap-3 rounded-lg border p-3 ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-sky-200 bg-sky-50 text-sky-800"
            }`}
          >
            {messageType === "success" ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="ui-panel self-start p-5">
              <div className="border-b border-[var(--app-border)] pb-5 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-pea-100">
                  <span className="text-2xl font-bold text-pea-800">
                    {userProfile?.fullName.charAt(0) || "?"}
                  </span>
                </div>
                <h2 className="font-bold text-[var(--app-text)]">
                  {isLoadingProfile
                    ? "กำลังโหลด..."
                    : userProfile?.fullName || "ไม่ระบุชื่อ"}
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  รหัสพนักงาน: {userProfile?.employeeId || "-"}
                </p>
              </div>

              {userProfile && (
                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-pea-700" />
                    <div><p className="text-xs font-semibold text-[var(--app-text-muted)]">จุดรวมงาน</p><p className="mt-0.5 font-medium">{userProfile.workCenter.name}</p></div>
                  </div>
                  <div className="flex gap-3">
                    <GitBranch className="mt-0.5 h-4 w-4 text-pea-700" />
                    <div><p className="text-xs font-semibold text-[var(--app-text-muted)]">สาขา</p><p className="mt-0.5 font-medium">{userProfile.branch.fullName}</p></div>
                  </div>
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-pea-700" />
                    <div><p className="text-xs font-semibold text-[var(--app-text-muted)]">บทบาท</p><span className="mt-1 inline-flex rounded-md bg-[var(--app-frame)] px-2 py-1 text-xs font-semibold text-[var(--app-text-body)]">
                      {userProfile.role === "ADMIN" && "ผู้ดูแลระบบ"}
                      {userProfile.role === "MANAGER" && "ผู้บริหาร"}
                      {userProfile.role === "SUPERVISOR" && "หัวหน้างาน"}
                      {userProfile.role === "USER" && "พนักงาน"}
                      {userProfile.role === "VIEWER" && "ผู้ดู"}
                    </span></div>
                  </div>
                </div>
              )}
          </aside>

          <div className="space-y-5">
            <section className="ui-panel p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pea-100 text-pea-800">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--app-text)]">แก้ไขข้อมูลส่วนตัว</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">อัปเดตชื่อและหน่วยงานของคุณ</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="profile-full-name" className="mb-1.5 block text-sm font-semibold">ชื่อ-นามสกุล</label>
                  <input
                    id="profile-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="ui-input w-full px-4 py-3"
                    placeholder="กรอกชื่อ-นามสกุล"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="profile-work-center" className="mb-1.5 block text-sm font-semibold">จุดรวมงาน</label>
                  <select
                    id="profile-work-center"
                    value={selectedWorkCenterId}
                    onChange={(e) =>
                      handleWorkCenterChange(Number(e.target.value))
                    }
                    className="ui-input w-full px-4 py-3"
                    required
                  >
                    <option value={0}>เลือกจุดรวมงาน</option>
                    {workCenters.map((wc) => (
                      <option key={wc.id} value={wc.id}>
                        {wc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="profile-branch" className="mb-1.5 block text-sm font-semibold">สาขา</label>
                  <select
                    id="profile-branch"
                    value={selectedBranchId}
                    onChange={(e) =>
                      setSelectedBranchId(Number(e.target.value))
                    }
                    className="ui-input w-full px-4 py-3 disabled:cursor-not-allowed disabled:bg-slate-100"
                    required
                    disabled={!selectedWorkCenterId || isLoadingBranches}
                  >
                    <option value={0}>
                      {isLoadingBranches ? "กำลังโหลด..." : "เลือกสาขา"}
                    </option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !selectedWorkCenterId || !selectedBranchId
                    }
                    className="min-h-11 rounded-lg bg-pea-700 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-pea-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        กำลังอัปเดต...
                      </div>
                    ) : (
                      "อัปเดตโปรไฟล์"
                    )}
                  </button>
                </div>
              </form>
            </section>

            <section className="ui-panel p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pea-100 text-pea-800">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--app-text)]">
                    เปลี่ยนรหัสผ่าน
                  </h2>
                  <p className="text-sm text-[var(--app-text-muted)]">
                    อัปเดตรหัสผ่านเพื่อความปลอดภัยของบัญชี
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="mb-1.5 block text-sm font-semibold">รหัสผ่านปัจจุบัน</label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="ui-input w-full px-4 py-3"
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold">รหัสผ่านใหม่</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="ui-input w-full px-4 py-3"
                    placeholder="กรอกรหัสผ่านใหม่"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold">ยืนยันรหัสผ่านใหม่</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="ui-input w-full px-4 py-3"
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    minLength={6}
                    required
                  />
                  {newPassword &&
                    confirmPassword &&
                    newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">
                        รหัสผ่านไม่ตรงกัน
                      </p>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      newPassword !== confirmPassword
                    }
                    className="min-h-11 rounded-lg bg-pea-700 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-pea-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        กำลังเปลี่ยน...
                      </div>
                    ) : (
                      "เปลี่ยนรหัสผ่าน"
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
