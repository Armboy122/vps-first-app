import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTransformer } from "@/app/api/action/User";
import { Transformer } from "../../types/admin.types";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { FeedbackBanner } from "../shared/FeedbackBanner";

interface TransformerRowProps {
  transformer: Transformer;
  onEdit: (transformer: Transformer) => void;
}

export function TransformerRow({ transformer, onEdit }: TransformerRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  /** ข้อความแจ้งข้อผิดพลาดเมื่อลบไม่สำเร็จ */
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** ข้อความแจ้งความสำเร็จเมื่อลบสำเร็จ */
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!deleteError) return;
    const timer = setTimeout(() => setDeleteError(null), 4000);
    return () => clearTimeout(timer);
  }, [deleteError]);

  useEffect(() => {
    if (!deleteSuccess) return;
    const timer = setTimeout(() => setDeleteSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [deleteSuccess]);

  // Delete mutation — ตรวจ result.success เพื่อจับ server-action-level errors
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTransformer(id),
    onSuccess: (result) => {
      setShowDeleteDialog(false);
      if (result && !result.success) {
        setDeleteError(result.error || "เกิดข้อผิดพลาดในการลบหม้อแปลง");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      setDeleteError(null);
      setDeleteSuccess("ลบหม้อแปลงเรียบร้อยแล้ว");
    },
    onError: (error: Error) => {
      setShowDeleteDialog(false);
      setDeleteError(error.message || "เกิดข้อผิดพลาดในการลบหม้อแปลง");
    },
  });

  // Handle delete
  const handleDelete = () => {
    deleteMutation.mutate(transformer.id);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Error notification row */}
      {deleteError && (
        <tr>
          <td colSpan={5} className="px-6 py-2">
            <FeedbackBanner
              variant="error"
              title="ลบหม้อแปลงไม่สำเร็จ"
              message={deleteError}
              action={
                <button
                  type="button"
                  onClick={() => setDeleteError(null)}
                  className="text-sm font-medium text-rose-700 hover:text-rose-900"
                >
                  ปิด
                </button>
              }
            />
          </td>
        </tr>
      )}
      {deleteSuccess && (
        <tr>
          <td colSpan={5} className="px-6 py-2">
            <FeedbackBanner
              variant="success"
              title="สำเร็จ"
              message={deleteSuccess}
            />
          </td>
        </tr>
      )}
      <tr className="hover:bg-gray-50 transition-colors">
        {/* Transformer Number */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {transformer.transformerNumber}
          </div>
        </td>

        {/* GIS Details */}
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900 max-w-xs">
            <div className="truncate" title={transformer.gisDetails}>
              {transformer.gisDetails}
            </div>
          </div>
        </td>

        {/* Created Date */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatDate(transformer.createdAt)}
        </td>

        {/* Updated Date */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatDate(transformer.updatedAt)}
        </td>

        {/* Actions */}
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => onEdit(transformer)}
              className="text-blue-600 hover:text-blue-900 transition-colors"
              title="แก้ไข"
            >
              ✏️
            </button>
            
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
              className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
              title="ลบ"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="ลบหม้อแปลง"
        message={`ต้องการลบหม้อแปลง "${transformer.transformerNumber}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ลบ"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
