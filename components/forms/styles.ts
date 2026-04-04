export const formLabelClass =
  "block text-sm font-semibold tracking-tight text-slate-800";

export const formHelpClass = "text-xs leading-6 text-slate-500";

export const formFieldWrapperClass = "space-y-2";

export const formControlBaseClass =
  "w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,93,66,0.18)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export const formControlDefaultClass =
  "border-slate-200 focus:border-[rgba(36,93,66,0.55)]";

export const formControlErrorClass =
  "border-red-300 bg-red-50/60 focus:border-red-400 focus-visible:ring-red-200";

export const formErrorClass =
  "flex items-start gap-2 text-sm leading-6 text-red-700";

export const formButtonBaseClass =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,93,66,0.22)] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

export const formButtonSizeClass = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
} as const;

export const formButtonVariantClass = {
  primary: "bg-pea-700 text-white shadow-sm hover:bg-pea-800",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
} as const;
