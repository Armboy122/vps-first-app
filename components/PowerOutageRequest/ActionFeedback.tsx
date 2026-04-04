"use client";

export type ActionFeedbackState = {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

interface ActionFeedbackProps extends ActionFeedbackState {
  onDismiss?: () => void;
}

const FEEDBACK_STYLES: Record<
  ActionFeedbackState["variant"],
  {
    wrapper: string;
    badge: string;
    title: string;
    icon: string;
  }
> = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
    badge: "bg-emerald-500/10 text-emerald-700",
    title: "text-emerald-950",
    icon: "สำเร็จ",
  },
  error: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-900",
    badge: "bg-rose-500/10 text-rose-700",
    title: "text-rose-950",
    icon: "ผิดพลาด",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    badge: "bg-amber-500/10 text-amber-700",
    title: "text-amber-950",
    icon: "คำเตือน",
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-900",
    badge: "bg-sky-500/10 text-sky-700",
    title: "text-sky-950",
    icon: "ข้อมูล",
  },
};

export const ActionFeedback = ({
  variant,
  title,
  message,
  onDismiss,
}: ActionFeedbackProps) => {
  const styles = FEEDBACK_STYLES[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`mb-4 rounded-2xl border px-4 py-4 shadow-sm ${styles.wrapper}`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
          {styles.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
          <p className="mt-1 text-sm leading-6 text-current/90">{message}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-current/10 bg-white/70 px-2.5 py-1 text-xs font-medium text-current/80 transition hover:bg-white"
          >
            ปิด
          </button>
        )}
      </div>
    </div>
  );
};
