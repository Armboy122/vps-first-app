This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## การจัดการไทม์โซน (Timezone Management)

ระบบนี้ได้รับการออกแบบให้รองรับการทำงานกับไทม์โซน UTC+7 (ประเทศไทย) อย่างถูกต้อง โดยใช้ไลบรารี utility ที่สร้างขึ้นมาเฉพาะสำหรับการจัดการวันและเวลา:

- `lib/date-utils.ts` - ชุดฟังก์ชันสำหรับจัดการวันและเวลาในไทม์โซนประเทศไทย

ฟังก์ชันหลักที่ใช้ในการจัดการไทม์โซน:
- `getThailandDate()` - สร้างวันที่ปัจจุบันในไทม์โซน UTC+7
- `getThailandDateAtMidnight()` - สร้างวันที่ปัจจุบันเวลา 00:00:00 ในไทม์โซน UTC+7
- `createThailandDateTime()` - สร้างวันที่และเวลาตามที่กำหนดในไทม์โซน UTC+7
- `isDateInFuture()` - ตรวจสอบว่าวันที่อยู่ในอนาคตหรือไม่
- `getDaysDifference()` - คำนวณความแตกต่างของวันระหว่างสองวันที่

## การแคชข้อมูล (Data Caching)

ระบบมีการใช้การแคชข้อมูลเพื่อลดภาระของฐานข้อมูลและเพิ่มประสิทธิภาพ โดยใช้คุณสมบัติ `unstable_cache` ของ Next.js โดยมีไลบรารี utility สำหรับการจัดการแคช:

- `lib/cache-utils.ts` - ชุดฟังก์ชันสำหรับจัดการการแคชข้อมูล

ฟังก์ชันหลักสำหรับการแคชข้อมูล:
- `cacheData()` - ฟังก์ชันพื้นฐานสำหรับแคชข้อมูลทั่วไป
- `cacheOMSStatusByWorkCenter()` - แคชข้อมูลสถานะ OMS ตามศูนย์งาน
- `cacheOMSStatusDistribution()` - แคชข้อมูลการกระจายสถานะ OMS
- `clearCacheByPath()` - ล้างแคชตามพาธ
- `clearCacheByTag()` - ล้างแคชตามแท็ก
- `clearOMSCache()` - ล้างแคชข้อมูล OMS ทั้งหมด

การแคชข้อมูลจะถูกล้างโดยอัตโนมัติเมื่อมีการสร้าง แก้ไข หรือลบข้อมูลที่เกี่ยวข้อง เพื่อให้ข้อมูลที่แสดงเป็นข้อมูลล่าสุดเสมอ
