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
    // Bundle optimization
    webpack: (config, { isServer }) => {
        // Reduce bundle size by excluding unused modules
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }
        
        return config;
    },
    // Modular imports for better tree shaking
    modularizeImports: {
        '@mui/material': {
            transform: '@mui/material/{{member}}',
        },
        '@mui/icons-material': {
            transform: '@mui/icons-material/{{member}}',
        },
        '@mui/x-date-pickers': {
            transform: '@mui/x-date-pickers/{{member}}',
        },
        'react-icons': {
            transform: 'react-icons/{{member}}',
        },
    },
    // Image optimization
    images: {
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    },
};

export default nextConfig;