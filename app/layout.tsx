// app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AppShell from "@/components/AppShell";

import { LogViewer, LogViewerShortcut } from "@/components/dev/LogViewer";

const bodyFont = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

const displayFont = Noto_Serif_Thai({
  subsets: ["latin", "thai"],
  weight: ["400", "700"],
  variable: "--font-display",
});

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
    <html lang="th" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="flex min-h-screen flex-col bg-transparent text-slate-900 antialiased">
        <Providers>
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-x-0 top-[-12rem] h-[26rem] bg-[radial-gradient(circle_at_top,_rgba(44,114,74,0.18),_transparent_52%)]" />
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(245,158,11,0.14),_transparent_70%)] blur-3xl" />
            <div className="absolute -right-20 top-44 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(15,23,42,0.08),_transparent_72%)] blur-3xl" />
          </div>

          <AppShell>{children}</AppShell>

          {/* ---- Dev tools (development only) ---- */}
          {process.env.NODE_ENV === "development" && <LogViewer />}
          {process.env.NODE_ENV === "development" && <LogViewerShortcut />}
        </Providers>
      </body>
    </html>
  );
}
