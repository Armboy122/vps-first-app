"use client";
import { memo, useCallback } from 'react';

interface TableHeaderProps {
  selectAll: boolean;
  setSelectAll: (value: boolean) => void;
  isAdmin: boolean;
  isViewer: boolean;
}

export const TableHeader = memo(({
  selectAll,
  setSelectAll,
  isAdmin,
  isViewer,
}: TableHeaderProps) => {
  const handleSelectAllChange = useCallback(() => {
    setSelectAll(!selectAll);
  }, [selectAll, setSelectAll]);

  return (
    <thead className="bg-gray-100">
      <tr>
        {!isViewer && (
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAllChange}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
          </th>
        )}
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          วันที่ดับไฟ
        </th>
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          เวลา
        </th>
        {(isAdmin || isViewer) && (
          <>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ศูนย์งาน
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              สาขา
            </th>
          </>
        )}
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          หมายเลขหม้อแปลง
        </th>
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          บริเวณ
        </th>
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          สถานะ OMS
        </th>
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          สถานะอนุมัติ
        </th>
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          ผู้สร้างคำขอ
        </th>
        {!isViewer && (
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            การดำเนินการ
          </th>
        )}
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          วันที่สร้างเอกสาร
        </th>
      </tr>
    </thead>
  );
});

TableHeader.displayName = 'TableHeader'; 