// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import { LogViewer, LogViewerShortcut } from "@/components/dev/LogViewer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ระบบจัดการคำขอดับไฟ",
  description: "ระบบจัดการคำขอดับไฟสำหรับการไฟฟ้าส่วนภูมิภาค",
  icons: {
    icon: "/image.png",
    shortcut: "/image.png",
    apple: "/image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Providers>
          <Navbar />
          <main className="flex-grow pt-16">
            {" "}
            {/* เพิ่ม pt-16 เพื่อให้เนื้อหาไม่ถูกซ่อนใต้ Navbar */}
            {children}
          </main>
          <footer className="bg-gray-800 text-white text-center py-4">
            <p>&copy; 2024 ระบบจัดการคำขอดับไฟ. All rights reserved.</p>
          </footer>

          {/* Development Tools */}
          <LogViewer />
          <LogViewerShortcut />
        </Providers>
      </body>
    </html>
  );
}
