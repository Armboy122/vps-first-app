import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Role } from "@prisma/client";
import { User } from "../../types/admin.types";
import { ROLE_TRANSLATIONS, ROLE_COLORS } from "../../constants/admin.constants";
import { updateUserRole, resetUserPassword, deleteUser } from "@/app/api/action/User";
import { ConfirmDialog } from "../shared/ConfirmDialog";

interface UserRowProps {
  user: User;
}

export function UserRow({ user }: UserRowProps) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
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

  const queryClient = useQueryClient();

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: number; newRole: Role }) =>
      updateUserRole(userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsRoleMenuOpen(false);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: number) => resetUserPassword(userId),
    onSuccess: () => {
      setConfirmDialog({ isOpen: false, type: null, title: "", message: "" });
      alert("🔐 รีเซ็ตรหัสผ่านเรียบร้อยแล้ว! รหัสผ่านใหม่คือรหัสพนักงาน");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmDialog({ isOpen: false, type: null, title: "", message: "" });
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
      <tr className="hover:bg-gray-50 transition-colors">
        {/* User Info */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div>
            <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
            <div className="text-sm text-gray-500">{user.employeeId}</div>
          </div>
        </td>

        {/* Role with Dropdown */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="relative">
            <button
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                ROLE_COLORS[user.role]
              } hover:opacity-80 transition-opacity`}
              disabled={updateRoleMutation.isPending}
            >
              {ROLE_TRANSLATIONS[user.role]}
              <span className="ml-1">▼</span>
            </button>

            {/* Role Dropdown Menu */}
            {isRoleMenuOpen && (
              <div className="absolute z-10 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  {Object.entries(ROLE_TRANSLATIONS).map(([role, label]) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role as Role)}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                        user.role === role ? "bg-blue-50 text-blue-700" : "text-gray-700"
                      }`}
                      disabled={updateRoleMutation.isPending}
                    >
                      {label}
                      {user.role === role && <span className="ml-2">✓</span>}
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
              className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
              title="รีเซ็ตรหัสผ่าน"
            >
              🔐
            </button>
            
            <button
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
              title="ลบผู้ใช้"
            >
              🗑️
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
            : "bg-blue-600 hover:bg-blue-700"
        }
        onConfirm={handleConfirmAction}
        onCancel={handleCancelDialog}
        isLoading={resetPasswordMutation.isPending || deleteUserMutation.isPending}
      />
    </>
  );
}