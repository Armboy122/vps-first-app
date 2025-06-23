/**
 * Constants สำหรับ Power Outage Request Form
 */

export const FORM_DEFAULTS = {
  MIN_DAYS_FROM_TODAY: 10,
  MIN_TIME: "06:00",
  MAX_TIME: "20:00",
  TIME_INTERVAL_MINUTES: 30,
} as const;

export const TIME_CONSTRAINTS = {
  WORKING_START: "06:00",
  WORKING_END: "20:00",
  MINIMUM_DURATION_MINUTES: 30,
} as const;

export const FORM_MESSAGES = {
  SUCCESS: {
    SINGLE_REQUEST: "คำขอถูกบันทึกเรียบร้อยแล้ว",
    MULTIPLE_REQUESTS: "บันทึกคำขอสำเร็จทั้งหมด",
    ADDED_TO_LIST: "คำขอถูกเพิ่มเข้าสู่รายการแล้ว (เรียงตามวันที่และเวลา)",
    REMOVED_FROM_LIST: "ลบรายการออกจากรายการรอบันทึกแล้ว",
    CLEARED_ALL: "ล้างรายการทั้งหมดแล้ว",
  },
  ERROR: {
    INVALID_DATA: "ข้อมูลไม่ถูกต้อง",
    SAVE_FAILED: "ไม่สามารถบันทึกคำขอได้",
    CONNECTION_ERROR: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
    NO_REQUESTS: "ไม่มีคำขอในรายการ",
  },
  VALIDATION: {
    TIME_OUTSIDE_WORKING_HOURS: "เวลาต้องอยู่ในช่วงเวลาทำการ 06:00 - 20:00 น.",
    END_TIME_TOO_EARLY: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้นอย่างน้อย 30 นาที",
    DATE_TOO_EARLY: "วันที่ดับไฟต้องเป็นอย่างน้อย 10 วันข้างหน้า",
  },
} as const;

export type FormDefaults = typeof FORM_DEFAULTS;
export type TimeConstraints = typeof TIME_CONSTRAINTS;
export type FormMessages = typeof FORM_MESSAGES;