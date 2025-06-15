import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminContext } from "../../context/AdminContext";
import { getTransformers } from "@/app/api/action/User";
import { Transformer } from "../../types/admin.types";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorMessage } from "../shared/ErrorMessage";
import { TransformerRow } from "./TransformerRow";
import { TransformerPagination } from "./TransformerPagination";
import { TransformerForm } from "./TransformerForm";
import { PageSizeSelector } from "../shared/PageSizeSelector";

interface TransformersResponse {
  transformers: Transformer[];
  totalCount: number;
  totalPages: number;
}

export function TransformerTable() {
  const { transformerSearchParams, updateTransformerSearchParams } = useAdminContext();
  const [showForm, setShowForm] = useState(false);
  const [editingTransformer, setEditingTransformer] = useState<Transformer | undefined>();

  // Fetch transformers with React Query
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["transformers", transformerSearchParams],
    queryFn: () =>
      getTransformers(
        transformerSearchParams.page,
        transformerSearchParams.limit,
        transformerSearchParams.search,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    updateTransformerSearchParams({ limit: newLimit, page: 1 });
  };

  // Handle add new transformer
  const handleAddNew = () => {
    setEditingTransformer(undefined);
    setShowForm(true);
  };

  // Handle edit transformer
  const handleEdit = (transformer: Transformer) => {
    setEditingTransformer(transformer);
    setShowForm(true);
  };

  // Handle form close
  const handleFormClose = () => {
    setShowForm(false);
    setEditingTransformer(undefined);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-8">
          <LoadingSpinner size="lg" text="กำลังโหลดข้อมูลหม้อแปลง..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <ErrorMessage
            message="ไม่สามารถโหลดข้อมูลหม้อแปลงได้"
            retry={refetch}
          />
        </div>
      </div>
    );
  }

  const { transformers = [], totalCount = 0, totalPages = 0 } = data || {};

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Table Header with Actions */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              รายการหม้อแปลง
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              จัดการข้อมูลหม้อแปลงและการนำเข้าข้อมูล
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <PageSizeSelector
              value={transformerSearchParams.limit}
              onChange={handlePageSizeChange}
            />
            
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ เพิ่มหม้อแปลง
            </button>
          </div>
        </div>

        {/* Table Content */}
        {transformers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">⚡</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ไม่พบข้อมูลหม้อแปลง
            </h3>
            <p className="text-gray-600 mb-4">
              {transformerSearchParams.search
                ? "ลองเปลี่ยนคำค้นหา หรือล้างการค้นหา"
                : "ยังไม่มีข้อมูลหม้อแปลงในระบบ"}
            </p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              เพิ่มหม้อแปลงแรก
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หมายเลขหม้อแปลง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รายละเอียด GIS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่สร้าง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่แก้ไข
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การจัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transformers.map((transformer) => (
                    <TransformerRow 
                      key={transformer.id} 
                      transformer={transformer} 
                      onEdit={handleEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <TransformerPagination 
              totalCount={totalCount} 
              totalPages={totalPages} 
            />
          </>
        )}
      </div>

      {/* Transformer Form Modal */}
      {showForm && (
        <TransformerForm
          transformer={editingTransformer}
          onCancel={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}
    </>
  );
}