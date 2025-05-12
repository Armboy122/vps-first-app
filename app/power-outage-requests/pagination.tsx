"use client";
import React, { useCallback, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = React.memo(({ currentPage, totalPages, onPageChange }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // เมื่อมีการเปลี่ยนหน้า ให้อัปเดต URL แทนการใช้ state เพื่อป้องกันการ re-render
  const handlePageChange = useCallback((page: number) => {
    // ป้องกันการเปลี่ยนหน้าซ้ำซึ่งทำให้เกิด re-render โดยไม่จำเป็น
    if (page === currentPage) return;
    
    // เรียกฟังก์ชัน callback ที่ส่งมาจาก parent
    onPageChange(page);
  }, [currentPage, onPageChange]);

  // สร้างฟังก์ชันสำหรับการสร้างปุ่มหน้า
  const renderPageButtons = useCallback(() => {
    // สำหรับหน้าจอขนาดเล็ก แสดงเฉพาะปุ่มสำคัญ
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return (
        <>
          {currentPage > 1 && (
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">ก่อนหน้า</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">ถัดไป</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </>
      );
    }

    // สำหรับหน้าจอขนาดใหญ่ แสดงปุ่มเต็มรูปแบบ
    const pageButtons = [];
    const maxVisiblePages = 5; // จำนวนปุ่มหน้าที่แสดงสูงสุด

    // คำนวณช่วงของปุ่มหน้าที่จะแสดง
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // ปรับค่า startPage ถ้า endPage ชนขอบบน
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // ปุ่มหน้าแรก
    if (startPage > 1) {
      pageButtons.push(
        <button
          key="first"
          onClick={() => handlePageChange(1)}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pageButtons.push(
          <span
            key="ellipsis1"
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            ...
          </span>
        );
      }
    }

    // ปุ่มหน้าในช่วง
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`relative inline-flex items-center px-4 py-2 border ${
            i === currentPage
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          } text-sm font-medium`}
        >
          {i}
        </button>
      );
    }

    // ปุ่มหน้าสุดท้าย
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageButtons.push(
          <span
            key="ellipsis2"
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            ...
          </span>
        );
      }
      pageButtons.push(
        <button
          key="last"
          onClick={() => handlePageChange(totalPages)}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {totalPages}
        </button>
      );
    }

    return (
      <>
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
            currentPage === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <span className="sr-only">ก่อนหน้า</span>
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        {pageButtons}
        <button
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
            currentPage === totalPages
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <span className="sr-only">ถัดไป</span>
          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </>
    );
  }, [currentPage, totalPages, handlePageChange]);

  // ใช้ useMemo เพื่อป้องกันการ re-render ที่ไม่จำเป็น
  const paginationContent = useMemo(() => {
    return (
      <div className="mt-6 flex justify-center">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          {typeof window !== 'undefined' && renderPageButtons()}
        </nav>
      </div>
    );
  }, [renderPageButtons]);

  return paginationContent;
});

// เพิ่ม display name สำหรับ React.memo
Pagination.displayName = 'Pagination';

export default Pagination;