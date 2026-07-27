import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Role } from "@prisma/client";
import { User } from "../../types/admin.types";
import { ROLE_TRANSLATIONS, ROLE_COLORS } from "../../constants/admin.constants";
import { updateUserRole, resetUserPassword, deleteUser } from "@/app/api/action/User";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { FeedbackBanner } from "../shared/FeedbackBanner";
import { ChevronDown, Check, KeyRound, Trash2 } from "lucide-react";

interface UserRowProps {
  user: User;
}

export function UserRow({ user }: UserRowProps) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "delete" | "resetPassword" | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    title: "",
    message: "",
  });
  /** ข้อความแจ้งเตือนสำเร็จ — จะหายไปเองใน 3 วินาที */
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  /** ข้อความแจ้งเตือนข้อผิดพลาด — จะหายไปเองใน 4 วินาที */
  const [actionError, setActionError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // ปิด role menu เมื่อคลิกนอก dropdown
  useEffect(() => {
    if (!isRoleMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRoleMenuOpen]);

  // ลบ success message อัตโนมัติหลังจาก 3 วินาที
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 4000);
    return () => clearTimeout(timer);
  }, [actionError]);

  /** helper: ปิด confirm dialog กลับเป็น idle */
  const closeConfirmDialog = () =>
    setConfirmDialog({ isOpen: false, type: null, title: "", message: "" });

  // Mutations — ทุกตัวตรวจ `result.success` เพื่อจับ server-action-level errors
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: number; newRole: Role }) =>
      updateUserRole(userId, newRole),
    onSuccess: (result) => {
      setIsRoleMenuOpen(false);
      if (result && !result.success) {
        setActionError(result.error || "ไม่สามารถเปลี่ยน Role ได้");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setActionError(null);
      setSuccessMessage("เปลี่ยน Role เรียบร้อยแล้ว");
    },
    onError: (error: Error) => {
      setIsRoleMenuOpen(false);
      setActionError(error.message || "ไม่สามารถเปลี่ยน Role ได้");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: number) => resetUserPassword(userId),
    onSuccess: (result) => {
      closeConfirmDialog();
      if (result && !result.success) {
        setActionError(result.error || "ไม่สามารถรีเซ็ตรหัสผ่านได้");
        return;
      }
      setActionError(null);
      setSuccessMessage("รีเซ็ตรหัสผ่านเรียบร้อยแล้ว — รหัสผ่านใหม่คือรหัสพนักงาน");
    },
    onError: (error: Error) => {
      closeConfirmDialog();
      setActionError(error.message || "ไม่สามารถรีเซ็ตรหัสผ่านได้");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: (result) => {
      closeConfirmDialog();
      if (result && !result.success) {
        setActionError(result.error || "ไม่สามารถลบผู้ใช้ได้");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setActionError(null);
      setSuccessMessage("ลบผู้ใช้เรียบร้อยแล้ว");
    },
    onError: (error: Error) => {
      closeConfirmDialog();
      setActionError(error.message || "ไม่สามารถลบผู้ใช้ได้");
    },
  });

  // Event handlers
  const handleRoleChange = (newRole: Role) => {
    updateRoleMutation.mutate({ userId: user.id, newRole });
  };

  const handleResetPassword = () => {
    setConfirmDialog({
      isOpen: true,
      type: "resetPassword",
      title: "รีเซ็ตรหัสผ่าน",
      message: `ต้องการรีเซ็ตรหัสผ่านของ ${user.fullName} หรือไม่? รหัสผ่านใหม่จะเป็นรหัสพนักงาน`,
    });
  };

  const handleDeleteUser = () => {
    setConfirmDialog({
      isOpen: true,
      type: "delete",
      title: "ลบผู้ใช้",
      message: `ต้องการลบผู้ใช้ ${user.fullName} หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.type === "resetPassword") {
      resetPasswordMutation.mutate(user.id);
    } else if (confirmDialog.type === "delete") {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleCancelDialog = () => {
    setConfirmDialog({ isOpen: false, type: null, title: "", message: "" });
  };

  return (
    <>
      {/* Success notification row */}
      {successMessage && (
        <tr>
          <td colSpan={4} className="px-6 py-2">
            <FeedbackBanner
              variant="success"
              title="สำเร็จ"
              message={successMessage}
              action={
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  ปิด
                </button>
              }
            />
          </td>
        </tr>
      )}
      {actionError && (
        <tr>
          <td colSpan={4} className="px-6 py-2">
            <FeedbackBanner
              variant="error"
              title="ดำเนินการไม่สำเร็จ"
              message={actionError}
              action={
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-sm font-medium text-rose-700 hover:text-rose-900 cursor-pointer"
                >
                  ปิด
                </button>
              }
            />
          </td>
        </tr>
      )}
      <tr className="transition-colors hover:bg-[var(--app-surface-subtle)]">
        {/* User Info */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div>
            <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
            <div className="text-sm text-gray-500">{user.employeeId}</div>
          </div>
        </td>

        {/* Role with Dropdown */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              aria-haspopup="listbox"
              aria-expanded={isRoleMenuOpen}
              className={`inline-flex min-h-8 cursor-pointer items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                ROLE_COLORS[user.role]
              } hover:opacity-80 transition-opacity`}
              disabled={updateRoleMutation.isPending}
            >
              {ROLE_TRANSLATIONS[user.role]}
              <ChevronDown className="ml-1 h-3 w-3" />
            </button>

            {/* Role Dropdown Menu */}
            {isRoleMenuOpen && (
              <div
                role="listbox"
                aria-label="เลือกบทบาท"
                className="absolute z-10 mt-1 w-48 rounded-md border border-[var(--app-border)] bg-white shadow-[var(--app-shadow-raised)]"
              >
                <div className="py-1">
                  {Object.entries(ROLE_TRANSLATIONS).map(([role, label]) => (
                    <button
                      key={role}
                      role="option"
                      aria-selected={user.role === role}
                      onClick={() => handleRoleChange(role as Role)}
                      className={`block w-full text-left px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors ${
                        user.role === role ? "bg-pea-50 text-pea-800" : "text-gray-700"
                      }`}
                      disabled={updateRoleMutation.isPending}
                    >
                      {label}
                      {user.role === role && <Check className="ml-2 inline h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </td>

        {/* Work Center & Branch */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{user.workCenter.name}</div>
          <div className="text-sm text-gray-500">{user.branch.fullName}</div>
        </td>

        {/* Actions */}
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--app-border)] text-pea-700 transition-colors hover:bg-pea-50 disabled:opacity-50"
              title="รีเซ็ตรหัสผ่าน"
            >
              <KeyRound className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
              title="ลบผู้ใช้"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.type === "delete" ? "ลบ" : "รีเซ็ต"}
        confirmButtonClass={
          confirmDialog.type === "delete" 
            ? "bg-red-600 hover:bg-red-700" 
            : "bg-pea-700 hover:bg-pea-800"
        }
        onConfirm={handleConfirmAction}
        onCancel={handleCancelDialog}
        isLoading={resetPasswordMutation.isPending || deleteUserMutation.isPending}
      />
    </>
  );
}
