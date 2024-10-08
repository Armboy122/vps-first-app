// components/Pagination.tsx
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = [];
  let startPage, endPage;

  if (totalPages <= 10) {
    startPage = 1;
    endPage = totalPages;
  } else {
    if (currentPage <= 6) {
      startPage = 1;
      endPage = 10;
    } else if (currentPage + 4 >= totalPages) {
      startPage = totalPages - 9;
      endPage = totalPages;
    } else {
      startPage = currentPage - 5;
      endPage = currentPage + 4;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="flex justify-center mt-6">
      <ul className="flex space-x-2">
        {currentPage > 1 && (
          <li>
            <button onClick={() => onPageChange(1)} className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300">
              &#171;
            </button>
          </li>
        )}
        {pageNumbers.map(number => (
          <li key={number}>
            <button
              onClick={() => onPageChange(number)}
              className={`px-3 py-1 rounded-md ${
                currentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {number}
            </button>
          </li>
        ))}
        {currentPage < totalPages && (
          <li>
            <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300">
              &#187;
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Pagination;