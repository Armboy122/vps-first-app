import { memo } from "react";
import Pagination from "@/app/power-outage-requests/pagination";
import { ItemsPerPageSelector } from "./ItemsPerPageSelector";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  displayStart: number;
  displayEnd: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export const PaginationControls = memo<PaginationControlsProps>(
  ({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    displayStart,
    displayEnd,
    onPageChange,
    onItemsPerPageChange,
  }) => {
    return (
      <div className="mt-6 flex flex-col lg:flex-row justify-between items-center gap-4">
        {/* Items per page selector and info */}
        <ItemsPerPageSelector
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          totalItems={totalItems}
          currentStart={displayStart}
          currentEnd={displayEnd}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    );
  },
);

PaginationControls.displayName = "PaginationControls";
