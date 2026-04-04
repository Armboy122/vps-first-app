import { FeedbackBanner } from "./FeedbackBanner";

interface ErrorMessageProps {
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, retry, className = "" }: ErrorMessageProps) {
  return (
    <FeedbackBanner
      variant="error"
      title="เกิดข้อผิดพลาด"
      message={message}
      action={
        retry ? (
          <button
            type="button"
            onClick={retry}
            className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
          >
            ลองใหม่
          </button>
        ) : undefined
      }
      className={className}
    />
  );
}
