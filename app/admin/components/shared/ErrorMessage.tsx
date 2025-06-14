interface ErrorMessageProps {
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorMessage({ 
  message, 
  retry, 
  className = "" 
}: ErrorMessageProps) {
  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-center">
        <span className="text-red-500 mr-2">❌</span>
        <span className="text-red-700 font-medium">เกิดข้อผิดพลาด:</span>
      </div>
      <p className="text-red-600 mt-1">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          ลองใหม่
        </button>
      )}
    </div>
  );
}