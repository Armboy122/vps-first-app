import { PAGE_SIZE_OPTIONS } from "../../constants/admin.constants";

interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  className?: string;
}

export function PageSizeSelector({ 
  value, 
  onChange, 
  className = "" 
}: PageSizeSelectorProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600">แสดงต่อหน้า:</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-600">รายการ</span>
    </div>
  );
}