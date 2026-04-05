import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransformer, updateTransformer } from "@/app/api/action/User";
import { Transformer } from "../../types/admin.types";
import { validateTransformerData } from "../../utils/csvParser";
import { FeedbackBanner } from "../shared/FeedbackBanner";

interface TransformerFormProps {
  transformer?: Transformer;
  onCancel: () => void;
  onSuccess: () => void;
}

export function TransformerForm({ transformer, onCancel, onSuccess }: TransformerFormProps) {
  const [formData, setFormData] = useState({
    transformerNumber: transformer?.transformerNumber || "",
    gisDetails: transformer?.gisDetails || "",
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  /** server-action-level error ที่ไม่ throw แต่ส่ง { success: false } กลับมา */
  const [serverError, setServerError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const isEditing = !!transformer;

  // Mutations — ตรวจ result.success เพื่อจับ server-action-level errors
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => createTransformer(data),
    onSuccess: (result) => {
      if (result && !result.success) {
        setServerError(result.error || "เกิดข้อผิดพลาดในการสร้างหม้อแปลง");
        return;
      }
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      setTimeout(() => onSuccess(), 500);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => updateTransformer(transformer!.id, data),
    onSuccess: (result) => {
      if (result && !result.success) {
        setServerError(result.error || "เกิดข้อผิดพลาดในการแก้ไขหม้อแปลง");
        return;
      }
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      setTimeout(() => onSuccess(), 500);
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate data
    const validation = validateTransformerData(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    setServerError(null);

    // Submit based on mode
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isSuccess = createMutation.isSuccess || updateMutation.isSuccess;
  const mutationErrorMessage =
    (createMutation.error as any)?.message ||
    (updateMutation.error as any)?.message ||
    "เกิดข้อผิดพลาดในการบันทึกข้อมูล";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isEditing ? "แก้ไขข้อมูลหม้อแปลง" : "เพิ่มหม้อแปลงใหม่"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transformer Number */}
          <div>
            <label htmlFor="transformerNumber" className="block text-sm font-medium text-gray-700 mb-1">
              หมายเลขหม้อแปลง <span className="text-red-500">*</span>
            </label>
            <input
              id="transformerNumber"
              type="text"
              value={formData.transformerNumber}
              onChange={(e) => handleInputChange("transformerNumber", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="กรอกหมายเลขหม้อแปลง"
              maxLength={50}
              required
            />
          </div>

          {/* GIS Details */}
          <div>
            <label htmlFor="gisDetails" className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียด GIS <span className="text-red-500">*</span>
            </label>
            <textarea
              id="gisDetails"
              value={formData.gisDetails}
              onChange={(e) => handleInputChange("gisDetails", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="กรอกรายละเอียด GIS"
              maxLength={500}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.gisDetails.length}/500 ตัวอักษร
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <FeedbackBanner
              variant="error"
              title="ข้อมูลไม่ถูกต้อง"
              message={
                <ul className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              }
            />
          )}

          {/* Success feedback */}
          {isSuccess && !serverError && (
            <FeedbackBanner
              variant="success"
              title="บันทึกสำเร็จ"
              message={
                isEditing
                  ? "บันทึกการแก้ไขหม้อแปลงเรียบร้อยแล้ว"
                  : "เพิ่มหม้อแปลงใหม่เรียบร้อยแล้ว"
              }
            />
          )}

          {/* Server-action error (returned success: false without throwing) */}
          {serverError && (
            <FeedbackBanner
              variant="error"
              title="ไม่สามารถบันทึกข้อมูลได้"
              message={serverError}
            />
          )}

          {/* Network / thrown errors */}
          {(createMutation.error || updateMutation.error) && !serverError && (
            <FeedbackBanner
              variant="error"
              title="ไม่สามารถบันทึกข้อมูลได้"
              message={mutationErrorMessage}
            />
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  กำลังบันทึก...
                </div>
              ) : (
                isEditing ? "บันทึกการแก้ไข" : "เพิ่มหม้อแปลง"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
