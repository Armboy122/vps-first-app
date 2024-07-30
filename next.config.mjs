// next.config.mjs
const nextConfig = {
    // กำหนดค่าอื่น ๆ ตามที่คุณต้องการ
    reactStrictMode: true, // เปิดใช้งานโหมดเข้มงวดของ React
    swcMinify: true, // เปิดใช้งานการบีบอัดโดยใช้ SWC
    experimental: {
        webpackBuildWorker: true,
    },
  };
  
  export default nextConfig;