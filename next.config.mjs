// next.config.mjs
const nextConfig = {
    // กำหนดค่าอื่น ๆ ตามที่คุณต้องการ
    reactStrictMode: true, // เปิดใช้งานโหมดเข้มงวดของ React
    swcMinify: true, // เปิดใช้งานการบีบอัดโดยใช้ SWC
    experimental: {
        webpackBuildWorker: true,
        // เพิ่มการตั้งค่า Server Actions
        serverActions: {
            bodySizeLimit: '100mb', // เพิ่มขีดจำกัดเป็น 100MB สำหรับไฟล์ CSV ขนาดใหญ่
        },
    },
};

export default nextConfig;