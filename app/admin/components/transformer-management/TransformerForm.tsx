import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransformer, updateTransformer } from "@/app/api/action/User";
import { Transformer } from "../../types/admin.types";
import { validateTransformerData } from "../../utils/csvParser";

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

  const queryClient = useQueryClient();
  const isEditing = !!transformer;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => createTransformer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => updateTransformer(transformer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transformers"] });
      onSuccess();
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-1">ข้อมูลไม่ถูกต้อง:</h4>
              <ul className="text-sm text-red-600 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mutation Errors */}
          {(createMutation.error || updateMutation.error) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {(createMutation.error as any)?.message || 
                 (updateMutation.error as any)?.message || 
                 "เกิดข้อผิดพลาดในการบันทึกข้อมูล"}
              </p>
            </div>
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