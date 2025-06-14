import { unstable_cache } from "next/cache";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * ไฟล์ utility สำหรับจัดการการแคชข้อมูลในแอปพลิเคชัน
 * รองรับการใช้งาน unstable_cache เพื่อแคชข้อมูลและ revalidate
 */

/**
 * ฟังก์ชันสำหรับแคชข้อมูลที่ดึงมาจากฐานข้อมูลหรือ API
 *
 * @param fn ฟังก์ชันที่ใช้ดึงข้อมูลที่ต้องการแคช
 * @param keyParts ส่วนประกอบของคีย์สำหรับการแคช (ควรเป็นค่าที่ระบุการแคชอย่างเฉพาะเจาะจง)
 * @param tags แท็กที่ใช้ในการล้างแคช (revalidate)
 * @param revalidateSeconds ระยะเวลาในการล้างแคชอัตโนมัติ (วินาที)
 * @returns ฟังก์ชันที่ถูกแคชแล้ว
 */
export function cacheData<T>(
  fn: (...args: any[]) => Promise<T>,
  keyParts: string[],
  tags: string[] = [],
  revalidateSeconds: number = 3600, // 1 ชั่วโมงเป็นค่าเริ่มต้น
) {
  return unstable_cache(fn, keyParts, {
    tags,
    revalidate: revalidateSeconds,
  });
}

/**
 * ฟังก์ชันสำหรับแคชข้อมูลสถานะ OMS แยกตามจุดรวมงาน
 *
 * @param fn ฟังก์ชันที่ดึงข้อมูลสถานะ OMS
 * @returns ฟังก์ชันที่ถูกแคชแล้ว
 */
export function cacheOMSStatusByWorkCenter<T>(fn: () => Promise<T>) {
  return cacheData(fn, ["oms-status-by-workcenter"], ["oms-status"], 60 * 30); // แคช 30 นาที
}

/**
 * ฟังก์ชันสำหรับแคชข้อมูลการกระจายสถานะ OMS ตามจุดรวมงาน
 *
 * @param fn ฟังก์ชันที่ดึงข้อมูลการกระจายสถานะ OMS
 * @returns ฟังก์ชันที่ถูกแคชแล้ว
 */
export function cacheOMSStatusDistribution<T>(fn: () => Promise<T>) {
  return cacheData(fn, ["oms-status-distribution"], ["oms-status"], 60 * 30); // แคช 30 นาที
}

/**
 * ล้างแคชตามพาธ
 *
 * @param path พาธที่ต้องการล้างแคช
 */
export function clearCacheByPath(path: string) {
  revalidatePath(path);
}

/**
 * ล้างแคชตามแท็ก
 *
 * @param tag แท็กที่ต้องการล้างแคช
 */
export function clearCacheByTag(tag: string) {
  revalidateTag(tag);
}

/**
 * ล้างแคชข้อมูล OMS ทั้งหมด
 */
export function clearOMSCache() {
  revalidateTag("oms-status");
}

/**
 * สร้าง Server Action ที่มีการแคชข้อมูล
 *
 * @param action Server Action ที่ต้องการแคช
 * @param keyParts ส่วนประกอบของคีย์สำหรับการแคช
 * @param tags แท็กที่ใช้ในการล้างแคช
 * @param revalidateSeconds ระยะเวลาในการล้างแคชอัตโนมัติ (วินาที)
 * @returns Server Action ที่ถูกแคชแล้ว
 */
export function cachedServerAction<T, Args extends any[]>(
  action: (...args: Args) => Promise<T>,
  keyParts: string[],
  tags: string[] = [],
  revalidateSeconds: number = 3600,
) {
  return async (...args: Args) => {
    const cachedAction = cacheData(
      async () => action(...args),
      [...keyParts, ...args.map((arg) => JSON.stringify(arg))],
      tags,
      revalidateSeconds,
    );

    return cachedAction();
  };
}
