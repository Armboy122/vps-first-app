import { useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/lib/useAuth';
import { usePathname } from 'next/navigation';

/**
 * Hook สำหรับตั้งค่า logger ให้ทำงานกับ user session
 * จะ auto-update ข้อมูล user และ page เมื่อเปลี่ยนแปลง
 */
export const useLogger = () => {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // ตั้งค่า user info เมื่อ login
  useEffect(() => {
    if (!isLoading && user) {
      logger.setUser(user.id.toString(), user.role);
    }
  }, [user, isLoading]);

  // อัพเดทหน้าปัจจุบัน
  useEffect(() => {
    logger.setPage(pathname);
  }, [pathname]);

  return logger;
};
