/**
 * ระบบ Logging สำหรับติดตามการใช้งานของผู้ใช้
 * รองรับการ log ในหลายระดับและส่งข้อมูลไปยัง analytics service
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  AUDIT = "audit", // สำหรับติดตามการกระทำสำคัญ
}

export enum LogCategory {
  USER_ACTION = "user_action",
  API_CALL = "api_call",
  FORM_INTERACTION = "form_interaction",
  NAVIGATION = "navigation",
  ERROR = "error",
  PERFORMANCE = "performance",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  userId?: string;
  userRole?: string;
  details?: Record<string, any>;
  sessionId?: string;
  page?: string;
  userAgent?: string;
}

class Logger {
  private sessionId: string;
  private userId?: string;
  private userRole?: string;
  private page?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.page = typeof window !== "undefined" ? window.location.pathname : "";
  }

  /**
   * ตั้งค่าข้อมูลผู้ใช้สำหรับ logging
   */
  setUser(userId: string, userRole: string) {
    this.userId = userId;
    this.userRole = userRole;
  }

  /**
   * อัพเดทหน้าปัจจุบัน
   */
  setPage(page: string) {
    this.page = page;
  }

  /**
   * Log การกระทำของผู้ใช้ (ปุ่มกด, การกรอกฟอร์ม, etc.)
   */
  logUserAction(action: string, details?: Record<string, any>) {
    this.log(LogLevel.AUDIT, LogCategory.USER_ACTION, action, details);
  }

  /**
   * Log การเรียก API
   */
  logApiCall(action: string, details?: Record<string, any>) {
    this.log(LogLevel.INFO, LogCategory.API_CALL, action, details);
  }

  /**
   * Log การโต้ตอบกับฟอร์ม
   */
  logFormInteraction(action: string, details?: Record<string, any>) {
    this.log(LogLevel.INFO, LogCategory.FORM_INTERACTION, action, details);
  }

  /**
   * Log การนำทาง
   */
  logNavigation(action: string, details?: Record<string, any>) {
    this.log(LogLevel.INFO, LogCategory.NAVIGATION, action, details);
  }

  /**
   * Log ข้อผิดพลาด
   */
  logError(
    action: string,
    error: Error | string,
    details?: Record<string, any>,
  ) {
    const errorDetails = {
      ...details,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    };
    this.log(LogLevel.ERROR, LogCategory.ERROR, action, errorDetails);
  }

  /**
   * Log ข้อมูล performance
   */
  logPerformance(action: string, details?: Record<string, any>) {
    this.log(LogLevel.INFO, LogCategory.PERFORMANCE, action, details);
  }

  /**
   * Log หลัก
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    action: string,
    details?: Record<string, any>,
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      userId: this.userId,
      userRole: this.userRole,
      details,
      sessionId: this.sessionId,
      page: this.page,
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "",
    };

    // Log ไปยัง console (development)
    if (process.env.NODE_ENV === "development") {
      this.logToConsole(entry);
    }

    // ส่ง log ไปยัง server (production)
    if (process.env.NODE_ENV === "production") {
      this.sendToServer(entry);
    }

    // เก็บ log ใน localStorage สำหรับ debug
    this.saveToLocalStorage(entry);
  }

  /**
   * แสดงใน console
   */
  private logToConsole(entry: LogEntry) {
    const color = this.getLogColor(entry.level);
    const message = `[${entry.category.toUpperCase()}] ${entry.action}`;

    console.groupCollapsed(
      `%c${entry.timestamp} %c${message}`,
      "color: gray; font-size: 11px",
      `color: ${color}; font-weight: bold`,
    );

    if (entry.userId) console.log("User:", entry.userId, `(${entry.userRole})`);
    if (entry.page) console.log("Page:", entry.page);
    if (entry.details) console.log("Details:", entry.details);

    console.groupEnd();
  }

  /**
   * ส่งไปยัง server
   */
  private async sendToServer(entry: LogEntry) {
    try {
      // ใช้ navigator.sendBeacon() สำหรับความน่าเชื่อถือ
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(entry)], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/logs", blob);
      } else {
        // Fallback ใช้ fetch
        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
          keepalive: true,
        }).catch(() => {
          // Silent fail - เราไม่ต้องการให้ logging ทำให้แอพพัง
        });
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * เก็บใน localStorage
   */
  private saveToLocalStorage(entry: LogEntry) {
    try {
      if (typeof window === "undefined") return;

      const logs = this.getLogsFromStorage();
      logs.push(entry);

      // เก็บแค่ 100 รายการล่าสุด
      const recentLogs = logs.slice(-100);

      localStorage.setItem("app_logs", JSON.stringify(recentLogs));
    } catch (error) {
      // Storage เต็มหรือ error อื่นๆ - silent fail
    }
  }

  /**
   * ดึง logs จาก localStorage
   */
  getLogsFromStorage(): LogEntry[] {
    try {
      if (typeof window === "undefined") return [];
      const logs = localStorage.getItem("app_logs");
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * ล้าง logs ใน localStorage
   */
  clearLogs() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("app_logs");
    }
  }

  /**
   * Export logs สำหรับ debug
   */
  exportLogs(): string {
    const logs = this.getLogsFromStorage();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * สีสำหรับแต่ละระดับ log
   */
  private getLogColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "#6B7280";
      case LogLevel.INFO:
        return "#3B82F6";
      case LogLevel.WARN:
        return "#F59E0B";
      case LogLevel.ERROR:
        return "#EF4444";
      case LogLevel.AUDIT:
        return "#10B981";
      default:
        return "#6B7280";
    }
  }

  /**
   * สร้าง session ID
   */
  private generateSessionId(): string {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substring(2)
    );
  }
}

// Singleton instance
export const logger = new Logger();

// Helper functions สำหรับใช้งานง่าย
export const logUserAction = (action: string, details?: Record<string, any>) =>
  logger.logUserAction(action, details);

export const logApiCall = (action: string, details?: Record<string, any>) =>
  logger.logApiCall(action, details);

export const logFormInteraction = (
  action: string,
  details?: Record<string, any>,
) => logger.logFormInteraction(action, details);

export const logNavigation = (action: string, details?: Record<string, any>) =>
  logger.logNavigation(action, details);

export const logError = (
  action: string,
  error: Error | string,
  details?: Record<string, any>,
) => logger.logError(action, error, details);

export const logPerformance = (action: string, details?: Record<string, any>) =>
  logger.logPerformance(action, details);
