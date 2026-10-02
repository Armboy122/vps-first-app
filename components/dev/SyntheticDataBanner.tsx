"use client";

/**
 * A visible guardrail for the isolated Vercel preview. Keep this copy in Thai
 * so a screenshot or shared link still makes the synthetic-data boundary clear.
 */
export function SyntheticDataBanner() {
  return (
    <div
      role="status"
      aria-label="แจ้งเตือนโหมดพรีวิว"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
    >
      <span className="font-bold">โหมดพรีวิวสำหรับทดสอบ</span>
      <span className="mx-2 text-amber-700" aria-hidden="true">•</span>
      ใช้ข้อมูลจำลองที่แยกจากระบบจริง
    </div>
  );
}

export default SyntheticDataBanner;
