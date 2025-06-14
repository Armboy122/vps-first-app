import dayjs from "dayjs";

/**
 * คำนวณจำนวนวันที่เหลือจากวันปัจจุบัน
 */
export const getDaysFromToday = (date: string): number | null => {
  if (!date) return null;
  const selectedDate = dayjs(date).startOf("day");
  const today = dayjs().startOf("day");
  return selectedDate.diff(today, "day");
};

/**
 * คำนวณวันที่ขั้นต่ำที่สามารถเลือกได้ (มากกว่า 10 วันจากวันปัจจุบัน)
 */
export const getMinSelectableDate = (): string => {
  const today = dayjs().startOf("day");
  const minDate = today.add(11, "day");
  return minDate.format("YYYY-MM-DD");
};

/**
 * ตรวจสอบความถูกต้องของวันที่และเวลา
 */
export const validateDateAndTime = (
  outageDate: string,
  minSelectableDate: string,
  startTime?: string,
  endTime?: string,
): { isValid: boolean; error?: string } => {
  const selectedDate = dayjs(outageDate).startOf("day");
  const minDate = dayjs(minSelectableDate).startOf("day");

  // ตรวจสอบวันที่
  if (selectedDate.isBefore(minDate)) {
    return {
      isValid: false,
      error: `วันที่ดับไฟต้องเป็นวันที่ ${minDate.format("DD/MM/YYYY")} หรือหลังจากนั้น (มากกว่า 10 วันจากวันปัจจุบัน)`,
    };
  }

  // ตรวจสอบเวลา (ถ้ามี)
  if (startTime && endTime) {
    const startDateTime = dayjs(`${outageDate} ${startTime}`);
    const endDateTime = dayjs(`${outageDate} ${endTime}`);

    if (
      endDateTime.isSame(startDateTime) ||
      endDateTime.isBefore(startDateTime)
    ) {
      return {
        isValid: false,
        error: "เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น",
      };
    }
  }

  return { isValid: true };
};

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย
 */
export const formatThaiDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "ไม่พบข้อมูล";
  }
};
