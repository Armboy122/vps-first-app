import { useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/lib/useAuth';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

/**
 * Hook สำหรับตั้งค่า logger ให้ทำงานกับ user session
 * จะ auto-update ข้อมูล user และ page เมื่อเปลี่ยนแปลง
 */
export const useLogger = () => {
  const authInfo = useAuth();
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // ตั้งค่า user info เมื่อ login
  useEffect(() => {
    if (status !== 'loading' && session?.user) {
      logger.setUser(session.user.id, session.user.role);
    }
  }, [session, status]);

  // อัพเดทหน้าปัจจุบัน
  useEffect(() => {
    logger.setPage(pathname);
  }, [pathname]);

  return logger;
};
