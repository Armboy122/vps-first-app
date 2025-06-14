import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTransformer } from "@/app/api/action/User";
import { Transformer } from "../../types/admin.types";
import { ConfirmDialog } from "../shared/ConfirmDialog";

interface TransformerRowProps {
  transformer: Transformer;
  onEdit: (transformer: Transformer) => void;
}

export function TransformerRow({ transformer, onEdit }: TransformerRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTransformer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      setShowDeleteDialog(false);
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