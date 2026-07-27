export const formLabelClass =
  "block text-[15px] font-semibold tracking-tight text-slate-800";

export const formHelpClass = "text-[13px] leading-6 text-slate-600";

export const formFieldWrapperClass = "space-y-2";

export const formControlBaseClass =
  "min-h-11 w-full rounded-[10px] border bg-white px-4 py-3 text-base text-slate-900 transition-colors duration-150 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,93,66,0.18)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";

export const formControlDefaultClass =
  "border-slate-200 focus:border-[rgba(36,93,66,0.55)]";

export const formControlErrorClass =
  "border-red-300 bg-red-50/60 focus:border-red-400 focus-visible:ring-red-200";

export const formErrorClass =
  "flex items-start gap-2 text-[13px] leading-6 font-medium text-red-700";

export const formButtonBaseClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,93,66,0.22)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const formButtonSizeClass = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-[15px]",
  lg: "px-6 py-3 text-base",
} as const;

export const formButtonVariantClass = {
  primary: "bg-pea-700 text-white shadow-sm hover:bg-pea-800",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
} as const;
