"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            จัดการโปรไฟล์
          </h1>
          <p className="text-gray-600">
            อัปเดตข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border-l-4 ${
              messageType === "success"
                ? "bg-green-50 border-green-500 text-green-700"
                : messageType === "error"
                  ? "bg-red-50 border-red-500 text-red-700"
                  : "bg-blue-50 border-blue-500 text-blue-700"
            } shadow-sm`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {messageType === "success" && (
                  <span className="text-xl">✅</span>
                )}
                {messageType === "error" && <span className="text-xl">❌</span>}
                {messageType === "info" && <span className="text-xl">ℹ️</span>}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl font-bold text-white">
                    {userProfile?.fullName.charAt(0) || "?"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {isLoadingProfile
                    ? "กำลังโหลด..."
                    : userProfile?.fullName || "ไม่ระบุชื่อ"}
                </h2>
                <p className="text-gray-600 text-sm">
                  รหัสพนักงาน: {userProfile?.employeeId || "-"}
                </p>
              </div>

              {userProfile && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="text-blue-600 mr-2">🏢</span>
                      จุดรวมงาน
                    </h3>
                    <p className="text-gray-800">
                      {userProfile.workCenter.name}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="text-green-600 mr-2">🏬</span>
                      สาขา
                    </h3>
                    <p className="text-gray-800">
                      {userProfile.branch.fullName}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="text-purple-600 mr-2">👤</span>
                      บทบาท
                    </h3>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        userProfile.role === "ADMIN"
                          ? "bg-red-100 text-red-800"
                          : userProfile.role === "MANAGER"
                            ? "bg-orange-100 text-orange-800"
                            : userProfile.role === "SUPERVISOR"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {userProfile.role === "ADMIN" && "ผู้ดูแลระบบ"}
                      {userProfile.role === "MANAGER" && "ผู้บริหาร"}
                      {userProfile.role === "SUPERVISOR" && "หัวหน้างาน"}
                      {userProfile.role === "USER" && "พนักงาน"}
                      {userProfile.role === "VIEWER" && "ผู้ดู"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Edit Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Update Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-xl">✏️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    แก้ไขข้อมูลส่วนตัว
                  </h2>
                  <p className="text-gray-600 text-sm">
                    อัปเดตชื่อและหน่วยงานของคุณ
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                    placeholder="กรอกชื่อ-นามสกุล"
                    required
                  />
                </div>

                {/* Work Center */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    จุดรวมงาน
                  </label>
                  <select
                    value={selectedWorkCenterId}
                    onChange={(e) =>
                      handleWorkCenterChange(Number(e.target.value))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
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

                {/* Branch */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    สาขา
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) =>
                      setSelectedBranchId(Number(e.target.value))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !selectedWorkCenterId || !selectedBranchId
                    }
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            </div>

            {/* Password Change Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-xl">🔐</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    เปลี่ยนรหัสผ่าน
                  </h2>
                  <p className="text-gray-600 text-sm">
                    อัปเดตรหัสผ่านเพื่อความปลอดภัยของบัญชี
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    รหัสผ่านปัจจุบัน
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    รหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                    placeholder="กรอกรหัสผ่านใหม่"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
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

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      newPassword !== confirmPassword
                    }
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
