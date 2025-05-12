import { format, formatDistance, addDays, differenceInDays, isAfter, isBefore, isEqual } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * ไฟล์ utility สำหรับจัดการวันและเวลาในแอปพลิเคชัน
 * รองรับการทำงานกับไทม์โซน UTC+7 (ประเทศไทย)
 */

/**
 * สร้างวันที่ปัจจุบันในไทม์โซน UTC+7 (ประเทศไทย)
 * @returns Date วัตถุ Date ที่มีเวลาตามไทม์โซนไทย
 */
export function getThailandDate(): Date {
  // สร้างวันที่ในไทม์โซน UTC+7 อย่างชัดเจน
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
}

/**
 * สร้างวันที่ปัจจุบันในไทม์โซน UTC+7 (ประเทศไทย) และตั้งค่าเวลาเป็น 00:00:00
 * @returns Date วัตถุ Date ที่มีเวลา 00:00:00 ตามไทม์โซนไทย
 */
export function getThailandDateAtMidnight(): Date {
  const today = getThailandDate();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * คำนวณความแตกต่างของวันระหว่างสองวันที่
 * @param dateA วันที่แรก
 * @param dateB วันที่สอง
 * @returns จำนวนวันที่แตกต่างกัน
 */
export function getDaysDifference(dateA: Date, dateB: Date): number {
  return differenceInDays(dateA, dateB);
}

/**
 * ตรวจสอบว่าวันที่อยู่ในอนาคตหรือไม่ เมื่อเทียบกับวันปัจจุบัน
 * @param date วันที่ที่ต้องการตรวจสอบ
 * @returns boolean true ถ้าวันที่อยู่ในอนาคต
 */
export function isDateInFuture(date: Date): boolean {
  const today = getThailandDateAtMidnight();
  return isAfter(date, today) || isEqual(date, today);
}

/**
 * แปลงวันและเวลาเป็น ISO string พร้อมกับรักษาไทม์โซน UTC+7
 * @param date วันที่
 * @param timeString เวลาในรูปแบบ HH:mm
 * @returns string ISO string ที่รวมวันที่และเวลาพร้อมไทม์โซน UTC+7
 */
export function createThailandDateTime(date: Date | string, timeString: string): Date {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  return new Date(`${dateStr}T${timeString}:00+07:00`);
}

/**
 * จัดรูปแบบวันที่เป็นข้อความภาษาไทย
 * @param date วันที่
 * @returns string วันที่ในรูปแบบไทย เช่น "1 มกราคม 2567"
 */
export function formatToThaiDate(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: th });
}

/**
 * รูปแบบวันที่เป็นวันในสัปดาห์ภาษาไทย
 * @param date วันที่
 * @returns string วันในสัปดาห์ภาษาไทย เช่น "วันจันทร์ที่ 1 มกราคม 2567"
 */
export function formatToThaiDayAndDate(date: Date): string {
  return format(date, 'eeee ที่ d MMMM yyyy', { locale: th });
} 