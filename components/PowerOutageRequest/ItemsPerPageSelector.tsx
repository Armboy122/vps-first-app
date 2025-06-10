import { memo } from 'react';

interface ItemsPerPageSelectorProps {
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  totalItems: number;
  currentStart: number;
  currentEnd: number;
}

export const ItemsPerPageSelector = memo<ItemsPerPageSelectorProps>(({
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  currentStart,
  currentEnd
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Items per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">แสดงผล:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pea-500 focus:border-pea-500 transition-colors duration-200"
        >
          <option value={10}>10</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
        </select>
        <span className="text-sm text-gray-700">รายการ</span>
      </div>

      {/* Total results info */}
      <div className="text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-md">
        แสดงรายการที่ <span className="font-medium text-pea-700">{currentStart}</span> - <span className="font-medium text-pea-700">{currentEnd}</span> จากทั้งหมด <span className="font-medium text-pea-700">{totalItems}</span> รายการ
      </div>
    </div>
  );
});

ItemsPerPageSelector.displayName = 'ItemsPerPageSelector';