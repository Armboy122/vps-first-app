import { getThailandDateAtMidnight } from "./date.utils";
import {
  type BusinessDayCalendarConfig,
  isOutageBusinessDay,
} from "@/lib/validations/powerOutageRequest";

export type UrgencyLevel =
  | "CRITICAL"
  | "URGENT"
  | "WARNING"
  | "ATTENTION"
  | "PENDING"
  | "HEALTHY"
  | "NEUTRAL"
  | "DEFAULT";

type StatusColor = "red" | "orange" | "amber" | "blue" | "emerald" | "slate";

export interface StatusChipMeta {
  label: string;
  chipClass: string;
  dotClass: string;
}

export interface StatusInfo {
  level: UrgencyLevel;
  label: string;
  primaryLabel: string;
  secondaryLabel: string;
  color: StatusColor;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  dotClass: string;
  summaryTextClass: string;
  daysLabel: string;
  priority: number;
}

export type OmsUrgencyBucketKey =
  | "OVERDUE"
  | "WITHIN_3_BUSINESS_DAYS"
  | "BUSINESS_DAYS_4_TO_7"
  | "BUSINESS_DAYS_8_TO_15"
  | "OVER_15_BUSINESS_DAYS";

export type OmsUrgencyBucketCounts = Record<OmsUrgencyBucketKey, number>;

export interface OmsUrgencyBucketMeta {
  key: OmsUrgencyBucketKey;
  label: string;
  hint: string;
}

interface OmsUrgencyRequestLike {
  outageDate: Date | string;
  omsStatus: string;
  statusRequest: string;
}

export const OMS_URGENCY_BUCKETS: OmsUrgencyBucketMeta[] = [
  {
    key: "OVERDUE",
    label: "เลยกำหนด",
    hint: "ต้องรีบติดตาม",
  },
  {
    key: "WITHIN_3_BUSINESS_DAYS",
    label: "ภายใน 3 วันทำการ",
    hint: "งานเร่งด่วน",
  },
  {
    key: "BUSINESS_DAYS_4_TO_7",
    label: "4-7 วันทำการ",
    hint: "ควรเริ่มติดตาม",
  },
  {
    key: "BUSINESS_DAYS_8_TO_15",
    label: "8-15 วันทำการ",
    hint: "อยู่ในช่วงปกติ",
  },
  {
    key: "OVER_15_BUSINESS_DAYS",
    label: "มากกว่า 15 วันทำการ",
    hint: "ยังไม่เร่งด่วน",
  },
];

const OMS_URGENCY_BUCKET_COUNT_TEMPLATE: OmsUrgencyBucketCounts = {
  OVERDUE: 0,
  WITHIN_3_BUSINESS_DAYS: 0,
  BUSINESS_DAYS_4_TO_7: 0,
  BUSINESS_DAYS_8_TO_15: 0,
  OVER_15_BUSINESS_DAYS: 0,
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDateAtMidnight = (date: Date | string): Date => {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
};

const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const countBusinessDays = (
  startDate: Date,
  endDate: Date,
  calendarConfig?: BusinessDayCalendarConfig,
) => {
  let count = 0;
  let cursor = addCalendarDays(startDate, 1);

  while (cursor.getTime() <= endDate.getTime()) {
    if (isOutageBusinessDay(cursor, calendarConfig)) {
      count += 1;
    }

    cursor = addCalendarDays(cursor, 1);
  }

  return count;
};

/**
 * Business-day difference for urgency buckets.
 * Counts configured holidays and special workdays when calendarConfig is
 * supplied. Without it, the shared calendar rule falls back to Monday-Friday.
 */
export const getBusinessDaysDifference = (
  targetDate: Date | string,
  baseDate: Date = getThailandDateAtMidnight(),
  calendarConfig?: BusinessDayCalendarConfig,
): number => {
  const target = toDateAtMidnight(targetDate);
  const base = toDateAtMidnight(baseDate);
  const calendarDiff = Math.round(
    (target.getTime() - base.getTime()) / MS_PER_DAY,
  );

  if (calendarDiff === 0) {
    return 0;
  }

  if (calendarDiff > 0) {
    const remainingBusinessDays = countBusinessDays(
      base,
      target,
      calendarConfig,
    );

    // Urgency is an inclusive "working days remaining" value. When today is a
    // business day it is still available for OMS preparation, so count it.
    return (
      remainingBusinessDays +
      (isOutageBusinessDay(base, calendarConfig) ? 1 : 0)
    );
  }

  const overdueBusinessDays = countBusinessDays(target, base, calendarConfig);
  return -Math.max(overdueBusinessDays, 1);
};

export const getOmsUrgencyBucketKey = (
  outageDate: Date | string,
  baseDate: Date = getThailandDateAtMidnight(),
  calendarConfig?: BusinessDayCalendarConfig,
): OmsUrgencyBucketKey => {
  const diffBusinessDays = getBusinessDaysDifference(
    outageDate,
    baseDate,
    calendarConfig,
  );

  if (diffBusinessDays < 0) {
    return "OVERDUE";
  }

  if (diffBusinessDays <= 3) {
    return "WITHIN_3_BUSINESS_DAYS";
  }

  if (diffBusinessDays <= 7) {
    return "BUSINESS_DAYS_4_TO_7";
  }

  if (diffBusinessDays <= 15) {
    return "BUSINESS_DAYS_8_TO_15";
  }

  return "OVER_15_BUSINESS_DAYS";
};

export const isApprovedPendingOmsRequest = (
  request: OmsUrgencyRequestLike,
): boolean =>
  request.statusRequest === "CONFIRM" && request.omsStatus === "NOT_ADDED";

export const getOmsUrgencyBucketCounts = (
  requests: OmsUrgencyRequestLike[],
  baseDate: Date = getThailandDateAtMidnight(),
  calendarConfig?: BusinessDayCalendarConfig,
): OmsUrgencyBucketCounts => {
  const counts = { ...OMS_URGENCY_BUCKET_COUNT_TEMPLATE };

  requests.forEach((request) => {
    if (!isApprovedPendingOmsRequest(request)) {
      return;
    }

    const bucketKey = getOmsUrgencyBucketKey(
      request.outageDate,
      baseDate,
      calendarConfig,
    );
    counts[bucketKey] += 1;
  });

  return counts;
};

export const getRequestStatusMeta = (status: string): StatusChipMeta => {
  switch (status) {
    case "CONFIRM":
      return {
        label: "อนุมัติดับไฟ",
        chipClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "NOT":
      return {
        label: "รออนุมัติ",
        chipClass: "bg-amber-50 text-amber-700 border-amber-200",
        dotClass: "bg-amber-500",
      };
    case "CANCELLED":
      return {
        label: "ยกเลิก",
        chipClass: "bg-red-50 text-red-700 border-red-200",
        dotClass: "bg-red-500",
      };
    default:
      return {
        label: status,
        chipClass: "bg-slate-100 text-slate-600 border-slate-200",
        dotClass: "bg-slate-400",
      };
  }
};

export const getOmsStatusMeta = (status: string): StatusChipMeta => {
  switch (status) {
    case "NOT_ADDED":
      return {
        label: "ยังไม่ดำเนินการ",
        chipClass: "bg-slate-100 text-slate-600 border-slate-200",
        dotClass: "bg-slate-400",
      };
    case "PROCESSED":
      return {
        label: "ลง OMS แล้ว",
        chipClass: "bg-blue-50 text-blue-700 border-blue-200",
        dotClass: "bg-blue-500",
      };
    case "CANCELLED":
      return {
        label: "ยกเลิก",
        chipClass: "bg-red-50 text-red-700 border-red-200",
        dotClass: "bg-red-500",
      };
    default:
      return {
        label: status,
        chipClass: "bg-slate-100 text-slate-600 border-slate-200",
        dotClass: "bg-slate-400",
      };
  }
};

const getTimelineLabel = (diffDays: number, useUrgentTone = false) => {
  if (diffDays < 0) {
    return `เลยกำหนด ${Math.abs(diffDays)} วันทำการ`;
  }

  if (diffDays === 0) {
    return "วันนี้";
  }

  if (useUrgentTone && diffDays <= 3) {
    return `ภายใน ${diffDays} วันทำการ`;
  }

  return `อีก ${diffDays} วันทำการ`;
};

const createStatusInfo = (
  diffDays: number,
  overrides: Omit<StatusInfo, "daysLabel"> & { urgentTimeline?: boolean },
): StatusInfo => {
  const { urgentTimeline = false, ...statusInfo } = overrides;

  return {
    ...statusInfo,
    daysLabel: getTimelineLabel(diffDays, urgentTimeline),
  };
};

/**
 * คำนวณสถานะความเร่งด่วนและรูปแบบการแสดงผลของคำขอดับไฟ
 * ใช้สีของ row เป็น "priority/attention state" และใช้ badge แยกสำหรับ workflow state
 */
export const getUrgencyStatus = (
  outageDate: Date,
  omsStatus: string,
  statusRequest: string,
  calendarConfig?: BusinessDayCalendarConfig,
): StatusInfo => {
  const today = getThailandDateAtMidnight();
  const diffDays = getBusinessDaysDifference(
    outageDate,
    today,
    calendarConfig,
  );
  const isCancelled =
    statusRequest === "CANCELLED" || omsStatus === "CANCELLED";
  const isCompleted =
    statusRequest === "CONFIRM" && omsStatus === "PROCESSED";
  const isApprovedPendingOms =
    statusRequest === "CONFIRM" && omsStatus === "NOT_ADDED";
  const isPendingApproval = statusRequest === "NOT";

  if (isCancelled) {
    return {
      level: "NEUTRAL",
      label: "ยกเลิก",
      primaryLabel: "ยกเลิกแล้ว",
      secondaryLabel: "รายการนี้ถูกยกเลิก",
      color: "slate",
      bgClass:
        "bg-slate-100/80 hover:bg-slate-100 transition-colors opacity-80 hover:opacity-100",
      borderClass: "border-l-4 border-slate-300",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      dotClass: "bg-slate-400",
      summaryTextClass: "text-slate-600",
      daysLabel: "ยกเลิกแล้ว",
      priority: 0,
    };
  }

  if (isCompleted) {
    return createStatusInfo(diffDays, {
      level: "HEALTHY",
      label: "ดำเนินการแล้ว",
      primaryLabel: "ดำเนินการแล้ว",
      secondaryLabel: "อนุมัติและลง OMS แล้ว",
      color: "blue",
      bgClass: "bg-blue-50/80 hover:bg-blue-100/70 transition-colors",
      borderClass: "border-l-4 border-blue-400",
      badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
      dotClass: "bg-blue-500",
      summaryTextClass: "text-blue-700",
      priority: 1,
    });
  }

  if (isApprovedPendingOms) {
    if (diffDays < 0) {
      return createStatusInfo(diffDays, {
        level: "CRITICAL",
        label: "เลยกำหนด",
        primaryLabel: getTimelineLabel(diffDays),
        secondaryLabel: "อนุมัติแล้ว แต่ยังไม่ลง OMS",
        color: "red",
        bgClass: "bg-red-100/85 hover:bg-red-100 transition-colors",
        borderClass: "border-l-4 border-red-500",
        badgeClass: "bg-red-100 text-red-700 border-red-200",
        dotClass: "bg-red-600",
        summaryTextClass: "text-red-700",
        priority: 10,
      });
    }

    if (diffDays <= 3) {
      return createStatusInfo(diffDays, {
        level: "URGENT",
        label: diffDays === 0 ? "วันนี้" : "ภายใน 3 วันทำการ",
        primaryLabel: getTimelineLabel(diffDays, true),
        secondaryLabel: "อนุมัติแล้ว แต่ยังไม่ลง OMS",
        color: "orange",
        bgClass: "bg-orange-50/90 hover:bg-orange-100/80 transition-colors",
        borderClass: "border-l-4 border-orange-400",
        badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
        dotClass: "bg-orange-500",
        summaryTextClass: "text-orange-700",
        priority: 9,
        urgentTimeline: true,
      });
    }

    if (diffDays <= 7) {
      return createStatusInfo(diffDays, {
        level: "WARNING",
        label: "4-7 วันทำการ",
        primaryLabel: getTimelineLabel(diffDays),
        secondaryLabel: "อนุมัติแล้ว แต่ยังไม่ลง OMS",
        color: "amber",
        bgClass: "bg-amber-100/70 hover:bg-amber-100 transition-colors",
        borderClass: "border-l-4 border-amber-400",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
        summaryTextClass: "text-amber-700",
        priority: 8,
      });
    }

    if (diffDays <= 15) {
      return createStatusInfo(diffDays, {
        level: "ATTENTION",
        label: "8-15 วันทำการ",
        primaryLabel: getTimelineLabel(diffDays),
        secondaryLabel: "อนุมัติแล้ว แต่ยังไม่ลง OMS",
        color: "emerald",
        bgClass: "bg-emerald-50/85 hover:bg-emerald-100/75 transition-colors",
        borderClass: "border-l-4 border-emerald-400",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
        summaryTextClass: "text-emerald-700",
        priority: 7,
      });
    }

    return createStatusInfo(diffDays, {
      level: "DEFAULT",
      label: "มากกว่า 15 วันทำการ",
      primaryLabel: getTimelineLabel(diffDays),
      secondaryLabel: "อนุมัติแล้ว แต่ยังไม่ลง OMS",
      color: "blue",
      bgClass: "bg-blue-50/85 hover:bg-blue-100/75 transition-colors",
      borderClass: "border-l-4 border-blue-300",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotClass: "bg-blue-500",
      summaryTextClass: "text-blue-700",
      priority: 6,
    });
  }

  if (diffDays < 0) {
    return createStatusInfo(diffDays, {
      level: "CRITICAL",
      label: "เลยกำหนด",
      primaryLabel: getTimelineLabel(diffDays),
      secondaryLabel: isPendingApproval
        ? "ยังรออนุมัติ"
        : "ถึงกำหนดแล้ว ต้องติดตาม",
      color: "red",
      bgClass: "bg-red-100/80 hover:bg-red-100 transition-colors",
      borderClass: "border-l-4 border-red-500",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      dotClass: "bg-red-600",
      summaryTextClass: "text-red-700",
      priority: 10,
    });
  }

  if (diffDays <= 3) {
    return createStatusInfo(diffDays, {
      level: "URGENT",
      label: diffDays === 0 ? "วันนี้" : "เร่งด่วน",
      primaryLabel: getTimelineLabel(diffDays, true),
      secondaryLabel: isPendingApproval
        ? "ยังรออนุมัติ"
        : "ใกล้ถึงวันดับไฟ",
      color: "red",
      bgClass: "bg-red-50/90 hover:bg-red-100/80 transition-colors",
      borderClass: "border-l-4 border-red-400",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
      dotClass: "bg-red-500",
      summaryTextClass: "text-red-700",
      priority: 9,
      urgentTimeline: true,
    });
  }

  if (isPendingApproval) {
    const isNearDeadline = diffDays <= 7;
    return createStatusInfo(diffDays, {
      level: "PENDING",
      label: "รออนุมัติ",
      primaryLabel: "รออนุมัติ",
      secondaryLabel: "อยู่ระหว่างรอการอนุมัติ",
      color: "amber",
      bgClass: isNearDeadline
        ? "bg-amber-100/60 hover:bg-amber-100 transition-colors"
        : "bg-amber-50/70 hover:bg-amber-100/60 transition-colors",
      borderClass: isNearDeadline
        ? "border-l-4 border-amber-400"
        : "border-l-4 border-amber-300",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
      summaryTextClass: "text-amber-700",
      priority: 7,
    });
  }

  if (diffDays <= 7) {
    return createStatusInfo(diffDays, {
      level: "WARNING",
      label: "ใกล้ถึงวัน",
      primaryLabel: "ใกล้ถึงวันดับไฟ",
      secondaryLabel: "กำหนดการใกล้มาถึง",
      color: "amber",
      bgClass: "bg-amber-50/65 hover:bg-amber-100/60 transition-colors",
      borderClass: "border-l-4 border-amber-300",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
      summaryTextClass: "text-amber-700",
      priority: 6,
    });
  }

  return createStatusInfo(diffDays, {
    level: "DEFAULT",
    label: "ตามแผน",
    primaryLabel: "ตามแผน",
    secondaryLabel: "กำหนดการยังไม่เร่งด่วน",
    color: "slate",
    bgClass: "bg-white hover:bg-slate-50 transition-colors",
    borderClass: "border-l-4 border-slate-200",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    summaryTextClass: "text-slate-600",
    priority: 5,
  });
};
